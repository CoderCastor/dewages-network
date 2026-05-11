import { Connection, PublicKey } from "@solana/web3.js";
import mongoose from "mongoose";
import { CompanyProfile } from "../model/companyModel.js";
import { WorkerProfile } from "../model/workerModel.js";
import { Job } from "../model/jobModel.js";
import { config } from "../config.js";

const PROGRAM_ID = new PublicKey(
  "4f9fP5Aoz7Tcu7Z5J7WWhTRUa757QnK91JvpM1Zyg7BM"
);

async function verifyJobAccounts() {
  console.log("\n📋 JOB ACCOUNT VERIFICATION DIAGNOSTIC\n");

  // await mongoose.connect("mongodb://localhost:27017/dewages-network-db");
  await mongoose.connect(config.databaseUrl);

  // Get the job
  const job = await Job.findOne({}).sort({ createdAt: -1 });

  if (!job) {
    console.log("❌ No jobs found in database");
    process.exit(1);
  }

  console.log("═══════════════════════════════════════════════════════");
  console.log("JOB DETAILS");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  ID:", job._id);
  console.log("  Title:", job.title);
  console.log("  Status:", job.status);
  console.log("  Company Wallet:", job.companyWallet);
  console.log("  Worker Wallet:", job.assignedWorker);
  console.log("  Job PDA:", job.jobPDA);
  console.log("  Escrow PDA:", job.escrowPDA);

  // Get the company profile
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("COMPANY PROFILE");
  console.log("═══════════════════════════════════════════════════════");

  const company = await CompanyProfile.findOne({
    walletAddress: job.companyWallet,
  });

  if (company) {
    console.log("✅ Company Profile Found:");
    console.log("   Name:", company.name || company.companyName);
    console.log("   Wallet:", company.walletAddress);
    console.log("   Is Verified:", company.isVerified);
    console.log("   PDA Address:", company.PDAAddress);
  } else {
    console.log("❌ Company Profile NOT Found in Database");
  }

  // Get the worker profile
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("WORKER PROFILE");
  console.log("═══════════════════════════════════════════════════════");

  const worker = await WorkerProfile.findOne({
    walletAddress: job.assignedWorker,
  });

  if (worker) {
    console.log("✅ Worker Profile Found:");
    console.log("   Name:", worker.name);
    console.log("   Wallet:", worker.walletAddress);
    console.log("   Is Verified:", worker.isVerified);
    console.log("   PDA Address:", worker.PDAAddress);
  } else {
    console.log("❌ Worker Profile NOT Found in Database");
  }

  // Check what's expected vs what exists
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("BLOCKCHAIN ACCOUNT READINESS");
  console.log("═══════════════════════════════════════════════════════");

  const employerWallet = new PublicKey(job.companyWallet);
  const [expectedEmployerPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), employerWallet.toBuffer()],
    PROGRAM_ID
  );

  console.log("\n✓ Employer Profile PDA:");
  console.log("  Expected:", expectedEmployerPDA.toString());
  console.log("  From DB:", company?.PDAAddress);
  console.log(
    "  Match:",
    expectedEmployerPDA.toString() === company?.PDAAddress ? "✅ YES" : "❌ NO"
  );

  if (company?.isVerified) {
    console.log("  Status: ✅ VERIFIED ON-CHAIN");
  } else {
    console.log("  Status: ❌ NOT VERIFIED");
  }

  const workerWallet = new PublicKey(job.assignedWorker);
  const [expectedWorkerPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), workerWallet.toBuffer()],
    PROGRAM_ID
  );

  console.log("\n✓ Worker Profile PDA:");
  console.log("  Expected:", expectedWorkerPDA.toString());
  console.log("  From DB:", worker?.PDAAddress);
  console.log(
    "  Match:",
    expectedWorkerPDA.toString() === worker?.PDAAddress ? "✅ YES" : "❌ NO"
  );

  if (worker?.isVerified) {
    console.log("  Status: ✅ VERIFIED ON-CHAIN");
  } else {
    console.log("  Status: ❌ NOT VERIFIED");
  }

  // Summary
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("READINESS CHECK FOR FUND DISBURSEMENT");
  console.log("═══════════════════════════════════════════════════════");

  const allReady =
    company?.isVerified && worker?.isVerified && job.jobPDA && job.escrowPDA;

  if (allReady) {
    console.log("✅ ALL REQUIREMENTS MET!");
    console.log("   - Employer verified on-chain ✓");
    console.log("   - Worker verified on-chain ✓");
    console.log("   - Job PDA exists ✓");
    console.log("   - Escrow PDA exists ✓");
    console.log("\n🚀 Ready for fund disbursement!");
  } else {
    console.log("❌ NOT READY YET. Missing:");
    if (!company?.isVerified) console.log("   - Employer verification");
    if (!worker?.isVerified) console.log("   - Worker verification");
    if (!job.jobPDA) console.log("   - Job PDA");
    if (!job.escrowPDA) console.log("   - Escrow PDA");
  }

  console.log("\n═══════════════════════════════════════════════════════\n");

  await mongoose.disconnect();
}

verifyJobAccounts().catch(console.error);
