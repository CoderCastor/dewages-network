/**
 * ============================================================================
 * UNIT TESTS: Mongoose Models
 * ============================================================================
 * Tests the Mongoose model schemas for WorkerProfile, CompanyProfile, Job,
 * and JobApplication to ensure data integrity, validation rules, default
 * values, pre-save hooks, virtual fields, and instance/static methods.
 *
 * Testing Strategy: Unit Testing
 * Validation Techniques: Schema validation, constraint checking, default values
 * ============================================================================
 */

import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { WorkerProfile, WorkerSkill, WorkerAvailability } from "../../model/workerModel.js";
import { CompanyProfile } from "../../model/companyModel.js";
import { Job, JobApplication } from "../../model/jobModel.js";
import {
  validWorkerData,
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
// 1. WorkerProfile Model Tests
// ============================================================================

describe("WorkerProfile Model", () => {
  // ---- Creation & Required Fields ----

  test("TC-M01: should create a worker profile with valid data", async () => {
    const worker = await WorkerProfile.create(validWorkerData);

    expect(worker._id).toBeDefined();
    expect(worker.walletAddress).toBe(validWorkerData.walletAddress);
    expect(worker.name).toBe(validWorkerData.name);
    expect(worker.phone).toBe(validWorkerData.phone);
    expect(worker.email).toBe(validWorkerData.email.toLowerCase());
    expect(worker.rating).toBe(4.5);
    expect(worker.totalJobs).toBe(25);
  });

  test("TC-M02: should fail when walletAddress is missing (required field)", async () => {
    const invalidData = { ...validWorkerData };
    delete invalidData.walletAddress;

    await expect(WorkerProfile.create(invalidData)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  // ---- Default Values ----

  test("TC-M03: should set default values correctly", async () => {
    const worker = await WorkerProfile.create({
      walletAddress: "TestWallet123456789012345678901234567890",
    });

    expect(worker.experienceLevel).toBe("beginner");
    expect(worker.isActive).toBe(false);
    expect(worker.isVerified).toBe(false);
    expect(worker.rating).toBe(0);
    expect(worker.totalJobs).toBe(0);
    expect(worker.completedJobs).toBe(0);
    expect(worker.totalEarnings).toBe(0);
    expect(worker.PDAAddress).toBeNull();
  });

  // ---- Enum Validation ----

  test("TC-M04: should reject invalid experienceLevel enum value", async () => {
    const invalidData = {
      ...validWorkerData,
      walletAddress: "UniqueWallet1_" + Date.now(),
      experienceLevel: "super_expert",
    };

    await expect(WorkerProfile.create(invalidData)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  test("TC-M05: should reject invalid jobCategories enum value", async () => {
    const invalidData = {
      ...validWorkerData,
      walletAddress: "UniqueWallet2_" + Date.now(),
      jobCategories: ["invalid_category"],
    };

    await expect(WorkerProfile.create(invalidData)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  // ---- Array Limit Validation ----

  test("TC-M06: should reject more than 20 skills", async () => {
    const tooManySkills = Array.from({ length: 21 }, (_, i) => `skill_${i}`);
    const invalidData = {
      ...validWorkerData,
      walletAddress: "UniqueWallet3_" + Date.now(),
      skills: tooManySkills,
    };

    await expect(WorkerProfile.create(invalidData)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  test("TC-M07: should accept exactly 20 skills (boundary test)", async () => {
    const maxSkills = Array.from({ length: 20 }, (_, i) => `skill_${i}`);
    const worker = await WorkerProfile.create({
      ...validWorkerData,
      walletAddress: "UniqueWallet4_" + Date.now(),
      skills: maxSkills,
    });

    expect(worker.skills).toHaveLength(20);
  });

  // ---- Pre-save Hook ----

  test("TC-M08: should update 'updatedAt' on save via pre-save hook", async () => {
    const worker = await WorkerProfile.create({
      ...validWorkerData,
      walletAddress: "UniqueWallet5_" + Date.now(),
    });

    const originalUpdatedAt = worker.updatedAt;

    // Wait a bit and save again
    await new Promise((resolve) => setTimeout(resolve, 50));
    worker.name = "Updated Name";
    await worker.save();

    expect(worker.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  // ---- Virtual Field ----

  test("TC-M09: should return isFullyVerified=true when all verifications pass", async () => {
    const worker = await WorkerProfile.create({
      ...validWorkerData,
      walletAddress: "UniqueWallet6_" + Date.now(),
      verificationStatus: { phone: true, email: true, identity: true },
    });

    expect(worker.isFullyVerified).toBe(true);
  });

  test("TC-M10: should return isFullyVerified=false when any verification fails", async () => {
    const worker = await WorkerProfile.create({
      ...validWorkerData,
      walletAddress: "UniqueWallet7_" + Date.now(),
      verificationStatus: { phone: true, email: true, identity: false },
    });

    expect(worker.isFullyVerified).toBe(false);
  });

  // ---- Bio Max Length ----

  test("TC-M11: should reject bio exceeding 500 characters", async () => {
    const longBio = "A".repeat(501);
    const invalidData = {
      ...validWorkerData,
      walletAddress: "UniqueWallet8_" + Date.now(),
      bio: longBio,
    };

    await expect(WorkerProfile.create(invalidData)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });
});

// ============================================================================
// 2. WorkerSkill Model Tests
// ============================================================================

describe("WorkerSkill Model", () => {
  test("TC-M12: should create a worker skill with valid data", async () => {
    const skill = await WorkerSkill.create({
      workerWallet: validWorkerData.walletAddress,
      skillName: "Brick Masonry",
      category: "construction",
      experienceYears: 5,
      proficiencyLevel: "advanced",
    });

    expect(skill._id).toBeDefined();
    expect(skill.skillName).toBe("Brick Masonry");
    expect(skill.proficiencyLevel).toBe("advanced");
    expect(skill.isVerified).toBe(false);
  });

  test("TC-M13: should set default proficiencyLevel to 'basic'", async () => {
    const skill = await WorkerSkill.create({
      workerWallet: validWorkerData.walletAddress,
      skillName: "Painting",
      category: "construction",
    });

    expect(skill.proficiencyLevel).toBe("basic");
  });

  test("TC-M14: should reject experienceYears greater than 50", async () => {
    await expect(
      WorkerSkill.create({
        workerWallet: validWorkerData.walletAddress,
        skillName: "Masonry",
        category: "construction",
        experienceYears: 51,
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });
});

// ============================================================================
// 3. CompanyProfile Model Tests
// ============================================================================

describe("CompanyProfile Model", () => {
  test("TC-M15: should create a company profile with valid data", async () => {
    const company = await CompanyProfile.create(validCompanyData);

    expect(company._id).toBeDefined();
    expect(company.walletAddress).toBe(validCompanyData.walletAddress);
    expect(company.companyName).toBe(validCompanyData.companyName);
    expect(company.companyType).toBe("medium_business");
    expect(company.totalJobsPosted).toBe(0);
    expect(company.rating).toBe(0);
  });

  test("TC-M16: should fail when walletAddress is missing (required field)", async () => {
    const invalidData = { ...validCompanyData };
    delete invalidData.walletAddress;

    await expect(CompanyProfile.create(invalidData)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  test("TC-M17: should set default company type to 'individual'", async () => {
    const company = await CompanyProfile.create({
      walletAddress: "CompanyWallet1_" + Date.now(),
    });

    expect(company.companyType).toBe("individual");
  });

  test("TC-M18: should reject invalid companyType enum value", async () => {
    const invalidData = {
      ...validCompanyData,
      walletAddress: "CompanyWallet2_" + Date.now(),
      companyType: "mega_corporation",
    };

    await expect(CompanyProfile.create(invalidData)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  test("TC-M19: should compute isFullyVerified virtual correctly", async () => {
    const company = await CompanyProfile.create({
      ...validCompanyData,
      walletAddress: "CompanyWallet3_" + Date.now(),
      verificationStatus: { phone: true, email: true, documents: true },
      isVerified: true,
    });

    expect(company.isFullyVerified).toBe(true);
  });

  test("TC-M20: should update 'updatedAt' on save", async () => {
    const company = await CompanyProfile.create({
      ...validCompanyData,
      walletAddress: "CompanyWallet4_" + Date.now(),
    });

    const original = company.updatedAt;
    await new Promise((resolve) => setTimeout(resolve, 50));
    company.companyName = "New Name";
    await company.save();

    expect(company.updatedAt.getTime()).toBeGreaterThan(original.getTime());
  });

  test("TC-M21: should set default statistics to zero", async () => {
    const company = await CompanyProfile.create({
      walletAddress: "CompanyWallet5_" + Date.now(),
    });

    expect(company.totalJobsPosted).toBe(0);
    expect(company.activeJobs).toBe(0);
    expect(company.completedJobs).toBe(0);
    expect(company.totalSpent).toBe(0);
    expect(company.rating).toBe(0);
  });
});

// ============================================================================
// 4. Job Model Tests
// ============================================================================

describe("Job Model", () => {
  test("TC-M22: should create a job with valid data", async () => {
    const job = await Job.create(validJobData);

    expect(job._id).toBeDefined();
    expect(job.jobPDA).toBe(validJobData.jobPDA);
    expect(job.title).toBe(validJobData.title);
    expect(job.category).toBe("construction");
    expect(job.status).toBe("open");
    expect(job.paymentAmount).toBe(500000000);
    expect(job.applications).toHaveLength(0);
  });

  test("TC-M23: should fail when required fields are missing", async () => {
    await expect(Job.create({ title: "Incomplete Job" })).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  test("TC-M24: should reject invalid job status enum", async () => {
    const invalidJob = {
      ...validJobData,
      jobPDA: "UniqueJobPDA_1_" + Date.now(),
      status: "unknown_status",
    };

    await expect(Job.create(invalidJob)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  test("TC-M25: should reject invalid category enum", async () => {
    const invalidJob = {
      ...validJobData,
      jobPDA: "UniqueJobPDA_2_" + Date.now(),
      category: "rocket_science",
    };

    await expect(Job.create(invalidJob)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  test("TC-M26: should enforce title maxlength of 100 characters", async () => {
    const invalidJob = {
      ...validJobData,
      jobPDA: "UniqueJobPDA_3_" + Date.now(),
      title: "A".repeat(101),
    };

    await expect(Job.create(invalidJob)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  test("TC-M27: should enforce description maxlength of 500 characters", async () => {
    const invalidJob = {
      ...validJobData,
      jobPDA: "UniqueJobPDA_4_" + Date.now(),
      description: "B".repeat(501),
    };

    await expect(Job.create(invalidJob)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  test("TC-M28: should reject negative paymentAmount", async () => {
    const invalidJob = {
      ...validJobData,
      jobPDA: "UniqueJobPDA_5_" + Date.now(),
      paymentAmount: -100,
    };

    await expect(Job.create(invalidJob)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  test("TC-M29: should reject durationHours less than 1", async () => {
    const invalidJob = {
      ...validJobData,
      jobPDA: "UniqueJobPDA_6_" + Date.now(),
      durationHours: 0,
    };

    await expect(Job.create(invalidJob)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  // ---- Pre-save Hook: Auto-calculate INR ----

  test("TC-M30: should auto-calculate paymentAmountINR if not provided", async () => {
    const jobData = {
      ...validJobData,
      jobPDA: "UniqueJobPDA_7_" + Date.now(),
    };
    delete jobData.paymentAmountINR;

    const job = await Job.create(jobData);

    // paymentAmount = 500000000 lamports = 0.5 SOL
    // 0.5 SOL * 8000 INR/SOL = 4000 INR
    expect(job.paymentAmountINR).toBe(4000);
  });

  // ---- Virtual Fields ----

  test("TC-M31: should compute totalApplications virtual field", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_8_" + Date.now(),
      applications: [
        { workerWallet: "wallet1", workerName: "W1", status: "pending" },
        { workerWallet: "wallet2", workerName: "W2", status: "approved" },
        { workerWallet: "wallet3", workerName: "W3", status: "rejected" },
      ],
    });

    const jobObj = job.toJSON();
    expect(jobObj.totalApplications).toBe(3);
    expect(jobObj.pendingApplications).toBe(1);
    expect(jobObj.approvedApplications).toBe(1);
    expect(jobObj.rejectedApplications).toBe(1);
  });

  // ---- Instance Methods ----

  test("TC-M32: hasWorkerApplied should return true for existing applicant", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_9_" + Date.now(),
      applications: [
        { workerWallet: "workerA", workerName: "Worker A", status: "pending" },
      ],
    });

    expect(job.hasWorkerApplied("workerA")).toBe(true);
    expect(job.hasWorkerApplied("workerB")).toBe(false);
  });

  test("TC-M33: getApplicationByWorker should return correct application", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_10_" + Date.now(),
      applications: [
        { workerWallet: "workerX", workerName: "Worker X", status: "pending" },
      ],
    });

    const app = job.getApplicationByWorker("workerX");
    expect(app).toBeDefined();
    expect(app.workerWallet).toBe("workerX");

    const noApp = job.getApplicationByWorker("nonexistent");
    expect(noApp).toBeUndefined();
  });

  test("TC-M34: addApplication should throw if worker already applied", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_11_" + Date.now(),
      applications: [
        { workerWallet: "workerY", workerName: "Worker Y", status: "pending" },
      ],
    });

    expect(() => {
      job.addApplication({ workerWallet: "workerY", workerName: "Worker Y" });
    }).toThrow("Worker has already applied to this job");
  });

  // ---- Static Methods ----

  test("TC-M35: getAvailableForWorker should exclude already-applied jobs", async () => {
    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_12_" + Date.now(),
      status: "open",
      applications: [{ workerWallet: "worker1", workerName: "W1" }],
    });

    await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_13_" + Date.now(),
      status: "open",
      applications: [],
    });

    const available = await Job.getAvailableForWorker("worker1");
    expect(available).toHaveLength(1);
  });

  // ---- Unique Constraint ----

  test("TC-M36: should enforce unique jobPDA constraint", async () => {
    await Job.create(validJobData);

    await expect(
      Job.create({
        ...validJobData,
        // Same jobPDA - should fail
      })
    ).rejects.toThrow();
  });
});

// ============================================================================
// 5. JobApplication Model Tests
// ============================================================================

describe("JobApplication Model", () => {
  test("TC-M37: should create a job application with valid data", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_JA_" + Date.now(),
    });

    const application = await JobApplication.create({
      jobId: job._id,
      jobPDA: job.jobPDA,
      workerWallet: validWorkerData.walletAddress,
      workerName: validWorkerData.name,
      coverLetter: "I am interested in this job.",
      status: "pending",
    });

    expect(application._id).toBeDefined();
    expect(application.status).toBe("pending");
    expect(application.workerName).toBe(validWorkerData.name);
  });

  test("TC-M38: should default status to 'pending'", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_JA2_" + Date.now(),
    });

    const application = await JobApplication.create({
      jobId: job._id,
      jobPDA: job.jobPDA,
      workerWallet: "testworker123",
      workerName: "Test Worker",
    });

    expect(application.status).toBe("pending");
  });

  test("TC-M39: should reject invalid application status", async () => {
    const job = await Job.create({
      ...validJobData,
      jobPDA: "UniqueJobPDA_JA3_" + Date.now(),
    });

    await expect(
      JobApplication.create({
        jobId: job._id,
        jobPDA: job.jobPDA,
        workerWallet: "testworker456",
        workerName: "Test Worker 2",
        status: "unknown",
      })
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });
});
