import { Router } from "express";
import { adminLogin, adminGetNonce,
  // Worker endpoints
  fetchWorkerByWallet,
  fetchWorkers,
  verifyWorker,
  // Company endpoints
  fetchCompanies,
  fetchCompanyByWallet,
  verifyCompany,
} from "../controller/adminController.js";
import { adminGetDisputes, adminResolveDispute, getDisputeHistory } from "../controller/disputeController.js";

const adminRouter = Router();

// ============ AUTH ============
adminRouter.get("/nonce", adminGetNonce);
adminRouter.post("/login", adminLogin);

// ============ WORKER ROUTES ============
adminRouter.get("/workers", fetchWorkers);
adminRouter.get("/worker/:walletAddress", fetchWorkerByWallet);
adminRouter.post("/verify-worker/:walletAddress", verifyWorker);

// ============ COMPANY ROUTES ============
adminRouter.get("/companies", fetchCompanies);
adminRouter.get("/company/:walletAddress", fetchCompanyByWallet);
adminRouter.post("/verify-company/:walletAddress", verifyCompany);

// ============ DISPUTE ROUTES ============
// IMPORTANT: /history must come before /:jobId to avoid Express routing conflicts
adminRouter.get("/disputes/history", getDisputeHistory);
adminRouter.get("/disputes", adminGetDisputes);
adminRouter.post("/disputes/:jobId/resolve", adminResolveDispute);

export default adminRouter;
