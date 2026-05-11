import { Connection, PublicKey, Keypair, SystemProgram, TransactionInstruction, Transaction } from "@solana/web3.js";
import { sha256 } from "js-sha256";
import fs from "fs";
import { Job } from "../model/jobModel.js";
import { WorkerProfile } from "../model/workerModel.js";
import { config } from "../config.js";

const PROGRAM_ID = new PublicKey(config.programId);
const RPC_URL = config.rpcUrl;

// Load relayer keypair — tries env var first, then file
function loadRelayerKeypair() {
  // Option 1: From env var (Render-friendly — store as JSON array string)
  if (process.env.RELAYER_PRIVATE_KEY) {
    const secretKey = Uint8Array.from(JSON.parse(process.env.RELAYER_PRIVATE_KEY));
    return Keypair.fromSecretKey(secretKey);
  }

  // Option 2: From file (local dev)
  const keypairPath = process.env.HOME + "/.config/solana/id.json";
  if (fs.existsSync(keypairPath)) {
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8")))
    );
  }

  return null;
}

function deriveUserProfilePDA(walletAddress) {
  const walletStr = typeof walletAddress === "string" ? walletAddress : walletAddress.toString();
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), new PublicKey(walletStr).toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

function getInstructionDiscriminator(instructionName) {
  const preimage = `global:${instructionName}`;
  const hash = sha256(Buffer.from(preimage));
  return Buffer.from(hash, "hex").slice(0, 8);
}

function createReleasePaymentInstruction(accounts) {
  const discriminator = getInstructionDiscriminator("release_payment");
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: accounts.job, isSigner: false, isWritable: true },
      { pubkey: accounts.escrow, isSigner: false, isWritable: true },
      { pubkey: accounts.worker, isSigner: false, isWritable: true },
      { pubkey: accounts.employerProfile, isSigner: false, isWritable: true },
      { pubkey: accounts.workerProfile, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: discriminator,
  });
}

async function disburseSingleJob(job, connection, relayerKeypair) {
  const jobPDA = job.jobPDA ? String(job.jobPDA).trim() : null;
  const escrowPDA = job.escrowPDA ? String(job.escrowPDA).trim() : null;
  const assignedWorker = job.assignedWorker ? String(job.assignedWorker).trim() : null;
  const companyWallet = job.companyWallet ? String(job.companyWallet).trim() : null;

  if (!jobPDA || !escrowPDA || !assignedWorker || !companyWallet) {
    return { success: false, jobId: job._id, reason: "missing_blockchain_data" };
  }

  const workerProfilePDA = deriveUserProfilePDA(assignedWorker);
  const employerProfilePDA = deriveUserProfilePDA(companyWallet);

  const accounts = {
    job: new PublicKey(jobPDA),
    escrow: new PublicKey(escrowPDA),
    worker: new PublicKey(assignedWorker),
    employerProfile: employerProfilePDA,
    workerProfile: workerProfilePDA,
  };

  const { blockhash } = await connection.getLatestBlockhash();
  const instruction = createReleasePaymentInstruction(accounts);
  const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: relayerKeypair.publicKey });
  transaction.add(instruction);
  transaction.sign(relayerKeypair);

  const txSignature = await connection.sendRawTransaction(transaction.serialize());
  await connection.confirmTransaction(txSignature, "confirmed");

  // Update job in DB
  job.status = "completed";
  job.fundTransfer = {
    isTransferred: true,
    transferredAt: new Date(),
    transactionSignature: txSignature,
    amount: job.paymentAmount,
  };
  job.disputePeriod.isActive = false;
  job.disputePeriod.isExpired = true;
  await job.save();

  // Update worker profile
  const workerProfile = await WorkerProfile.findOne({ walletAddress: assignedWorker });
  if (workerProfile) {
    workerProfile.totalJobs = (workerProfile.totalJobs || 0) + 1;
    workerProfile.completedJobs = (workerProfile.completedJobs || 0) + 1;
    workerProfile.totalEarnings = (workerProfile.totalEarnings || 0) + job.paymentAmount;
    await workerProfile.save();
  }

  return { success: true, jobId: job._id, txSignature };
}

/**
 * Express handler — called by cron route
 * MongoDB is already connected via app.js
 */
export async function runDisbursement(req, res) {
  const startTime = Date.now();

  try {
    const relayerKeypair = loadRelayerKeypair();
    if (!relayerKeypair) {
      return res.status(500).json({
        success: false,
        error: "Relayer keypair not found. Set RELAYER_PRIVATE_KEY env var or provide ~/.config/solana/id.json",
      });
    }

    const connection = new Connection(RPC_URL, "confirmed");

    // Find eligible jobs: have blockchain data, dispute period expired, funds not yet transferred
    const jobs = await Job.find({
      assignedWorker: { $ne: null },
      jobPDA: { $ne: null },
      escrowPDA: { $ne: null },
      companyWallet: { $ne: null },
      "fundTransfer.isTransferred": { $ne: true },
      $or: [
        { "disputePeriod.isExpired": true },
        {
          "disputePeriod.endTime": { $lt: new Date() },
          "disputePeriod.isActive": true,
        },
      ],
    });

    if (jobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No jobs ready for disbursement",
        processed: 0,
        elapsed: Date.now() - startTime + "ms",
      });
    }

    const results = { processed: jobs.length, success: 0, failed: 0, details: [] };

    for (const job of jobs) {
      try {
        const result = await disburseSingleJob(job, connection, relayerKeypair);
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
        }
        results.details.push(result);

        // Small delay between transactions
        if (jobs.indexOf(job) < jobs.length - 1) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (err) {
        results.failed++;
        results.details.push({ success: false, jobId: job._id, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      ...results,
      elapsed: Date.now() - startTime + "ms",
    });
  } catch (error) {
    console.error("[Cron Disburse Error]:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      elapsed: Date.now() - startTime + "ms",
    });
  }
}
