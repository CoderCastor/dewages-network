import express from "express";
import {
  verifyCompanyWallet,
  signupCompany,
  getCompanyProfile,
  updateCompanyProfile,
} from "../controller/companyController.js";
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

// PUT /api/company/:walletAddress
// Update company profile (protected route)
// router.put("/:walletAddress", authMiddleware, updateCompanyProfile);

export default router;