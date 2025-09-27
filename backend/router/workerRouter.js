
import { Router } from "express"
import { signupUser, verifyWorkerWallet } from "../controller/workerController.js";

const workerRouter = Router();

workerRouter.post("/signup",signupUser)
workerRouter.post("/walletverify",verifyWorkerWallet)
export default workerRouter