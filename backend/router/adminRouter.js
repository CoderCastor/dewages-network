import { Router } from "express";
import {
  adminLogin,
  // Worker endpoints
  fetchWorkerByWallet,
  fetchWorkers,
  verifyWorker,
  // Company endpoints
  fetchCompanies,
  fetchCompanyByWallet,
  verifyCompany,
} from "../controller/adminController.js";

const adminRouter = Router();

// ============ AUTH ============
adminRouter.post("/login", adminLogin);

// ============ WORKER ROUTES ============
adminRouter.get("/workers", fetchWorkers);
adminRouter.get("/worker/:walletAddress", fetchWorkerByWallet);
adminRouter.post("/verify-worker/:walletAddress", verifyWorker);

// ============ COMPANY ROUTES ============
adminRouter.get("/companies", fetchCompanies);
adminRouter.get("/company/:walletAddress", fetchCompanyByWallet);
adminRouter.post("/verify-company/:walletAddress", verifyCompany);

export default adminRouter;
