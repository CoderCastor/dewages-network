import { Router } from "express";
import {
  signupUser,
  verifyWorkerWallet,
  verifyPAN,
} from "../controller/workerController.js";
import { sendOTP, verifyOTP } from "../controller/otpController.js";
import { WorkerProfile } from "../model/workerModel.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const workerRouter = Router();

workerRouter.post("/signup", signupUser);
workerRouter.post("/walletverify", verifyWorkerWallet);
workerRouter.post("/verify-pan", verifyPAN);

// Email OTP Verification
workerRouter.post("/send-otp", sendOTP);
workerRouter.post("/verify-otp", verifyOTP);

// GET /api/worker/profile/me - Get current worker's own profile
workerRouter.get("/profile/me", authMiddleware, async (req, res) => {
  try {
    const worker = await WorkerProfile.findOne({ walletAddress: req.user.walletAddress }).lean();
    if (!worker) return res.status(404).json({ success: false, message: "Worker profile not found" });
    return res.status(200).json({ success: true, worker });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch profile", error: error.message });
  }
});

// PATCH /api/worker/profile/update - Update worker's updatable profile fields
workerRouter.patch("/profile/update", authMiddleware, async (req, res) => {
  try {
    const allowedFields = ["name", "phone", "email", "bio", "location", "skills", "experienceLevel", "jobCategories", "preferences", "socialProfiles", "emergencyContact"];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    const updated = await WorkerProfile.findOneAndUpdate(
      { walletAddress: req.user.walletAddress },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Worker not found" });
    return res.status(200).json({ success: true, message: "Profile updated", worker: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update profile", error: error.message });
  }
});

export default workerRouter;

