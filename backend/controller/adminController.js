import { config } from "../config.js";
import jwt from "jsonwebtoken";
import { WorkerProfile } from "../model/workerModel.js";
import { CompanyProfile } from "../model/companyModel.js";

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

// ============ WORKER ENDPOINTS ============

export async function fetchWorkers(req, res) {
  try {
    const workers = await WorkerProfile.find();

    res.json({
      workers,
    });
  } catch (err) {
    console.error("Error fetching workers:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function fetchWorkerByWallet(req, res) {
  try {
    const { walletAddress } = req.params;

    const worker = await WorkerProfile.findOne({ walletAddress });

    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    res.json({
      worker,
    });
  } catch (err) {
    console.error("Error fetching worker:", err);
    res.status(500).json({ error: "Internal server error" });
  }
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

// ============ COMPANY ENDPOINTS ============

export async function fetchCompanies(req, res) {
  try {
    const companies = await CompanyProfile.find();

    res.json({
      companies,
    });
  } catch (err) {
    console.error("Error fetching companies:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function fetchCompanyByWallet(req, res) {
  try {
    const { walletAddress } = req.params;

    const company = await CompanyProfile.findOne({ walletAddress });

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({
      company,
    });
  } catch (err) {
    console.error("Error fetching company:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function verifyCompany(req, res) {
  try {
    const { walletAddress } = req.params;
    const { PDAAddress, isVerified } = req.body;

    const company = await CompanyProfile.findOne({ walletAddress });

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    if (PDAAddress) {
      company.PDAAddress = PDAAddress;
    }

    if (isVerified !== undefined) {
      company.isVerified = isVerified;
    }

    await company.save();

    res.status(200).json({
      success: true,
      company,
    });
  } catch (err) {
    console.error("Error verifying company:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
