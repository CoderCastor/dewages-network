// ============================================================================
// controllers/jobController.js - Job Management
// ============================================================================

import { Job, JobApplication } from "../model/jobModel.js";
import { CompanyProfile } from "../model/companyModel.js";
import { WorkerProfile } from "../model/workerModel.js";

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

    // Get company details
    const company = await CompanyProfile.findOne({ walletAddress: companyWallet });
    
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
      inProgress: jobs.filter((j) => j.status === "in_progress"),
      completed: jobs.filter(
        (j) => j.status === "completed" || j.status === "pending_verification"
      ),
      rejected: jobs.filter(
        (j) => j.status === "cancelled" || j.status === "disputed"
      ),
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
      inProgress: jobs.filter((j) => j.status === "in_progress"),
      completed: jobs.filter(
        (j) => j.status === "completed" || j.status === "pending_verification"
      ),
      rejected: jobs.filter(
        (j) => j.status === "cancelled" || j.status === "disputed"
      ),
    };

    // ✅ Calculate stats
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
      stats, // ✅ Add stats object
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
        message: "Unauthorized to view applications",
      });
    }

    // Get detailed worker info for each application
    const applicationsWithDetails = await Promise.all(
      job.applications.map(async (app) => {
        const worker = await WorkerProfile.findOne({
          walletAddress: app.workerWallet,
        }).select("name rating totalJobs completedJobs experienceLevel skills");

        return {
          ...app.toObject(),
          workerDetails: worker,
        };
      })
    );

    return res.status(200).json({
      success: true,
      applications: applicationsWithDetails,
      total: applicationsWithDetails.length,
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
// ============================================================================

const approveWorkerApplication = async (req, res) => {
  try {
    const { jobId, workerWallet } = req.body;
    const companyWallet = req.user.walletAddress;

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
        message: "Unauthorized to approve applications",
      });
    }

    if (job.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "Job is not open",
      });
    }

    // Find the application
    const application = job.applications.find(
      (app) => app.workerWallet === workerWallet
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Update application status
    application.status = "approved";

    // Update job with assigned worker
    job.assignedWorker = workerWallet;
    const worker = await WorkerProfile.findOne({ walletAddress: workerWallet });
    job.workerName = worker?.name || "Unknown";
    job.workerPDA = worker?.PDAAddress || null;

    // Note: Status will be updated to "in_progress" after blockchain assign_worker call
    // For now, keep it as metadata update

    await job.save();

    console.log(`✓ Worker ${workerWallet} approved for job ${jobId}`);

    return res.status(200).json({
      success: false,
      message: "Worker approved successfully. Please complete blockchain transaction.",
      job: {
        id: job._id,
        assignedWorker: job.assignedWorker,
        workerName: job.workerName,
      },
    });
  } catch (error) {
    console.error("Error approving worker:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve worker",
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
      const worker = await WorkerProfile.findOne({ walletAddress: workerWallet });
      
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
        const app = j.applications?.find((a) => a.workerWallet === workerWallet);
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

export {
  createJob,
  getAllJobs,
  getCompanyJobs,
  getJobById,
  applyForJob,
  getJobApplications,
  approveWorkerApplication,
  updateJobStatus,
  getWorkerJobs,
  getCompanyStats
};