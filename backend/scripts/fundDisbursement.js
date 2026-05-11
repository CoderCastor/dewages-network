import { Connection, PublicKey, Keypair, SystemProgram, TransactionInstruction, Transaction } from "@solana/web3.js";
import { sha256 } from "js-sha256";
import mongoose from "mongoose";
import fs from "fs";
import { Job } from "../model/jobModel.js";
import { WorkerProfile } from "../model/workerModel.js"; // ✅ ADD THIS IMPORT
import { config } from "../config.js";

// const config = {
//   programId: "4f9fP5Aoz7Tcu7Z5J7WWhTRUa757QnK91JvpM1Zyg7BM",
//   rpcUrl: "https://devnet.helius-rpc.com/?api-key=2ac5b659-b819-400e-990c-628e1b2582e9",
//   // mongoUri: "mongodb://localhost:27017/dewages-network-db",
//   mongoUri: config.databaseUrl ,
// };

const PROGRAM_ID = new PublicKey(config.programId);
const RPC_URL = config.rpcUrl;
const MONGODB_URI = config.databaseUrl;

console.log("[Init] Loading relayer keypair");
const keypairPath = process.env.HOME + "/.config/solana/id.json";

if (!fs.existsSync(keypairPath)) {
  console.error(`❌ Error: Keypair file not found at ${keypairPath}`);
  process.exit(1);
}

const RELAYER_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8")))
);
console.log("[Init] Relayer public key:", RELAYER_KEYPAIR.publicKey.toString());

function deriveUserProfilePDA(walletAddress) {
  const walletStr = typeof walletAddress === 'string' ? walletAddress : walletAddress.toString();
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), new PublicKey(walletStr).toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// ✅ Calculate correct Anchor instruction discriminator
function getInstructionDiscriminator(instructionName) {
  const preimage = `global:${instructionName}`;
  console.log(`[Discriminator] Pre-image: ${preimage}`);

  const hash = sha256(Buffer.from(preimage));
  const discriminator = Buffer.from(hash, 'hex').slice(0, 8);

  console.log(`[Discriminator] SHA256: ${hash}`);
  console.log(`[Discriminator] First 8 bytes: ${discriminator.toString('hex')}`);

  return discriminator;
}

// ✅ Create raw instruction for release_payment
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

async function disburseFundsForJob(job, connection) {
  console.log("\n════════════════════════════════════════════════════");
  console.log(`🔄 Processing Job: ${job.title}`);
  console.log(`📋 Job ID: ${job._id}`);
  console.log(`📊 Status: ${job.status}`);
  console.log("════════════════════════════════════════════════════");

  try {
    const jobPDA = job.jobPDA ? String(job.jobPDA).trim() : null;
    const escrowPDA = job.escrowPDA ? String(job.escrowPDA).trim() : null;
    const assignedWorker = job.assignedWorker ? String(job.assignedWorker).trim() : null;
    const companyWallet = job.companyWallet ? String(job.companyWallet).trim() : null;

    if (!jobPDA || !escrowPDA || !assignedWorker || !companyWallet) {
      console.log("⚠️  [Skip] Missing required blockchain data");
      return { success: false, reason: "missing_data" };
    }

    console.log("[Prepare] Deriving account PDAs");
    const workerProfilePDA = deriveUserProfilePDA(assignedWorker);
    const employerProfilePDA = deriveUserProfilePDA(companyWallet);

    console.log("   ✓ Job PDA:", jobPDA);
    console.log("   ✓ Escrow PDA:", escrowPDA);
    console.log("   ✓ Worker Pubkey:", assignedWorker);
    console.log("   ✓ Employer Profile PDA:", employerProfilePDA.toString());
    console.log("   ✓ Worker Profile PDA:", workerProfilePDA.toString());

    const accounts = {
      job: new PublicKey(jobPDA),
      escrow: new PublicKey(escrowPDA),
      worker: new PublicKey(assignedWorker),
      employerProfile: employerProfilePDA,
      workerProfile: workerProfilePDA,
    };

    console.log("[Prepare] ✅ All accounts prepared");

    console.log("\n[Blockchain] Creating raw transaction");

    console.log("[Blockchain] Fetching recent blockhash...");
    const { blockhash } = await connection.getLatestBlockhash();

    console.log("[Blockchain] Creating release_payment instruction...");
    const instruction = createReleasePaymentInstruction(accounts);

    console.log("[Blockchain] Building transaction...");
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: RELAYER_KEYPAIR.publicKey,
    });
    transaction.add(instruction);

    console.log("[Blockchain] Signing transaction...");
    transaction.sign(RELAYER_KEYPAIR);

    console.log("[Blockchain] Sending transaction to Solana...");
    const txSignature = await connection.sendRawTransaction(transaction.serialize());

    console.log("[Blockchain] Confirming transaction...");
    await connection.confirmTransaction(txSignature, "confirmed");

    console.log("\n✅ [Success] Funds disbursed on blockchain!");
    console.log(`📝 Transaction Signature: ${txSignature}`);
    console.log(`🔗 Explorer: https://explorer.solana.com/tx/${txSignature}?cluster=devnet`);

    // ✅ UPDATE JOB IN MONGODB
    console.log("\n[Database] Updating job in MongoDB...");
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
    console.log("✅ [Database] Job updated successfully");
    console.log(`💰 Amount Transferred: ${job.paymentAmount / 1_000_000_000} SOL`);

    // ✅ UPDATE WORKER PROFILE IN MONGODB
    console.log("\n[Database] Updating worker profile in MongoDB...");

    const workerProfile = await WorkerProfile.findOne({
      walletAddress: assignedWorker
    });

    if (workerProfile) {
      // Increment job counters and earnings
      workerProfile.totalJobs = (workerProfile.totalJobs || 0) + 1;
      workerProfile.completedJobs = (workerProfile.completedJobs || 0) + 1;
      workerProfile.totalEarnings = (workerProfile.totalEarnings || 0) + job.paymentAmount;

      await workerProfile.save();

      console.log("✅ [Database] Worker profile updated successfully");
      console.log(`   📊 Total Jobs: ${workerProfile.totalJobs}`);
      console.log(`   ✅ Completed Jobs: ${workerProfile.completedJobs}`);
      console.log(`   💰 Total Earnings: ${workerProfile.totalEarnings / 1_000_000_000} SOL`);
    } else {
      console.log("⚠️  [Warning] Worker profile not found in MongoDB");
      console.log(`   Worker wallet: ${assignedWorker}`);
    }

    return { success: true, txSignature };
  } catch (error) {
    console.error("\n❌ [Error] Failed to disburse funds for this job");
    console.error("[Error Message]:", error.message);

    if (error.logs) {
      console.error("\n[Program Logs]:");
      error.logs.forEach((log) => console.error(`  - ${log}`));
    }

    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("\n");
  console.log("════════════════════════════════════════════════════");
  console.log("     🧪 FUND DISBURSEMENT TEST MODE");
  console.log("     (Raw instruction - all jobs)");
  console.log("════════════════════════════════════════════════════\n");

  console.log(`[Time] Script started at: ${new Date().toLocaleString()}`);
  console.log(`[Config] Program ID: ${PROGRAM_ID.toString()}`);
  console.log(`[Config] RPC URL: ${RPC_URL}`);
  console.log(`[Config] MongoDB URI: ${MONGODB_URI.substring(0, 20)}...`);

  try {
    console.log("\n[Database] Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ [Database] Connected to MongoDB");

    console.log("\n[Blockchain] Connecting to Solana RPC:", RPC_URL);
    const connection = new Connection(RPC_URL, "confirmed");

    console.log("✅ [Blockchain] RPC connected");

    console.log("\n[Database] Querying ALL jobs in database...");
    const allJobs = await Job.find({});
    console.log(`[Query] Found ${allJobs.length} total job(s) in database`);

    if (allJobs.length === 0) {
      console.log("ℹ️  No jobs in database");
      await mongoose.disconnect();
      return;
    }

    console.log("\n[Filter] Filtering jobs for disbursement...");
    const jobsToDisburse = allJobs.filter(job => {
      return job.assignedWorker && job.jobPDA && job.escrowPDA && job.companyWallet && (!job.fundTransfer?.isTransferred);
    });

    console.log(`[Filter] Found ${jobsToDisburse.length} job(s) ready for disbursement\n`);

    if (jobsToDisburse.length === 0) {
      console.log("ℹ️  No jobs available for disbursement");
      await mongoose.disconnect();
      return;
    }

    const results = {
      total: jobsToDisburse.length,
      success: 0,
      failed: 0,
    };

    for (let i = 0; i < jobsToDisburse.length; i++) {
      const job = jobsToDisburse[i];
      console.log(`\n[Progress] Processing job ${i + 1}/${jobsToDisburse.length}`);

      const result = await disburseFundsForJob(job, connection);

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
      }

      if (i < jobsToDisburse.length - 1) {
        console.log("\n⏳ Waiting 3 seconds before next transaction...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    console.log("\n\n════════════════════════════════════════════════════");
    console.log("             📊 DISBURSEMENT TEST SUMMARY");
    console.log("════════════════════════════════════════════════════");
    console.log(`Total Jobs in Database: ${allJobs.length}`);
    console.log(`Jobs Processed: ${results.total}`);
    console.log(`✅ Successfully Disbursed: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log("════════════════════════════════════════════════════\n");

    await mongoose.disconnect();
    console.log("✅ [Database] Disconnected from MongoDB");
    console.log(`\n[Time] Script completed at: ${new Date().toLocaleString()}\n`);

    process.exit(0);
  } catch (error) {
    console.error("\n════════════════════════════════════════════════════");
    console.error("❌ CRITICAL ERROR IN TEST SCRIPT");
    console.error("════════════════════════════════════════════════════\n");
    console.error("[Error Type]:", error.name);
    console.error("[Error Message]:", error.message);

    if (error.stack) {
      console.error("\n[Stack Trace]:");
      console.error(error.stack);
    }

    try {
      await mongoose.disconnect();
    } catch (e) { }

    process.exit(1);
  }
}

main();