import express from "express";
import {
  verifyCompanyWallet,
  signupCompany,
  getCompanyProfile,
  updateCompanyProfile,
} from "../controller/companyController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
// import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/company/verify-wallet
// Verify wallet signature and create initial company record
router.post("/verify-wallet", verifyCompanyWallet);

// POST /api/company/signup
// Complete company registration with full details
router.post("/signup", signupCompany);

// GET /api/company/:walletAddress
// Get company profile by wallet address
router.get("/:walletAddress", getCompanyProfile);

router.get("/jobs", authMiddleware, async (req, res) => {
  try {
    const companyWallet = req.user.walletAddress;

    const jobs = await Job.find({ companyWallet })
      .sort({ createdAt: -1 })
      .lean();

    // Group jobs by status
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
      jobs: jobsByStatus,
      total: jobs.length,
    });
  } catch (error) {
    console.error("Error fetching company jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch company jobs",
    });
  }
});

// Get company statistics
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const companyWallet = req.user.walletAddress;

    const jobs = await Job.find({ companyWallet }).lean();

    const stats = {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j) => j.status === "open").length,
      inProgress: jobs.filter((j) => j.status === "in_progress").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      totalApplications: jobs.reduce(
        (sum, job) => sum + (job.applications?.length || 0),
        0
      ),
    };

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching company stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch company stats",
    });
  }
});

// Get applications for a specific job
router.get("/:jobId/applications", authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const companyWallet = req.user.walletAddress;

    const job = await Job.findOne({
      _id: jobId,
      companyWallet,
    }).lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or unauthorized",
      });
    }

    return res.status(200).json({
      success: true,
      applications: job.applications || [],
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
    });
  }
});

// PUT /api/company/:walletAddress
// Update company profile (protected route)
// router.put("/:walletAddress", authMiddleware, updateCompanyProfile);

export default router;
