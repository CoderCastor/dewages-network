import mongoose from "mongoose";
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  TransactionInstruction
} from "@solana/web3.js";
import { sha256 } from "js-sha256";
import fs from "fs";
import { Job } from "../model/jobModel.js";
import { config } from "../config.js";

const PROGRAM_ID = new PublicKey(
  "3detc4UfYvz14NqdUdM6698ziVNMEEaSHHVhZiGKM4NJ"
);

function getInstructionDiscriminator(instructionName) {
  const preimage = `global:${instructionName}`;
  const hash = sha256(Buffer.from(preimage));
  return Buffer.from(hash, "hex").slice(0, 8);
}

function createSkipDisputeInstruction(jobPDA, adminPublicKey) {
  const discriminator = getInstructionDiscriminator(
    "skip_dispute_period_for_testing"
  );

  console.log("[Discriminator] Pre-image: global:skip_dispute_period_for_testing");
  console.log("[Discriminator] SHA256:", sha256(Buffer.from("global:skip_dispute_period_for_testing")));
  console.log("[Discriminator] First 8 bytes:", discriminator.toString("hex"));

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: jobPDA, isSigner: false, isWritable: true },
      { pubkey: adminPublicKey, isSigner: true, isWritable: true },
    ],
    data: discriminator,
  });
}

async function skipDisputePeriodOnChain() {
  console.log("\n════════════════════════════════════════════════════");
  console.log("     🧪 SKIPPING DISPUTE PERIOD ON-CHAIN");
  console.log("════════════════════════════════════════════════════\n");

  // Load admin keypair
  const keypairPath = process.env.HOME + "/.config/solana/id.json";

  if (!fs.existsSync(keypairPath)) {
    console.error(`❌ Error: Keypair file not found at ${keypairPath}`);
    process.exit(1);
  }

  const ADMIN_KEYPAIR = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8")))
  );

  console.log("[Init] Admin public key:", ADMIN_KEYPAIR.publicKey.toString());

  // Connect to MongoDB
  console.log("\n[Database] Connecting to MongoDB...");
  // await mongoose.connect("mongodb://localhost:27017/dewages-network-db");
  await mongoose.connect(config.databaseUrl);
  console.log("✅ [Database] Connected to MongoDB");

  try {
    // Get the job from database
    console.log("\n[Database] Finding job with pending_verification status...");
    const job = await Job.findOne({ status: "pending_verification" });

    if (!job) {
      console.log("❌ No job with pending_verification status found");
      console.log("\nPlease complete these steps first:");
      console.log("  1. Verify Worker on-chain");
      console.log("  2. Verify Company on-chain");
      console.log("  3. Create a Job");
      console.log("  4. Assign Worker to Job");
      console.log("  5. Submit Proof of Work");
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log("✅ Job found!\n");
    console.log("Job Details:");
    console.log("  Title:", job.title);
    console.log("  Status:", job.status);
    console.log("  Job PDA:", job.jobPDA);
    console.log("  Employer:", job.companyWallet);
    console.log("  Worker:", job.assignedWorker);

    // Validate required fields
    if (!job.jobPDA) {
      console.error("\n❌ Error: Job PDA not found in database");
      await mongoose.disconnect();
      process.exit(1);
    }

    // Connect to Solana
    console.log("\n[Blockchain] Connecting to Solana RPC...");
    const connection = new Connection("http://127.0.0.1:8899", "confirmed");
    console.log("✅ [Blockchain] Connected");

    // Create the instruction
    console.log("\n[Blockchain] Creating skip_dispute_period_for_testing instruction...");
    const jobPDA = new PublicKey(job.jobPDA);
    const instruction = createSkipDisputeInstruction(
      jobPDA,
      ADMIN_KEYPAIR.publicKey
    );

    // Create transaction
    console.log("\n[Blockchain] Fetching recent blockhash...");
    const { blockhash } = await connection.getLatestBlockhash();

    console.log("[Blockchain] Building transaction...");
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: ADMIN_KEYPAIR.publicKey,
    });
    transaction.add(instruction);

    console.log("[Blockchain] Signing transaction...");
    transaction.sign(ADMIN_KEYPAIR);

    console.log("[Blockchain] Sending transaction to Solana...");
    const txSignature = await connection.sendRawTransaction(
      transaction.serialize()
    );

    console.log("[Blockchain] Confirming transaction...");
    await connection.confirmTransaction(txSignature, "confirmed");

    console.log("\n════════════════════════════════════════════════════");
    console.log("     ✅ SUCCESS - DISPUTE PERIOD SKIPPED ON-CHAIN");
    console.log("════════════════════════════════════════════════════\n");
    console.log("Transaction Signature:");
    console.log("  TX:", txSignature);
    console.log("\nExplorer Link:");
    console.log(
      `  https://explorer.solana.com/tx/${txSignature}?cluster=custom&customUrl=http://127.0.0.1:8899\n`
    );

    console.log("🚀 Next Step:");
    console.log("   Run: node backend/scripts/fundDisbursement.js\n");

    await mongoose.disconnect();
    console.log("✅ [Database] Disconnected from MongoDB\n");
  } catch (error) {
    console.error("\n════════════════════════════════════════════════════");
    console.error("     ❌ ERROR");
    console.error("════════════════════════════════════════════════════\n");
    console.error("[Error Type]:", error.name);
    console.error("[Error Message]:", error.message);

    if (error.logs) {
      console.error("\n[Program Logs]:");
      error.logs.forEach((log) => console.error(`  ${log}`));
    }

    if (error.stack) {
      console.error("\n[Stack Trace]:");
      console.error(error.stack);
    }

    try {
      await mongoose.disconnect();
    } catch (e) {}

    process.exit(1);
  }
}

// Run the function
skipDisputePeriodOnChain();
