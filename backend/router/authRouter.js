import { Router } from "express";
import { companySignin, getCurrentUser, logout, workerSignin } from "../controller/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const authRouter = Router();

authRouter.post("/company/signin", companySignin);
authRouter.post("/worker/signin", workerSignin);
authRouter.get("/me", authMiddleware, getCurrentUser)
authRouter.post("/logout", authMiddleware, logout);

export default authRouter;
