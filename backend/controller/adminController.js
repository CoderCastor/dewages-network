import { config } from "../config.js";
import jwt from "jsonwebtoken";
import { WorkerProfile } from "../model/workerModel.js";

export function adminLogin(req, res) {
  if (req.body.username == "codercastor" && req.body.password == "12345") {
    const token = jwt.sign(
      {
        userId: 12345,
        role: "admin",
      },
      config.jwtSecret
    );

    res.status(200).json({
      token,
    });
    return;
  }

  res.status(200).json({
    error: "wrong username and password",
  });
}




export async function fetchWorkers(req, res) {
  const workers = await WorkerProfile.find();

  res.json({
    workers,
  });
}

export async function fetchWorkerByWallet(req, res) {
  const { walletAddress } = req.params;

  const worker = await WorkerProfile.findOne({ walletAddress });

  res.json({
    worker,
  });
}

export async function verifyWorker(req, res) {
  try {
    const { walletAddress } = req.params;
    const { PDAAddress, isVerified } = req.body;

    const worker = await WorkerProfile.findOne({ walletAddress });

    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    if (PDAAddress) {
      worker.PDAAddress = PDAAddress;
    }

    if (isVerified !== undefined) {
      worker.isVerified = isVerified;
    }

    await worker.save();

    res.status(200).json({
      success: true,
      worker,
    });
  } catch (err) {
    console.error("Error verifying worker:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}