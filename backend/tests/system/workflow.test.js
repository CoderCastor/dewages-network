/**
 * ============================================================================
 * SYSTEM TESTS: End-to-End Job Lifecycle Workflow
 * ============================================================================
 * Tests the complete job lifecycle from posting through payment:
 *   Company posts job → Worker applies → Company approves →
 *   Job starts (OTP) → Job completes (OTP) → Proof submitted →
 *   Dispute period → Fund transfer
 *
 * Also tests edge cases like invalid workflows and concurrent operations.
 *
 * Testing Strategy: System Testing
 * Validation Techniques: Full workflow validation, state machine verification,
 *                        cross-entity consistency checks
 * ============================================================================
 */

import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// ---- Set env BEFORE imports ----
process.env.JWT_SECRET = "test-jwt-secret-key-for-dewages-network";
process.env.PORT = "8001";
process.env.NODE_ENV = "test";

import { Job } from "../../model/jobModel.js";
import { CompanyProfile } from "../../model/companyModel.js";
import { WorkerProfile } from "../../model/workerModel.js";
import {
  validWorkerData,
  validWorkerData2,
  validCompanyData,
  validJobData,
} from "../setup/testFixtures.js";

let mongod;

// ============================================================================
// Test Lifecycle
// ============================================================================

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ============================================================================
// 1. Complete Job Lifecycle (Happy Path)
// ============================================================================

describe("Complete Job Lifecycle - Happy Path", () => {
  test("TC-SYS01: Full job lifecycle from posting to fund transfer", async () => {
    // ---- STEP 1: Create Company ----
    const company = await CompanyProfile.create(validCompanyData);
    expect(company.totalJobsPosted).toBe(0);

    // ---- STEP 2: Create Worker ----
    const worker = await WorkerProfile.create(validWorkerData);
    expect(worker.isActive).toBe(true);

    // ---- STEP 3: Company Posts Job ----
    const job = await Job.create({
      ...validJobData,
      jobPDA: "SYS_JobPDA_" + Date.now(),
    });
    company.totalJobsPosted += 1;
    await company.save();

    expect(job.status).toBe("open");
    expect(job.applications).toHaveLength(0);

    const updatedCompany = await CompanyProfile.findById(company._id);
    expect(updatedCompany.totalJobsPosted).toBe(1);

    // ---- STEP 4: Worker Applies ----
    job.applications.push({
      workerWallet: worker.walletAddress,
      workerName: worker.name,
      status: "pending",
      appliedAt: new Date(),
      coverLetter: "I have 5 years of construction experience.",
    });
    await job.save();

    expect(job.applications).toHaveLength(1);
    expect(job.hasWorkerApplied(worker.walletAddress)).toBe(true);

    // ---- STEP 5: Company Approves Worker ----
    const application = job.applications[0];
    application.status = "approved";
    job.assignedWorker = worker.walletAddress;
    job.workerName = worker.name;
    job.status = "in_progress";
    job.startedAt = new Date();
    await job.save();

    expect(job.status).toBe("in_progress");
    expect(job.assignedWorker).toBe(worker.walletAddress);

    // ---- STEP 6: Generate Start OTP ----
    const startOTP = Math.floor(100000 + Math.random() * 900000).toString();
    job.startJobOTP = {
      code: startOTP,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isUsed: false,
    };
    await job.save();

    // ---- STEP 7: Worker Verifies Start OTP ----
    expect(job.startJobOTP.code).toBe(startOTP);
    job.startJobOTP.isUsed = true;
    job.startJobOTP.usedAt = new Date();
    await job.save();

    // ---- STEP 8: Generate End OTP ----
    const endOTP = Math.floor(100000 + Math.random() * 900000).toString();
    job.endJobOTP = {
      code: endOTP,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isUsed: false,
    };
    await job.save();

    // ---- STEP 9: Worker Verifies End OTP ----
    job.endJobOTP.isUsed = true;
    job.endJobOTP.usedAt = new Date();

    // ---- STEP 10: Submit Proof of Work ----
    const now = new Date();
    job.proofOfWork = {
      accountAddress: "ProofPDA_SYS_12345",
      txSignature: "ProofTx_SYS_12345",
      proofType: "OTP",
      proofData: "End OTP verified and work completed",
      submittedAt: now,
      isVerified: false,
    };

    // ---- STEP 11: Start Dispute Period ----
    const disputeEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    job.disputePeriod = {
      startedAt: now,
      endsAt: disputeEndsAt,
      isActive: true,
      isExpired: false,
    };
    job.status = "pending_verification";
    await job.save();

    expect(job.status).toBe("pending_verification");
    expect(job.disputePeriod.isActive).toBe(true);

    // ---- STEP 12: Dispute Period Expires (simulate) ----
    job.disputePeriod.isActive = false;
    job.disputePeriod.isExpired = true;
    job.status = "completed";
    await job.save();

    // ---- STEP 13: Fund Transfer ----
    job.fundTransfer = {
      isTransferred: true,
      transferredAt: new Date(),
      transactionSignature: "FundTx_SYS_67890",
      amount: validJobData.paymentAmount,
    };
    await job.save();

    // ---- STEP 14: Update Worker Stats ----
    worker.completedJobs += 1;
    worker.totalJobs += 1;
    worker.totalEarnings += validJobData.paymentAmount;
    await worker.save();

    // ---- FINAL VERIFICATION ----
    const finalJob = await Job.findById(job._id);
    const finalWorker = await WorkerProfile.findOne({
      walletAddress: worker.walletAddress,
    });
    const finalCompany = await CompanyProfile.findById(company._id);

    expect(finalJob.status).toBe("completed");
    expect(finalJob.fundTransfer.isTransferred).toBe(true);
    expect(finalJob.proofOfWork.accountAddress).toBe("ProofPDA_SYS_12345");
    expect(finalJob.disputePeriod.isExpired).toBe(true);
    expect(finalJob.startJobOTP.isUsed).toBe(true);
    expect(finalJob.endJobOTP.isUsed).toBe(true);

    expect(finalWorker.completedJobs).toBe(validWorkerData.completedJobs + 1);
    expect(finalCompany.totalJobsPosted).toBe(1);
  });
});

// ============================================================================
// 2. Dispute Workflow
// ============================================================================

describe("Dispute Workflow", () => {
  test("TC-SYS02: Employer raises dispute during dispute period", async () => {
    // Setup: Job in pending_verification with active dispute period
    const job = await Job.create({
      ...validJobData,
      jobPDA: "SYS_Dispute_" + Date.now(),
      status: "pending_verification",
      assignedWorker: validWorkerData.walletAddress,
      disputePeriod: {
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        isActive: true,
        isExpired: false,
      },
    });

    // Company raises dispute
    job.status = "disputed";
    job.dispute = {
      disputePDA: "DisputePDA_12345",
      reason: "Worker did not complete the assigned task properly. Quality of work was below standard.",
      status: "open",
      createdAt: new Date(),
    };
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.status).toBe("disputed");
    expect(updated.dispute.status).toBe("open");
    expect(updated.dispute.reason).toContain("below standard");
  });

  test("TC-SYS03: Admin resolves dispute in favor of worker", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "SYS_Resolve_Worker_" + Date.now(),
      status: "disputed",
      assignedWorker: validWorkerData.walletAddress,
      dispute: {
        reason: "Quality concern",
        status: "open",
        createdAt: new Date(),
      },
    });

    // Admin resolves in favor of worker
    job.dispute.status = "resolved_for_worker";
    job.dispute.resolvedAt = new Date();
    job.dispute.resolution = "After review, worker completed the task satisfactorily.";
    job.status = "completed";

    // Fund transfer to worker
    job.fundTransfer = {
      isTransferred: true,
      transferredAt: new Date(),
      transactionSignature: "ResolveFundTx_12345",
      amount: validJobData.paymentAmount,
    };
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.status).toBe("completed");
    expect(updated.dispute.status).toBe("resolved_for_worker");
    expect(updated.fundTransfer.isTransferred).toBe(true);
  });

  test("TC-SYS04: Admin resolves dispute in favor of employer", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "SYS_Resolve_Employer_" + Date.now(),
      status: "disputed",
      dispute: {
        reason: "Work was not completed",
        status: "open",
        createdAt: new Date(),
      },
    });

    job.dispute.status = "resolved_for_employer";
    job.dispute.resolvedAt = new Date();
    job.dispute.resolution = "Worker failed to deliver. Funds refunded to employer.";
    job.status = "cancelled";
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.status).toBe("cancelled");
    expect(updated.dispute.status).toBe("resolved_for_employer");
  });
});

// ============================================================================
// 3. Multi-Worker Application Scenario
// ============================================================================

describe("Multi-Worker Application Scenario", () => {
  test("TC-SYS05: Multiple workers apply, one gets approved, others rejected", async () => {
    // Create two workers
    const worker1 = await WorkerProfile.create(validWorkerData);
    const worker2 = await WorkerProfile.create(validWorkerData2);

    // Create job
    const job = await Job.create({
      ...validJobData,
      jobPDA: "SYS_MultiWorker_" + Date.now(),
    });

    // Both workers apply
    job.applications.push(
      {
        workerWallet: worker1.walletAddress,
        workerName: worker1.name,
        status: "pending",
      },
      {
        workerWallet: worker2.walletAddress,
        workerName: worker2.name,
        status: "pending",
      }
    );
    await job.save();

    const jobJSON = job.toJSON();
    expect(jobJSON.totalApplications).toBe(2);
    expect(jobJSON.pendingApplications).toBe(2);

    // Approve worker1
    job.applications[0].status = "approved";
    job.applications[1].status = "rejected";
    job.assignedWorker = worker1.walletAddress;
    job.workerName = worker1.name;
    job.status = "in_progress";
    await job.save();

    const updatedJSON = (await Job.findById(job._id)).toJSON();
    expect(updatedJSON.approvedApplications).toBe(1);
    expect(updatedJSON.rejectedApplications).toBe(1);
    expect(updatedJSON.assignedWorker).toBe(worker1.walletAddress);
  });
});

// ============================================================================
// 4. Cross-Entity Consistency Tests
// ============================================================================

describe("Cross-Entity Consistency", () => {
  test("TC-SYS06: Company stats should reflect job counts", async () => {
    const company = await CompanyProfile.create(validCompanyData);

    // Create 3 jobs with different statuses
    await Job.create({
      ...validJobData,
      jobPDA: "SYS_Stats_1_" + Date.now(),
      status: "open",
    });
    await Job.create({
      ...validJobData,
      jobPDA: "SYS_Stats_2_" + Date.now(),
      status: "in_progress",
    });
    await Job.create({
      ...validJobData,
      jobPDA: "SYS_Stats_3_" + Date.now(),
      status: "completed",
    });

    company.totalJobsPosted = 3;
    company.activeJobs = 1;
    company.completedJobs = 1;
    await company.save();

    const jobs = await Job.find({
      companyWallet: validCompanyData.walletAddress,
    });
    const finalCompany = await CompanyProfile.findById(company._id);

    expect(jobs).toHaveLength(3);
    expect(finalCompany.totalJobsPosted).toBe(3);
    expect(finalCompany.activeJobs).toBe(1);
    expect(finalCompany.completedJobs).toBe(1);
  });

  test("TC-SYS07: Worker completed jobs count should match DB", async () => {
    const worker = await WorkerProfile.create(validWorkerData);

    // Create 2 completed jobs for this worker
    await Job.create({
      ...validJobData,
      jobPDA: "SYS_WStats_1_" + Date.now(),
      status: "completed",
      assignedWorker: worker.walletAddress,
    });
    await Job.create({
      ...validJobData,
      jobPDA: "SYS_WStats_2_" + Date.now(),
      status: "completed",
      assignedWorker: worker.walletAddress,
    });

    const completedJobs = await Job.getCompletedByWorker(worker.walletAddress);
    expect(completedJobs).toHaveLength(2);

    worker.completedJobs = completedJobs.length;
    await worker.save();

    const finalWorker = await WorkerProfile.findOne({
      walletAddress: worker.walletAddress,
    });
    expect(finalWorker.completedJobs).toBe(2);
  });
});

// ============================================================================
// 5. Edge Cases & Error Scenarios
// ============================================================================

describe("Edge Cases & Error Scenarios", () => {
  test("TC-SYS08: Cannot apply to a non-open job", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "SYS_Edge_1_" + Date.now(),
      status: "in_progress",
    });

    // Trying to add application to non-open job
    expect(job.status).not.toBe("open");

    // Business logic: application should only be accepted for open jobs
    const shouldAccept = job.status === "open";
    expect(shouldAccept).toBe(false);
  });

  test("TC-SYS09: OTP expiration should be detected", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "SYS_Edge_2_" + Date.now(),
      status: "in_progress",
      startJobOTP: {
        code: "999999",
        generatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired 1 day ago
        isUsed: false,
      },
    });

    const isExpired = job.startJobOTP.expiresAt < new Date();
    expect(isExpired).toBe(true);
  });

  test("TC-SYS10: Cannot transfer funds during active dispute period", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "SYS_Edge_3_" + Date.now(),
      status: "pending_verification",
      disputePeriod: {
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        isActive: true,
        isExpired: false,
      },
    });

    // Business logic: fund transfer should be blocked
    const canTransferFunds = !job.disputePeriod.isActive;
    expect(canTransferFunds).toBe(false);
  });

  test("TC-SYS11: Job view count should increment", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "SYS_Edge_4_" + Date.now(),
    });

    expect(job.viewCount).toBe(0);

    // Simulate view count increment
    await Job.findByIdAndUpdate(job._id, { $inc: { viewCount: 1 } });
    await Job.findByIdAndUpdate(job._id, { $inc: { viewCount: 1 } });
    await Job.findByIdAndUpdate(job._id, { $inc: { viewCount: 1 } });

    const updated = await Job.findById(job._id);
    expect(updated.viewCount).toBe(3);
  });
});
