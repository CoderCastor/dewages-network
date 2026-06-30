import express from "express";
import multer from "multer";
import {
  verifyCompanyWallet,
  signupCompany,
  getCompanyProfile,
  updateCompanyProfile,
  uploadCompanyDocument,
} from "../controller/companyController.js";
import { sendOTP, verifyOTP } from "../controller/otpController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { CompanyProfile } from "../model/companyModel.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

// POST /api/company/verify-wallet
router.post("/verify-wallet", verifyCompanyWallet);

// POST /api/company/signup
router.post("/signup", signupCompany);

// Email OTP Verification
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

// GET /api/company/profile/me - Get current company's own profile
router.get("/profile/me", authMiddleware, async (req, res) => {
  try {
    const company = await CompanyProfile.findOne({ walletAddress: req.user.walletAddress }).lean();
    if (!company) return res.status(404).json({ success: false, message: "Company profile not found" });
    return res.status(200).json({ success: true, company });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch profile", error: error.message });
  }
});

// POST /api/company/profile/logo — upload company logo
router.post("/profile/logo", authMiddleware, upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const { uploadCompanyLogo } = await import("../services/s3UploadService.js");
    const url = await uploadCompanyLogo(req.file.buffer, req.file.mimetype, req.user.walletAddress);
    await CompanyProfile.findOneAndUpdate(
      { walletAddress: req.user.walletAddress },
      { $set: { logo: url } }
    );
    return res.status(200).json({ success: true, url });
  } catch (err) {
    console.error("Logo upload error:", err);
    return res.status(500).json({ success: false, message: "Failed to upload logo", error: err.message });
  }
});

// POST /api/company/upload-document - Upload verification document to S3
router.post("/upload-document", authMiddleware, upload.single("document"), uploadCompanyDocument);

// PATCH /api/company/profile/update - Update company's updatable fields
router.patch("/profile/update", authMiddleware, async (req, res) => {
  try {
    const allowedFields = ["companyName", "companyType", "phone", "email", "website", "description", "location", "interestedCategories", "contactPerson", "socialProfiles"];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    const updated = await CompanyProfile.findOneAndUpdate(
      { walletAddress: req.user.walletAddress },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Company not found" });
    return res.status(200).json({ success: true, message: "Profile updated", company: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update profile", error: error.message });
  }
});

// GET /api/company/:walletAddress - Get company profile by wallet address
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
