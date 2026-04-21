import express from "express";
import {
  createJob,
  getAllJobs,
  getCompanyJobs,
  getJobById,
  applyForJob,
  getJobApplications,
  approveWorkerApplication,
  updateJobStatus,
  getWorkerJobs,
  getCompanyStats,
  generateJobOTP,
  verifyJobOTP,
  getWorkerInProgressJobs,
  getProofOfWork,
  recordProofSubmission,
} from "../controller/jobController.js";
import {
  submitCompanyRating,
  submitWorkerRating,
  checkRatingStatus,
} from "../controller/ratingController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { Job } from "../model/jobModel.js";
import { CompanyProfile } from "../model/companyModel.js";
import { WorkerProfile } from "../model/workerModel.js";

const jobRouter = express.Router();

// ============================================================================
// Public Routes (No authentication required)
// ============================================================================

// GET /api/job/all
// Get all jobs with optional filters
jobRouter.get("/all", getAllJobs);

// ============================================================================
// Protected Routes - Company
// ============================================================================

// POST /api/job/create
// Create new job (after blockchain transaction)
jobRouter.post("/create", authMiddleware, createJob);

// GET /api/job/company/jobs
// Get all jobs posted by company
jobRouter.get("/company/jobs", authMiddleware, getCompanyJobs);

// GET /api/job/company/stats
// Get company statistics
jobRouter.get("/company/stats", authMiddleware, getCompanyStats);

// POST /api/job/approve-worker
// Approve worker application
jobRouter.post("/approve-worker", authMiddleware, approveWorkerApplication);

// ============================================================================
// Protected Routes - Worker
// ============================================================================

// IMPORTANT: Put specific routes BEFORE /:jobId to avoid conflicts

// GET /api/job/available
// Get all available jobs for worker (not applied yet)
jobRouter.get("/available", authMiddleware, async (req, res) => {
  try {
    const workerWallet = req.user.walletAddress;

    // Find all open jobs that the worker hasn't applied to
    const jobs = await Job.find({
      status: "open",
      "applications.workerWallet": { $ne: workerWallet },
    })
      .sort({ createdAt: -1 })
      .lean();

    // ✅ FIXED: Manually fetch company details for each job
    const jobsWithCompanyDetails = await Promise.all(
      jobs.map(async (job) => {
        const company = await CompanyProfile.findOne({
          walletAddress: job.companyWallet,
        })
          .select("companyName email phone location contactPerson")
          .lean();

        return {
          ...job,
          hasApplied: false,
          companyDetails: company || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      jobs: jobsWithCompanyDetails,
    });
  } catch (error) {
    console.error("Error fetching available jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch available jobs",
      error: error.message,
    });
  }
});

// GET /api/job/worker/applied
// Get jobs worker has applied to (pending applications)
jobRouter.get("/worker/applied", authMiddleware, async (req, res) => {
  try {
    const workerWallet = req.user.walletAddress;

    const jobs = await Job.find({
      "applications.workerWallet": workerWallet,
      "applications.status": "pending",
    })
      .sort({ createdAt: -1 })
      .lean();

    // ✅ FIXED: Manually fetch company details
    const jobsWithCompanyDetails = await Promise.all(
      jobs.map(async (job) => {
        const company = await CompanyProfile.findOne({
          walletAddress: job.companyWallet,
        })
          .select("companyName email phone location")
          .lean();

        return {
          ...job,
          companyDetails: company || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      jobs: jobsWithCompanyDetails,
    });
  } catch (error) {
    console.error("Error fetching applied jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch applied jobs",
      error: error.message,
    });
  }
});

// GET /api/job/worker/in-progress
// Get jobs worker is currently working on
jobRouter.get("/worker/in-progress", authMiddleware, async (req, res) => {
  try {
    const workerWallet = req.user.walletAddress;

    const jobs = await Job.find({
      assignedWorker: workerWallet,
      status: { $in: ["in_progress", "pending_verification"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    // ✅ FIXED: Manually fetch company details
    const jobsWithCompanyDetails = await Promise.all(
      jobs.map(async (job) => {
        const company = await CompanyProfile.findOne({
          walletAddress: job.companyWallet,
        })
          .select("companyName email phone location contactPerson")
          .lean();

        return {
          ...job,
          companyDetails: company || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      jobs: jobsWithCompanyDetails,
    });
  } catch (error) {
    console.error("Error fetching in-progress jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch in-progress jobs",
      error: error.message,
    });
  }
});

// GET /api/job/worker/completed
// Get worker's completed jobs
jobRouter.get("/worker/completed", authMiddleware, async (req, res) => {
  try {
    const workerWallet = req.user.walletAddress;

    const jobs = await Job.find({
      assignedWorker: workerWallet,
      status: "completed",
    })
      .sort({ completedAt: -1 })
      .lean();

    // ✅ FIXED: Manually fetch company details
    const jobsWithCompanyDetails = await Promise.all(
      jobs.map(async (job) => {
        const company = await CompanyProfile.findOne({
          walletAddress: job.companyWallet,
        })
          .select("companyName email phone location rating")
          .lean();

        return {
          ...job,
          companyDetails: company || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      jobs: jobsWithCompanyDetails,
    });
  } catch (error) {
    console.error("Error fetching completed jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch completed jobs",
      error: error.message,
    });
  }
});

// GET /api/job/worker/rejected
// Get worker's rejected applications
jobRouter.get("/worker/rejected", authMiddleware, async (req, res) => {
  try {
    const workerWallet = req.user.walletAddress;

    const jobs = await Job.find({
      applications: {
        $elemMatch: {
          workerWallet: workerWallet,
          status: "rejected",
        },
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    // ✅ FIXED: Manually fetch company details
    const jobsWithCompanyDetails = await Promise.all(
      jobs.map(async (job) => {
        const company = await CompanyProfile.findOne({
          walletAddress: job.companyWallet,
        })
          .select("companyName email location")
          .lean();

        return {
          ...job,
          companyDetails: company || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      jobs: jobsWithCompanyDetails,
    });
  } catch (error) {
    console.error("Error fetching rejected jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rejected jobs",
      error: error.message,
    });
  }
});

// GET /api/job/worker/stats
// Get worker statistics
jobRouter.get("/worker/stats", authMiddleware, async (req, res) => {
  try {
    const workerWallet = req.user.walletAddress;

    // Count available jobs (open jobs not applied to)
    const availableJobs = await Job.countDocuments({
      status: "open",
      "applications.workerWallet": { $ne: workerWallet },
    });

    // Count applied jobs (pending applications)
    const appliedJobs = await Job.countDocuments({
      applications: {
        $elemMatch: {
          workerWallet: workerWallet,
          status: "pending",
        },
      },
    });

    // Count active jobs (in progress or pending verification)
    const activeJobs = await Job.countDocuments({
      assignedWorker: workerWallet,
      status: { $in: ["in_progress", "pending_verification"] },
    });

    // Count completed jobs
    const completedJobs = await Job.countDocuments({
      assignedWorker: workerWallet,
      status: "completed",
    });

    // Calculate total earnings
    const completedJobsData = await Job.find({
      assignedWorker: workerWallet,
      status: "completed",
    }).select("paymentAmount");

    const totalEarnings = completedJobsData.reduce(
      (sum, job) => sum + (job.paymentAmount || 0),
      0
    );

    return res.status(200).json({
      success: true,
      stats: {
        availableJobs,
        appliedJobs,
        activeJobs,
        completedJobs,
        totalEarnings,
      },
    });
  } catch (error) {
    console.error("Error fetching worker stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch worker stats",
      error: error.message,
    });
  }
});

// GET /api/job/worker/jobs
// Get all jobs for worker (available, active, completed, rejected)
jobRouter.get("/worker/jobs", authMiddleware, getWorkerJobs);

// POST /api/job/apply
// Worker applies to a job
jobRouter.post("/apply", authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.body;
    const workerWallet = req.user.walletAddress;

    // Validate input
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required",
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

    // Check if job is open
    if (job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "Job is not accepting applications",
      });
    }

    // Check if worker already applied
    const alreadyApplied = job.applications.some(
      (app) => app.workerWallet === workerWallet
    );

    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: "You have already applied to this job",
      });
    }

    // Get worker profile from WorkerProfile model
    const workerProfile = await WorkerProfile.findOne({
      walletAddress: workerWallet,
    });

    // Add application
    job.applications.push({
      workerWallet,
      workerName: workerProfile?.name || "Unknown Worker",
      appliedAt: new Date(),
      status: "pending",
      workerDetails: {
        name: workerProfile?.name,
        rating: workerProfile?.rating || 0,
        completedJobs: workerProfile?.completedJobs || 0,
        experienceLevel: workerProfile?.experienceLevel || "beginner",
        skills: workerProfile?.skills || [],
        phone: workerProfile?.phone,
        email: workerProfile?.email,
      },
    });

    await job.save();

    return res.status(200).json({
      success: true,
      message: "Application submitted successfully",
      job,
    });
  } catch (error) {
    console.error("Error applying to job:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to apply to job",
      error: error.message,
    });
  }
});

// ============================================================================
// Parameterized Routes - MUST BE LAST
// ============================================================================

// GET /api/job/:jobId/applications
// Get all applications for a job
jobRouter.get("/:jobId/applications", authMiddleware, getJobApplications);


// POST /api/job/:jobId/apply
// Worker applies for a job (alternative endpoint)
jobRouter.post("/:jobId/apply", authMiddleware, applyForJob);

// PATCH /api/job/:jobId/status
// Update job status (sync with blockchain)
jobRouter.patch("/:jobId/status", authMiddleware, updateJobStatus);

// GET /api/job/:jobId
// Get single job details - MUST BE LAST
jobRouter.get("/:jobId", getJobById);


// POST /api/job/generate-otp - Generate OTP for start or end
jobRouter.post("/generate-otp", authMiddleware, generateJobOTP);

// POST /api/job/verify-otp - Verify OTP
jobRouter.post("/verify-otp", authMiddleware, verifyJobOTP);

// GET /api/job/worker/in-progress - Get worker's in-progress jobs
jobRouter.get("/worker/in-progress", authMiddleware, getWorkerInProgressJobs);


// POST /api/job/submit-proof - NEW ROUTE
jobRouter.post("/proof-submitted", authMiddleware, recordProofSubmission);

// GET /api/job/:jobId/proof
jobRouter.get("/:jobId/proof", authMiddleware, getProofOfWork);

// ============================================================================
// Rating Routes
// ============================================================================

// POST /api/job/rating/company - Company rates worker
jobRouter.post("/rating/company", authMiddleware, submitCompanyRating);

// POST /api/job/rating/worker - Worker rates company
jobRouter.post("/rating/worker", authMiddleware, submitWorkerRating);

// GET /api/job/:jobId/rating-status - Check rating status
jobRouter.get("/:jobId/rating-status", authMiddleware, checkRatingStatus);

export default jobRouter;
