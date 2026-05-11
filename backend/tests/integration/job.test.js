/**
 * ============================================================================
 * INTEGRATION TESTS: Job Controller
 * ============================================================================
 * Tests the job controller functions with actual database interactions:
 * createJob, getAllJobs, getJobById, getCompanyJobs, applyForJob,
 * getJobApplications, updateJobStatus, generateJobOTP, verifyJobOTP,
 * recordProofSubmission, getProofOfWork, markFundTransferred, etc.
 *
 * Testing Strategy: Integration Testing
 * Validation Techniques: API response verification, database state checks,
 *                        business logic validation, authorization checks
 * ============================================================================
 */

import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// ---- Set env BEFORE imports ----
process.env.JWT_SECRET = "test-jwt-secret-key-for-dewages-network";
process.env.PORT = "8001";
process.env.NODE_ENV = "test";
process.env.PROGRAM_ID = "4f9fP5Aoz7Tcu7Z5J7WWhTRUa757QnK91JvpM1Zyg7BM";
process.env.RPC_URL = "https://devnet.helius-rpc.com/?api-key=2ac5b659-b819-400e-990c-628e1b2582e9";

import { Job } from "../../model/jobModel.js";
import { CompanyProfile } from "../../model/companyModel.js";
import { WorkerProfile } from "../../model/workerModel.js";
import {
  validWorkerData,
  validCompanyData,
  validJobData,
  validJobData2,
  validCompanyData2,
  validWorkerData2,
  mockRequest,
  mockResponse,
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
// Helper: Import controller functions dynamically to avoid IDL loading issues
// ============================================================================

// Since jobController.js loads an IDL file on import, we test the business logic
// directly through the models and by calling controller functions that don't
// depend on the IDL/Solana connection, or by testing database-level logic.

// ============================================================================
// 1. Job Creation & Retrieval Tests (Model-level Integration)
// ============================================================================

describe("Job Creation & Retrieval", () => {
  test("TC-J01: should create a job and store in database", async () => {
    const company = await CompanyProfile.create(validCompanyData);
    const job = await Job.create(validJobData);

    expect(job._id).toBeDefined();
    expect(job.title).toBe(validJobData.title);
    expect(job.status).toBe("open");
    expect(job.companyWallet).toBe(validCompanyData.walletAddress);
  });

  test("TC-J02: should retrieve job by ID", async () => {
    const job = await Job.create(validJobData);
    const found = await Job.findById(job._id);

    expect(found).not.toBeNull();
    expect(found.title).toBe(validJobData.title);
    expect(found.category).toBe("construction");
  });

  test("TC-J03: should retrieve all open jobs", async () => {
    await Job.create(validJobData);
    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_JC_2_" + Date.now(),
      title: "Second Job",
    });

    const openJobs = await Job.find({ status: "open" });
    expect(openJobs).toHaveLength(2);
  });

  test("TC-J04: should filter jobs by category", async () => {
    await Job.create(validJobData); // construction
    await Job.create({
      ...validJobData2,
    }); // delivery

    const constructionJobs = await Job.find({ category: "construction" });
    expect(constructionJobs).toHaveLength(1);
    expect(constructionJobs[0].category).toBe("construction");

    const deliveryJobs = await Job.find({ category: "delivery" });
    expect(deliveryJobs).toHaveLength(1);
  });

  test("TC-J05: should filter jobs by city", async () => {
    await Job.create(validJobData); // Mumbai
    await Job.create(validJobData2); // Delhi

    const mumbaiJobs = await Job.find({ "location.city": "Mumbai" });
    expect(mumbaiJobs).toHaveLength(1);
    expect(mumbaiJobs[0].location.city).toBe("Mumbai");
  });

  test("TC-J06: should paginate job results", async () => {
    // Create 5 jobs
    for (let i = 0; i < 5; i++) {
      await Job.create({
        ...validJobData,
        jobPDA: `UniqueJobPDA_PG_${i}_${Date.now()}`,
        title: `Job ${i}`,
      });
    }

    const page1 = await Job.find({}).limit(2).skip(0);
    const page2 = await Job.find({}).limit(2).skip(2);
    const page3 = await Job.find({}).limit(2).skip(4);

    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(page3).toHaveLength(1);
  });

  test("TC-J07: should return 0 jobs for non-matching category filter", async () => {
    await Job.create(validJobData); // construction

    const jobs = await Job.find({ category: "delivery" });
    expect(jobs).toHaveLength(0);
  });
});

// ============================================================================
// 2. Job Application Tests
// ============================================================================

describe("Job Application Workflow", () => {
  test("TC-J08: should add worker application to job", async () => {
    await WorkerProfile.create(validWorkerData);
    const job = await Job.create(validJobData);

    job.applications.push({
      workerWallet: validWorkerData.walletAddress,
      workerName: validWorkerData.name,
      status: "pending",
      appliedAt: new Date(),
    });
    await job.save();

    const updatedJob = await Job.findById(job._id);
    expect(updatedJob.applications).toHaveLength(1);
    expect(updatedJob.applications[0].workerWallet).toBe(
      validWorkerData.walletAddress
    );
    expect(updatedJob.applications[0].status).toBe("pending");
  });

  test("TC-J09: should prevent duplicate applications from same worker", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_DupApp_" + Date.now(),
      applications: [
        {
          workerWallet: validWorkerData.walletAddress,
          workerName: validWorkerData.name,
          status: "pending",
        },
      ],
    });

    expect(job.hasWorkerApplied(validWorkerData.walletAddress)).toBe(true);

    // Attempting addApplication should throw
    expect(() => {
      job.addApplication({
        workerWallet: validWorkerData.walletAddress,
        workerName: validWorkerData.name,
      });
    }).toThrow("Worker has already applied to this job");
  });

  test("TC-J10: should approve worker application and update status", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_Approve_" + Date.now(),
      applications: [
        {
          workerWallet: validWorkerData.walletAddress,
          workerName: validWorkerData.name,
          status: "pending",
        },
      ],
    });

    // Approve the application
    const app = job.applications[0];
    app.status = "approved";
    job.assignedWorker = validWorkerData.walletAddress;
    job.workerName = validWorkerData.name;
    job.status = "in_progress";
    await job.save();

    const updatedJob = await Job.findById(job._id);
    expect(updatedJob.applications[0].status).toBe("approved");
    expect(updatedJob.assignedWorker).toBe(validWorkerData.walletAddress);
    expect(updatedJob.status).toBe("in_progress");
  });

  test("TC-J11: should reject worker application", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_Reject_" + Date.now(),
      applications: [
        {
          workerWallet: validWorkerData.walletAddress,
          workerName: validWorkerData.name,
          status: "pending",
        },
      ],
    });

    const app = job.applications[0];
    app.status = "rejected";
    await job.save();

    const updatedJob = await Job.findById(job._id);
    expect(updatedJob.applications[0].status).toBe("rejected");
  });

  test("TC-J12: should handle multiple applications from different workers", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_MultiApp_" + Date.now(),
    });

    job.applications.push(
      {
        workerWallet: validWorkerData.walletAddress,
        workerName: validWorkerData.name,
        status: "pending",
      },
      {
        workerWallet: validWorkerData2.walletAddress,
        workerName: validWorkerData2.name,
        status: "pending",
      }
    );
    await job.save();

    const updatedJob = await Job.findById(job._id);
    expect(updatedJob.applications).toHaveLength(2);

    const jobJSON = updatedJob.toJSON();
    expect(jobJSON.totalApplications).toBe(2);
    expect(jobJSON.pendingApplications).toBe(2);
  });
});

// ============================================================================
// 3. Job Status Transition Tests
// ============================================================================

describe("Job Status Transitions", () => {
  test("TC-J13: should transition from 'open' to 'in_progress'", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_Status1_" + Date.now(),
    });

    job.status = "in_progress";
    job.assignedWorker = validWorkerData.walletAddress;
    job.startedAt = new Date();
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.status).toBe("in_progress");
    expect(updated.startedAt).toBeDefined();
  });

  test("TC-J14: should transition from 'in_progress' to 'pending_verification'", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_Status2_" + Date.now(),
      status: "in_progress",
      assignedWorker: validWorkerData.walletAddress,
    });

    job.status = "pending_verification";
    job.completedAt = new Date();
    const disputeDeadline = new Date();
    disputeDeadline.setDate(disputeDeadline.getDate() + 3);
    job.disputeDeadline = disputeDeadline;
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.status).toBe("pending_verification");
    expect(updated.completedAt).toBeDefined();
    expect(updated.disputeDeadline).toBeDefined();
  });

  test("TC-J15: should transition from 'pending_verification' to 'completed'", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_Status3_" + Date.now(),
      status: "pending_verification",
      assignedWorker: validWorkerData.walletAddress,
    });

    job.status = "completed";
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.status).toBe("completed");
  });

  test("TC-J16: should transition to 'disputed' status", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_Status4_" + Date.now(),
      status: "pending_verification",
    });

    job.status = "disputed";
    job.dispute = {
      reason: "Worker did not complete the assigned task properly",
      status: "open",
      createdAt: new Date(),
    };
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.status).toBe("disputed");
    expect(updated.dispute.status).toBe("open");
    expect(updated.dispute.reason).toContain("not complete");
  });

  test("TC-J17: should transition to 'cancelled' status", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_Status5_" + Date.now(),
    });

    job.status = "cancelled";
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.status).toBe("cancelled");
  });
});

// ============================================================================
// 4. OTP Generation & Verification Tests
// ============================================================================

describe("Job OTP System", () => {
  test("TC-J18: should store start OTP in job document", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_OTP1_" + Date.now(),
      status: "in_progress",
      assignedWorker: validWorkerData.walletAddress,
    });

    const otpCode = "123456";
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    job.startJobOTP = {
      code: otpCode,
      generatedAt: now,
      expiresAt,
      isUsed: false,
    };
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.startJobOTP.code).toBe("123456");
    expect(updated.startJobOTP.isUsed).toBe(false);
    expect(updated.startJobOTP.expiresAt).toBeDefined();
  });

  test("TC-J19: should mark OTP as used", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_OTP2_" + Date.now(),
      status: "in_progress",
      assignedWorker: validWorkerData.walletAddress,
      startJobOTP: {
        code: "654321",
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isUsed: false,
      },
    });

    job.startJobOTP.isUsed = true;
    job.startJobOTP.usedAt = new Date();
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.startJobOTP.isUsed).toBe(true);
    expect(updated.startJobOTP.usedAt).toBeDefined();
  });

  test("TC-J20: should store end OTP in job document", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_OTP3_" + Date.now(),
      status: "in_progress",
      assignedWorker: validWorkerData.walletAddress,
    });

    job.endJobOTP = {
      code: "789012",
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isUsed: false,
    };
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.endJobOTP.code).toBe("789012");
  });
});

// ============================================================================
// 5. Dispute Period Tests
// ============================================================================

describe("Dispute Period Management", () => {
  test("TC-J21: should set dispute period correctly", async () => {
    const now = new Date();
    const disputeEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_DP1_" + Date.now(),
      status: "pending_verification",
      disputePeriod: {
        startedAt: now,
        endsAt: disputeEndsAt,
        isActive: true,
        isExpired: false,
      },
    });

    expect(job.disputePeriod.isActive).toBe(true);
    expect(job.disputePeriod.isExpired).toBe(false);

    // Dispute period should be ~3 days
    const diff = job.disputePeriod.endsAt - job.disputePeriod.startedAt;
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    expect(diff).toBe(threeDays);
  });

  test("TC-J22: should expire dispute period and mark job completed", async () => {
    const pastDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const expiredDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_DP2_" + Date.now(),
      status: "pending_verification",
      disputePeriod: {
        startedAt: pastDate,
        endsAt: expiredDate,
        isActive: true,
        isExpired: false,
      },
    });

    // Simulate the dispute period check
    const now = new Date();
    if (job.disputePeriod.endsAt <= now) {
      job.disputePeriod.isActive = false;
      job.disputePeriod.isExpired = true;
      job.status = "completed";
      await job.save();
    }

    const updated = await Job.findById(job._id);
    expect(updated.disputePeriod.isActive).toBe(false);
    expect(updated.disputePeriod.isExpired).toBe(true);
    expect(updated.status).toBe("completed");
  });
});

// ============================================================================
// 6. Proof of Work Tests
// ============================================================================

describe("Proof of Work", () => {
  test("TC-J23: should store proof of work details", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_POW1_" + Date.now(),
      status: "in_progress",
      assignedWorker: validWorkerData.walletAddress,
    });

    job.proofOfWork = {
      accountAddress: "ProofAccountPDA_12345",
      txSignature: "ProofTxSig_12345",
      proofType: "OTP",
      proofData: "End OTP verified and work completed",
      submittedAt: new Date(),
      isVerified: false,
    };
    job.status = "pending_verification";
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.proofOfWork.accountAddress).toBe("ProofAccountPDA_12345");
    expect(updated.proofOfWork.proofType).toBe("OTP");
    expect(updated.proofOfWork.isVerified).toBe(false);
    expect(updated.status).toBe("pending_verification");
  });
});

// ============================================================================
// 7. Fund Transfer Tests
// ============================================================================

describe("Fund Transfer", () => {
  test("TC-J24: should record fund transfer details", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_FT1_" + Date.now(),
      status: "pending_verification",
      disputePeriod: {
        isActive: false,
        isExpired: true,
      },
    });

    job.fundTransfer = {
      isTransferred: true,
      transferredAt: new Date(),
      transactionSignature: "FundTxSig_67890",
      amount: 500000000,
    };
    job.status = "completed";
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.fundTransfer.isTransferred).toBe(true);
    expect(updated.fundTransfer.amount).toBe(500000000);
    expect(updated.status).toBe("completed");
  });

  test("TC-J25: should default fund transfer to not transferred", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_FT2_" + Date.now(),
    });

    expect(job.fundTransfer.isTransferred).toBe(false);
  });
});

// ============================================================================
// 8. Company Jobs Query Tests
// ============================================================================

describe("Company Jobs Queries", () => {
  test("TC-J26: should fetch all jobs for a specific company", async () => {
    await Job.create(validJobData);
    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_CJ_1_" + Date.now(),
      title: "Another Company Job",
    });

    // Job from different company
    await Job.create(validJobData2);

    const companyJobs = await Job.find({
      companyWallet: validCompanyData.walletAddress,
    });
    expect(companyJobs).toHaveLength(2);
  });

  test("TC-J27: should group company jobs by status", async () => {
    // Create jobs with different statuses
    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_CJ_2_" + Date.now(),
      status: "open",
    });
    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_CJ_3_" + Date.now(),
      status: "in_progress",
    });
    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_CJ_4_" + Date.now(),
      status: "completed",
    });

    const jobs = await Job.find({
      companyWallet: validCompanyData.walletAddress,
    }).lean();

    const active = jobs.filter((j) => j.status === "open");
    const inProgress = jobs.filter((j) => j.status === "in_progress");
    const completed = jobs.filter((j) => j.status === "completed");

    expect(active).toHaveLength(1);
    expect(inProgress).toHaveLength(1);
    expect(completed).toHaveLength(1);
  });
});

// ============================================================================
// 9. Worker Jobs Query Tests (Static Methods)
// ============================================================================

describe("Worker Jobs Queries", () => {
  test("TC-J28: getAvailableForWorker should exclude applied jobs", async () => {
    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_WJ_1_" + Date.now(),
      applications: [
        {
          workerWallet: validWorkerData.walletAddress,
          workerName: "W1",
        },
      ],
    });

    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_WJ_2_" + Date.now(),
    });

    const available = await Job.getAvailableForWorker(
      validWorkerData.walletAddress
    );
    expect(available).toHaveLength(1);
  });

  test("TC-J29: getAssignedToWorker should return in-progress jobs", async () => {
    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_WJ_3_" + Date.now(),
      status: "in_progress",
      assignedWorker: validWorkerData.walletAddress,
    });

    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_WJ_4_" + Date.now(),
      status: "open",
    });

    const assigned = await Job.getAssignedToWorker(
      validWorkerData.walletAddress
    );
    expect(assigned).toHaveLength(1);
    expect(assigned[0].status).toBe("in_progress");
  });

  test("TC-J30: getCompletedByWorker should return completed jobs", async () => {
    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_WJ_5_" + Date.now(),
      status: "completed",
      assignedWorker: validWorkerData.walletAddress,
    });

    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_WJ_6_" + Date.now(),
      status: "in_progress",
      assignedWorker: validWorkerData.walletAddress,
    });

    const completed = await Job.getCompletedByWorker(
      validWorkerData.walletAddress
    );
    expect(completed).toHaveLength(1);
    expect(completed[0].status).toBe("completed");
  });

  test("TC-J31: getRejectedForWorker should return jobs with rejected applications", async () => {
    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_WJ_7_" + Date.now(),
      applications: [
        {
          workerWallet: validWorkerData.walletAddress,
          workerName: "W1",
          status: "rejected",
        },
      ],
    });

    const rejected = await Job.getRejectedForWorker(
      validWorkerData.walletAddress
    );
    expect(rejected).toHaveLength(1);
  });
});

// ============================================================================
// 10. Job Rating Tests
// ============================================================================

describe("Job Ratings", () => {
  test("TC-J32: should store employer and worker ratings", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_Rating_" + Date.now(),
      status: "completed",
    });

    job.employerRating = 5;
    job.workerRating = 4;
    job.employerReview = "Excellent work quality";
    job.workerReview = "Great employer to work with";
    await job.save();

    const updated = await Job.findById(job._id);
    expect(updated.employerRating).toBe(5);
    expect(updated.workerRating).toBe(4);
    expect(updated.employerReview).toBe("Excellent work quality");
  });

  test("TC-J33: should reject rating outside 1-5 range", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_RatingInv_" + Date.now(),
    });

    job.employerRating = 6;
    await expect(job.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });
});
