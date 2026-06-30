// ============================================================================
// controllers/jobController.js - Job Management (CLEANED UP)
// ============================================================================

import { Job, JobApplication } from "../model/jobModel.js";
import { CompanyProfile } from "../model/companyModel.js";
import { WorkerProfile } from "../model/workerModel.js";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { config } from "../config.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load IDL
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const idlPath = join(__dirname, "../idl/employment_platform.json");
const idl = JSON.parse(readFileSync(idlPath, "utf-8"));

const { programId, rpcUrl } = config;
const PROGRAM_ID = programId;
const RPC_URL = rpcUrl;

// ============================================================================
// Utility: Wait for Solana transaction confirmation
// Polls every 2s up to maxRetries times before giving up
// ============================================================================

const waitForConfirmation = async (
  signature,
  maxRetries = 10,
  intervalMs = 2000
) => {
  const connection = new Connection(RPC_URL, "confirmed");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(
      `⏳ Checking tx confirmation attempt ${attempt}/${maxRetries}: ${signature}`
    );

    try {
      const { value } = await connection.getSignatureStatus(signature);

      if (value?.err) {
        // Tx landed on-chain but execution failed — no point retrying
        throw new Error(
          `Transaction failed on-chain: ${JSON.stringify(value.err)}`
        );
      }

      if (
        value?.confirmationStatus === "confirmed" ||
        value?.confirmationStatus === "finalized"
      ) {
        console.log(`✅ Tx confirmed after ${attempt} attempt(s)`);
        return true;
      }
    } catch (err) {
      // Re-throw hard failures (on-chain errors), swallow transient RPC errors
      if (err.message?.startsWith("Transaction failed on-chain")) {
        throw err;
      }
      console.warn(`⚠️ RPC error on attempt ${attempt}:`, err.message);
    }

    // Wait before next poll
    await new Promise((res) => setTimeout(res, intervalMs));
  }

  // Exhausted all retries
  console.warn(`⚠️ Tx not confirmed after ${maxRetries} attempts: ${signature}`);
  return false;
};

// ============================================================================
// Create Job (After blockchain transaction)
// ============================================================================

const createJob = async (req, res) => {
  try {
    const {
      jobPDA,
      escrowPDA,
      transactionSignature,
      companyWallet,
      title,
      description,
      category,
      location,
      paymentAmount,
      paymentAmountINR,
      durationHours,
      requirements,
    } = req.body;

    // Verify authenticated user is the company posting the job
    if (req.user.walletAddress !== companyWallet) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to create job for this wallet",
      });
    }

    // Reject non-positive or non-numeric payment amounts
    const parsedPayment = Number(paymentAmount);
    if (!Number.isFinite(parsedPayment) || parsedPayment <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount — must be a positive number",
      });
    }

    const parsedDuration = Number(durationHours);
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid duration — must be a positive number",
      });
    }

    // Get company details
    const company = await CompanyProfile.findOne({
      walletAddress: companyWallet,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company profile not found",
      });
    }

    // Create job in MongoDB
    const job = await Job.create({
      jobPDA,
      escrowPDA,
      transactionSignature,
      companyWallet,
      companyName: company.companyName,
      title,
      description,
      category,
      location,
      paymentAmount,
      paymentAmountINR,
      durationHours,
      requirements,
      status: "open",
    });

    // Update company's total jobs posted
    company.totalJobsPosted += 1;
    await company.save();

    console.log(`✓ Job created: ${job._id} | PDA: ${jobPDA}`);

    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      job: {
        id: job._id,
        jobPDA: job.jobPDA,
        escrowPDA: job.escrowPDA,
        title: job.title,
        category: job.category,
        paymentAmount: job.paymentAmount,
        status: job.status,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating job:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create job",
      error: error.message,
    });
  }
};

// ============================================================================
// Get All Jobs (with filters)
// ============================================================================

const getAllJobs = async (req, res) => {
  try {
    const {
      status,
      category,
      city,
      minPayment,
      maxPayment,
      page = 1,
      limit = 10,
    } = req.query;

    // Build query
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (city) query["location.city"] = new RegExp(city, "i");
    if (minPayment || maxPayment) {
      query.paymentAmount = {};
      if (minPayment) query.paymentAmount.$gte = parseFloat(minPayment);
      if (maxPayment) query.paymentAmount.$lte = parseFloat(maxPayment);
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Job.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: error.message,
    });
  }
};

// ============================================================================
// Get Company Jobs (for company dashboard)
// ============================================================================

const getCompanyJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const companyWallet = req.user.walletAddress;

    const query = { companyWallet };
    if (status) query.status = status;

    const jobs = await Job.find(query).sort({ createdAt: -1 }).lean();

    // Group jobs by status for dashboard tabs
    const jobsByStatus = {
      active: jobs.filter((j) => j.status === "open"),
      inProgress: jobs.filter((j) => j.status === "in_progress" || j.status === "pending_verification"),
      completed: jobs.filter((j) => j.status === "completed"),
      disputed: jobs.filter((j) => j.status === "disputed"),
      rejected: jobs.filter((j) => j.status === "cancelled"),
    };

    return res.status(200).json({
      success: true,
      jobs: status ? jobs : jobsByStatus,
      total: jobs.length,
    });
  } catch (error) {
    console.error("Error fetching company jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch company jobs",
      error: error.message,
    });
  }
};

const getCompanyStats = async (req, res) => {
  try {
    const { status } = req.query;
    const companyWallet = req.user.walletAddress;

    const query = { companyWallet };
    if (status) query.status = status;

    const jobs = await Job.find(query).sort({ createdAt: -1 }).lean();

    // Group jobs by status for dashboard tabs
    const jobsByStatus = {
      active: jobs.filter((j) => j.status === "open"),
      inProgress: jobs.filter((j) => j.status === "in_progress" || j.status === "pending_verification"),
      completed: jobs.filter((j) => j.status === "completed"),
      disputed: jobs.filter((j) => j.status === "disputed"),
      rejected: jobs.filter((j) => j.status === "cancelled"),
    };

    // Calculate stats
    const stats = {
      totalJobs: jobs.length,
      activeJobs: jobsByStatus.active.length,
      inProgress: jobsByStatus.inProgress.length,
      completed: jobsByStatus.completed.length,
      totalApplications: jobs.reduce(
        (sum, job) => sum + (job.applications?.length || 0),
        0
      ),
    };

    return res.status(200).json({
      success: true,
      stats,
      jobs: status ? jobs : jobsByStatus,
      total: jobs.length,
    });
  } catch (error) {
    console.error("Error fetching company jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch company jobs",
      error: error.message,
    });
  }
};

// ============================================================================
// Get Single Job Details
// ============================================================================

const getJobById = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId).lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Get applications count
    const applicationsCount = job.applications?.length || 0;

    return res.status(200).json({
      success: true,
      job: {
        ...job,
        applicationsCount,
      },
    });
  } catch (error) {
    console.error("Error fetching job:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch job details",
      error: error.message,
    });
  }
};

// ============================================================================
// Apply for Job (Worker)
// ============================================================================

const applyForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { coverLetter } = req.body;
    const workerWallet = req.user.walletAddress;

    // Get worker details
    const worker = await WorkerProfile.findOne({ walletAddress: workerWallet });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    // Get job
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "Job is not open for applications",
      });
    }

    // Check if already applied
    const alreadyApplied = job.applications.some(
      (app) => app.workerWallet === workerWallet
    );

    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: "You have already applied for this job",
      });
    }

    // Add application
    job.applications.push({
      workerWallet,
      workerName: worker.name,
      appliedAt: new Date(),
      status: "pending",
      coverLetter: coverLetter || "",
    });

    await job.save();

    console.log(`✓ Worker ${workerWallet} applied for job ${jobId}`);

    return res.status(200).json({
      success: true,
      message: "Application submitted successfully",
    });
  } catch (error) {
    console.error("Error applying for job:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to apply for job",
      error: error.message,
    });
  }
};

// ============================================================================
// Get Job Applications (Company)
// ============================================================================

const getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const companyWallet = req.user.walletAddress;

    // Validate jobId
    if (!jobId || jobId === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Job ID is required and must be valid",
      });
    }

    // Find the job
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Verify the company owns this job
    if (job.companyWallet !== companyWallet) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view applications for this job",
      });
    }

    // Get applications with worker details
    const applicationsWithDetails = await Promise.all(
      job.applications.map(async (app) => {
        try {
          const workerProfile = await WorkerProfile.findOne({
            walletAddress: app.workerWallet,
          });

          return {
            workerWallet: app.workerWallet,
            workerName: workerProfile?.name || "Unknown Worker",
            status: app.status,
            appliedAt: app.appliedAt,
            coverLetter: app.coverLetter,
            workerDetails: workerProfile
              ? {
                  name: workerProfile.name,
                  rating: workerProfile.rating,
                  completedJobs: workerProfile.totalJobs,
                  experienceLevel: workerProfile.experienceLevel || "beginner",
                  skills: workerProfile.skills || [],
                  phone: workerProfile.phone,
                  location: workerProfile.location,
                }
              : null,
          };
        } catch (err) {
          console.error(
            `Error fetching worker profile for ${app.workerWallet}:`,
            err
          );
          return {
            workerWallet: app.workerWallet,
            workerName: "Unknown Worker",
            status: app.status,
            appliedAt: app.appliedAt,
            coverLetter: app.coverLetter,
            workerDetails: null,
          };
        }
      })
    );

    return res.status(200).json({
      success: true,
      applications: applicationsWithDetails,
      count: applicationsWithDetails.length,
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
      error: error.message,
    });
  }
};

// ============================================================================
// Approve Worker Application
// ── Only change vs original: waitForConfirmation() is called BEFORE any
//   MongoDB writes, so the DB is never updated unless the tx is on-chain.
// ============================================================================

const approveWorkerApplication = async (req, res) => {
  try {
    const { jobId, workerWallet, transactionSignature, escrowPDA } = req.body;
    const companyWallet = req.user.walletAddress;

    // Validate required fields
    if (!jobId || !workerWallet) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: jobId and workerWallet",
      });
    }

    // ── FIX: Confirm the blockchain tx BEFORE touching MongoDB ───────────────
    if (transactionSignature) {
      console.log(
        `⏳ Waiting for blockchain confirmation: ${transactionSignature}`
      );

      let confirmed = false;
      try {
        confirmed = await waitForConfirmation(transactionSignature);
      } catch (chainErr) {
        // Hard on-chain failure (tx reverted etc.) — don't update DB
        console.error("❌ On-chain tx failed:", chainErr.message);
        return res.status(400).json({
          success: false,
          retryable: false,
          message: "Blockchain transaction failed: " + chainErr.message,
        });
      }

      if (!confirmed) {
        // Tx still propagating — tell frontend to retry
        console.warn(
          `⚠️ Tx not confirmed after retries: ${transactionSignature}`
        );
        return res.status(202).json({
          success: false,
          retryable: true,
          message:
            "Blockchain transaction is still processing. Please retry in a few seconds.",
        });
      }
    }
    // ── End fix ──────────────────────────────────────────────────────────────

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Verify company owns this job
    if (job.companyWallet !== companyWallet) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to approve applications for this job",
      });
    }

    if (job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: `Job is not open. Current status: ${job.status}`,
      });
    }

    // Find the application
    const application = job.applications.find(
      (app) => app.workerWallet === workerWallet
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found for this worker",
      });
    }

    // Check if application is already approved
    if (application.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Application already approved",
      });
    }

    // Update application status
    application.status = "approved";
    application.approvedAt = new Date();

    // ✅ FIX: Mark all OTHER pending applicants as rejected
    // so they appear in their "Rejected" tab
    job.applications.forEach((app) => {
      if (app.workerWallet !== workerWallet && app.status === "pending") {
        app.status = "rejected";
        app.rejectedAt = new Date();
      }
    });

    // Update job with assigned worker
    job.assignedWorker = workerWallet;

    const worker = await WorkerProfile.findOne({ walletAddress: workerWallet });
    job.workerName = worker?.name || "Unknown Worker";
    job.workerPDA = worker?.PDAAddress || null;

    // Update job status to in_progress
    job.status = "in_progress";

    // Store blockchain transaction details
    if (transactionSignature) {
      job.assignWorkerTxSignature = transactionSignature;
    }
    if (escrowPDA) {
      job.escrowPDA = escrowPDA;
    }

    await job.save();

    console.log(`✅ Worker ${workerWallet} approved for job ${jobId}`);
    console.log(`✅ Job status updated to in_progress`);

    return res.status(200).json({
      success: true,
      message: "Worker approved successfully and job status updated",
      job: {
        id: job._id,
        status: job.status,
        assignedWorker: job.assignedWorker,
        workerName: job.workerName,
        workerPDA: job.workerPDA,
        transactionSignature: transactionSignature,
        escrowPDA: escrowPDA,
      },
    });
  } catch (error) {
    console.error("❌ Error approving worker:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve worker in database",
      error: error.message,
    });
  }
};

// ============================================================================
// Update Job Status (Sync with blockchain)
// ============================================================================

const updateJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, workerWallet, transactionSignature } = req.body;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Update job status
    job.status = status;

    if (status === "in_progress" && workerWallet) {
      job.assignedWorker = workerWallet;
      job.startedAt = new Date();
    }

    if (status === "pending_verification") {
      job.completedAt = new Date();
      // Set dispute deadline (3 days from now)
      const disputeDeadline = new Date();
      disputeDeadline.setDate(disputeDeadline.getDate() + 3);
      job.disputeDeadline = disputeDeadline;
    }

    if (status === "completed") {
      job.completedAt = job.completedAt || new Date();
    }

    await job.save();

    console.log(`✓ Job ${jobId} status updated to ${status}`);

    return res.status(200).json({
      success: true,
      message: "Job status updated successfully",
      job: {
        id: job._id,
        status: job.status,
        assignedWorker: job.assignedWorker,
      },
    });
  } catch (error) {
    console.error("Error updating job status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update job status",
      error: error.message,
    });
  }
};

// ============================================================================
// Get Worker Jobs (for worker dashboard)
// ============================================================================

const getWorkerJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const workerWallet = req.user.walletAddress;

    let jobs;

    if (status === "available") {
      // Get worker profile to filter by categories
      const worker = await WorkerProfile.findOne({
        walletAddress: workerWallet,
      });

      if (!worker) {
        return res.status(404).json({
          success: false,
          message: "Worker profile not found",
        });
      }

      // Find open jobs matching worker's categories
      jobs = await Job.find({
        status: "open",
        category: { $in: worker.jobCategories },
      })
        .sort({ createdAt: -1 })
        .lean();
    } else {
      // Find jobs where worker has applied or is assigned
      const query = {
        $or: [
          { assignedWorker: workerWallet },
          { "applications.workerWallet": workerWallet },
        ],
      };

      if (status) query.status = status;

      jobs = await Job.find(query).sort({ createdAt: -1 }).lean();
    }

    // Group by status for dashboard tabs
    const jobsByStatus = {
      available: jobs.filter((j) => j.status === "open" && !j.assignedWorker),
      active: jobs.filter(
        (j) =>
          j.assignedWorker === workerWallet &&
          (j.status === "open" || j.status === "in_progress")
      ),
      completed: jobs.filter(
        (j) =>
          j.assignedWorker === workerWallet &&
          (j.status === "completed" || j.status === "pending_verification")
      ),
      rejected: jobs.filter((j) => {
        const app = j.applications?.find(
          (a) => a.workerWallet === workerWallet
        );
        return app?.status === "rejected";
      }),
    };

    return res.status(200).json({
      success: true,
      jobs: status ? jobs : jobsByStatus,
      total: jobs.length,
    });
  } catch (error) {
    console.error("Error fetching worker jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch worker jobs",
      error: error.message,
    });
  }
};

// ============================================================================
// Generate Job OTP (Company)
// ============================================================================

const generateJobOTP = async (req, res) => {
  try {
    const { jobId, otpType } = req.body;
    const companyWallet = req.user.walletAddress;

    // Validate input
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required",
      });
    }

    if (!otpType || !["start", "end"].includes(otpType)) {
      return res.status(400).json({
        success: false,
        message: "OTP type must be 'start' or 'end'",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Verify company owns this job
    if (job.companyWallet !== companyWallet) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to generate OTP for this job",
      });
    }

    // Verify job is in_progress
    if (job.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: `Cannot generate OTP. Job status must be 'in_progress', current status: ${job.status}`,
      });
    }

    // Check if worker is assigned
    if (!job.assignedWorker) {
      return res.status(400).json({
        success: false,
        message: "No worker assigned to this job",
      });
    }

    // Determine which OTP field to update
    const otpField = otpType === "start" ? "startJobOTP" : "endJobOTP";
    const otpLabel = otpType === "start" ? "Start Job" : "End Job";

    // Check if OTP already exists and is still valid
    const existingOTP = job[otpField];
    if (
      existingOTP?.code &&
      !existingOTP.isUsed &&
      existingOTP.expiresAt > new Date()
    ) {
      return res.status(200).json({
        success: true,
        message: `${otpLabel} OTP already exists and is valid`,
        otp: {
          code: existingOTP.code,
          expiresAt: existingOTP.expiresAt,
          type: otpType,
        },
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours expiry

    // Store OTP in job
    job[otpField] = {
      code: otpCode,
      generatedAt: now,
      expiresAt: expiresAt,
      isUsed: false,
    };

    await job.save();

    console.log(`✅ ${otpLabel} OTP generated for job ${jobId}: ${otpCode}`);

    return res.status(200).json({
      success: true,
      message: `${otpLabel} OTP generated successfully`,
      otp: {
        code: otpCode,
        expiresAt: expiresAt,
        type: otpType,
      },
    });
  } catch (error) {
    console.error("❌ Error generating OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate OTP",
      error: error.message,
    });
  }
};

// ============================================================================
// Verify and Use OTP (Worker)
// ============================================================================

const verifyJobOTP = async (req, res) => {
  try {
    const { jobId, otpCode, otpType } = req.body;

    if (!jobId || !otpCode || !otpType) {
      return res.status(400).json({
        success: false,
        message: "Job ID, OTP code, and OTP type are required",
      });
    }

    if (!["start", "end"].includes(otpType)) {
      return res.status(400).json({
        success: false,
        message: "OTP type must be 'start' or 'end'",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const otpField = otpType === "start" ? "startJobOTP" : "endJobOTP";
    const storedOTP = job[otpField];

    // Validate OTP
    if (!storedOTP?.code) {
      return res.status(400).json({
        success: false,
        message: "No OTP generated for this job yet",
      });
    }

    if (storedOTP.isUsed) {
      return res.status(400).json({
        success: false,
        message: "This OTP has already been used",
      });
    }

    if (storedOTP.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    if (storedOTP.code !== otpCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP code",
      });
    }

    // Additional validation for end OTP
    if (otpType === "end" && !job.startJobOTP?.isUsed) {
      return res.status(400).json({
        success: false,
        message: "You must start the job first",
      });
    }

    // Handle START OTP - Mark as used immediately
    if (otpType === "start") {
      const { photoUrl, gpsCoordinates } = req.body;
      storedOTP.isUsed = true;
      storedOTP.usedAt = new Date();
      storedOTP.photoUrl = photoUrl || null;
      storedOTP.gpsCoordinates = gpsCoordinates || null;
      await job.save();

      return res.status(200).json({
        success: true,
        message: "Job started successfully",
        otpType: "start",
        job: {
          id: job._id,
          status: job.status,
        },
      });
    }

    // Handle END OTP - Signal frontend to submit proof to blockchain
    if (otpType === "end") {
      return res.status(200).json({
        success: true,
        message: "OTP verified. Please submit proof of work on blockchain",
        otpType: "end",
        requiresBlockchainProof: true,
        blockchainData: {
          jobPDA: job.jobPDA,
          workerWallet: job.assignedWorker,
          proofData: `End OTP verified: ${otpCode}`,
        },
      });
    }
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: error.message,
    });
  }
};

// ============================================================================
// Record Proof Submission (After worker submits to blockchain from frontend)
// ============================================================================

const recordProofSubmission = async (req, res) => {
  try {
    const { jobId, txSignature, proofAccountAddress, proofType, proofData, photoUrl, gpsCoordinates } =
      req.body;

    console.log("📝 Recording proof submission:", {
      jobId,
      txSignature,
      proofAccountAddress,
    });

    // Validation
    if (!jobId || !txSignature || !proofAccountAddress) {
      return res.status(400).json({
        success: false,
        message:
          "Job ID, transaction signature, and proof account address are required",
      });
    }

    // Find job
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Verify job is in correct state
    if (job.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Job must be in progress",
        currentStatus: job.status,
      });
    }

    // Check if proof already submitted
    if (job.endJobOTP?.isUsed || job.proofOfWork?.accountAddress) {
      return res.status(400).json({
        success: false,
        message: "Proof already submitted for this job",
      });
    }

    // Update job in database
    const now = new Date();
    const disputeEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days

    // Mark end OTP as used
    job.endJobOTP.isUsed = true;
    job.endJobOTP.usedAt = now;

    // Set dispute period
    job.disputePeriod = {
      startedAt: now,
      endsAt: disputeEndsAt,
      isActive: true,
      isExpired: false,
    };

    // Update status
    job.status = "pending_verification";

    // Store proof of work details (including photo + GPS evidence)
    job.proofOfWork = {
      accountAddress: proofAccountAddress,
      txSignature: txSignature,
      proofType: proofType || "OTP",
      proofData: proofData || "End OTP verified and work completed",
      photoUrl: photoUrl || null,
      gpsCoordinates: gpsCoordinates || null,
      submittedAt: now,
      isVerified: false,
    };

    console.log("💾 Saving job to database...");

    // Save job
    await job.save();

    console.log("✅ Job saved successfully");

    return res.status(200).json({
      success: true,
      message: "Proof recorded successfully. Dispute period started.",
      job: {
        id: job._id,
        status: job.status,
        disputePeriod: job.disputePeriod,
        proofOfWork: job.proofOfWork,
      },
    });
  } catch (error) {
    console.error("❌ Error recording proof:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record proof submission",
      error: error.message,
    });
  }
};

// ============================================================================
// Get Proof of Work Details (For Both Company & Worker)
// ============================================================================

const getProofOfWork = async (req, res) => {
  try {
    const { jobId } = req.params;

    console.log("📋 Fetching proof for job:", jobId);

    const job = await Job.findById(jobId);

    if (!job) {
      console.log("❌ Job not found");
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    console.log("📊 Job details:", {
      id: job._id,
      status: job.status,
      hasProofOfWork: !!job.proofOfWork,
      proofAccountAddress: job.proofOfWork?.accountAddress,
    });

    // Check if proof exists
    if (!job.proofOfWork || !job.proofOfWork.accountAddress) {
      console.log("❌ No proof of work found");
      return res.status(404).json({
        success: false,
        message: "No proof of work submitted yet",
        debug: {
          jobId: job._id,
          status: job.status,
          hasProofField: !!job.proofOfWork,
          proofDetails: job.proofOfWork,
        },
      });
    }

    // Return proof details
    const proofDetails = {
      accountAddress: job.proofOfWork.accountAddress,
      txSignature: job.proofOfWork.txSignature,
      proofType: job.proofOfWork.proofType,
      proofData: job.proofOfWork.proofData,
      submittedAt: job.proofOfWork.submittedAt,
      isVerified: job.proofOfWork.isVerified,
      disputePeriod: job.disputePeriod,
      workerWallet: job.assignedWorker,
      workerName: job.workerName,
    };

    console.log("✅ Proof found, returning details");

    return res.status(200).json({
      success: true,
      proof: proofDetails,
    });
  } catch (error) {
    console.error("❌ Error fetching proof:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch proof of work",
      error: error.message,
    });
  }
};

// ============================================================================
// Check and Update Expired Dispute Periods
// ============================================================================

const updateDisputePeriodStatus = async (req, res) => {
  try {
    const now = new Date();

    // Find all jobs with active dispute periods that have expired
    const expiredJobs = await Job.find({
      "disputePeriod.isActive": true,
      "disputePeriod.isExpired": false,
      "disputePeriod.endsAt": { $lte: now },
    });

    if (expiredJobs.length > 0) {
      for (const job of expiredJobs) {
        job.disputePeriod.isActive = false;
        job.disputePeriod.isExpired = true;

        // Update job status to completed if no dispute was raised
        if (job.status === "pending_verification") {
          job.status = "completed";
        }

        await job.save();
        console.log(`✅ Dispute period expired for job ${job._id}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Dispute periods updated",
      expiredCount: expiredJobs.length,
    });
  } catch (error) {
    console.error("❌ Error updating dispute periods:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update dispute periods",
      error: error.message,
    });
  }
};

// ============================================================================
// Mark Fund Transfer as Complete
// ============================================================================

const markFundTransferred = async (req, res) => {
  try {
    const { jobId, transactionSignature, amount } = req.body;

    if (!jobId || !transactionSignature) {
      return res.status(400).json({
        success: false,
        message: "Job ID and transaction signature are required",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Check if dispute period has expired
    if (job.disputePeriod.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot transfer funds while dispute period is active",
      });
    }

    job.fundTransfer = {
      isTransferred: true,
      transferredAt: new Date(),
      transactionSignature: transactionSignature,
      amount: amount,
    };

    job.status = "completed";

    await job.save();

    console.log(`✅ Funds transferred for job ${jobId}`);

    return res.status(200).json({
      success: true,
      message: "Fund transfer recorded successfully",
      job: {
        id: job._id,
        status: job.status,
        fundTransfer: job.fundTransfer,
      },
    });
  } catch (error) {
    console.error("❌ Error marking fund transfer:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark fund transfer",
      error: error.message,
    });
  }
};

// ============================================================================
// Get Worker's In-Progress Jobs
// ============================================================================

const getWorkerInProgressJobs = async (req, res) => {
  try {
    const workerWallet = req.user.walletAddress;

    const jobs = await Job.find({
      assignedWorker: workerWallet,
      status: "in_progress",
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      jobs: jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error("Error fetching in-progress jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch in-progress jobs",
      error: error.message,
    });
  }
};

// ============================================================================
// Get Worker's Completed Jobs
// ============================================================================

const getWorkerCompletedJobs = async (req, res) => {
  try {
    const workerWallet = req.user.walletAddress;

    const jobs = await Job.find({
      assignedWorker: workerWallet,
      status: { $in: ["pending_verification", "completed"] },
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      jobs: jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error("Error fetching completed jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch completed jobs",
      error: error.message,
    });
  }
};

// ============================================================================
// Reject Worker Application (Company)
// ============================================================================

const rejectWorkerApplication = async (req, res) => {
  try {
    const { jobId, workerWallet } = req.body;
    const companyWallet = req.user.walletAddress;

    if (!jobId || !workerWallet) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: jobId and workerWallet",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (job.companyWallet !== companyWallet) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const application = job.applications.find(
      (app) => app.workerWallet === workerWallet
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Application is already ${application.status}`,
      });
    }

    application.status = "rejected";
    application.rejectedAt = new Date();

    await job.save();

    console.log(`✅ Worker ${workerWallet} application rejected for job ${jobId}`);

    return res.status(200).json({
      success: true,
      message: "Application rejected successfully",
    });
  } catch (error) {
    console.error("❌ Error rejecting worker:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject worker application",
      error: error.message,
    });
  }
};

// ============================================================================
// Get Worker Profile by wallet (for company viewing worker profile)
// ============================================================================

const getWorkerProfile = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const worker = await WorkerProfile.findOne({ walletAddress }).lean();

    if (!worker) {
      return res.status(404).json({ success: false, message: "Worker not found" });
    }

    // Get job stats for this worker
    const totalJobs = await Job.countDocuments({
      assignedWorker: walletAddress,
    });
    const completedJobs = await Job.countDocuments({
      assignedWorker: walletAddress,
      status: "completed",
    });
    const disputedJobs = await Job.countDocuments({
      assignedWorker: walletAddress,
      status: "disputed",
    });

    return res.status(200).json({
      success: true,
      worker: {
        ...worker,
        jobStats: { totalJobs, completedJobs, disputedJobs },
      },
    });
  } catch (error) {
    console.error("Error fetching worker profile:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch worker profile", error: error.message });
  }
};

// ============================================================================
// Get Company Disputed Jobs (for company dispute tab)
// ============================================================================

const getCompanyDisputedJobs = async (req, res) => {
  try {
    const companyWallet = req.user.walletAddress;

    const jobs = await Job.find({
      companyWallet,
      status: "disputed",
    }).sort({ "dispute.createdAt": -1 }).lean();

    return res.status(200).json({ success: true, jobs });
  } catch (error) {
    console.error("Error fetching disputed jobs:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch disputed jobs", error: error.message });
  }
};

// ============================================================================
// Get Worker Disputed Jobs (for worker dispute tab)
// ============================================================================

const getWorkerDisputedJobs = async (req, res) => {
  try {
    const workerWallet = req.user.walletAddress;

    const jobs = await Job.find({
      assignedWorker: workerWallet,
      status: "disputed",
    }).sort({ "dispute.createdAt": -1 }).lean();

    // Fetch company details
    const jobsWithDetails = await Promise.all(
      jobs.map(async (job) => {
        const company = await CompanyProfile.findOne({
          walletAddress: job.companyWallet,
        }).select("companyName email location").lean();
        return { ...job, companyDetails: company || null };
      })
    );

    return res.status(200).json({ success: true, jobs: jobsWithDetails });
  } catch (error) {
    console.error("Error fetching worker disputed jobs:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch disputed jobs", error: error.message });
  }
};

// ============================================================================
// Export all functions
// ============================================================================

export {
  createJob,
  getAllJobs,
  getCompanyJobs,
  getJobById,
  applyForJob,
  getJobApplications,
  approveWorkerApplication,
  rejectWorkerApplication,
  updateJobStatus,
  getWorkerJobs,
  getCompanyStats,
  generateJobOTP,
  verifyJobOTP,
  recordProofSubmission,
  getProofOfWork,
  updateDisputePeriodStatus,
  markFundTransferred,
  getWorkerInProgressJobs,
  getWorkerCompletedJobs,
  getWorkerProfile,
  getCompanyDisputedJobs,
  getWorkerDisputedJobs,
};