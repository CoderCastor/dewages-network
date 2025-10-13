import { Router } from "express"
import { adminLogin, fetchWorkerByWallet, fetchWorkers, verifyWorker } from "../controller/adminController.js";


const adminRouter = Router();

adminRouter.post("/login",adminLogin)
adminRouter.post("/verify-worker/:walletAddress",verifyWorker)
adminRouter.get("/workers",fetchWorkers)
adminRouter.get("/worker/:walletAddress",fetchWorkerByWallet)

export default adminRouter