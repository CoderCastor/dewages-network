import { config } from "../config.js";
import jwt from "jsonwebtoken";
import { WorkerProfile } from "../model/workerModel.js";
import { CompanyProfile } from "../model/companyModel.js";
import nacl from "tweetnacl";
import bs58 from "bs58";


// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  TEMP: swapped to local dev key for testing — revert to 5h54tPqd4ZbjTLF74SKVTCKmzRrnhP9tFqPcrHjxcfhQ before final review
const ADMIN_WALLET = "5h54tPqd4ZbjTLF74SKVTCKmzRrnhP9tFqPcrHjxcfhQ";

// In-memory nonce store (single admin – no DB needed)
// nonce expires in 2 minutes
const nonceStore = { value: null, expiresAt: 0 };

/**
 * GET /api/admin/nonce
 * Returns a fresh nonce for the admin to sign.
 */
export function adminGetNonce(req, res) {
  const nonce = `dewages-admin-login:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  nonceStore.value     = nonce;
  nonceStore.expiresAt = Date.now() + 2 * 60 * 1000; // 2 min TTL
  return res.status(200).json({ success: true, nonce });
}

/**
 * POST /api/admin/login
 * Body: { walletAddress: string, signature: number[] | Uint8Array }
 *
 * Flow:
 *  1. walletAddress must be the admin wallet
 *  2. Verifies the Ed25519 signature of the nonce using nacl
 *  3. Issues a JWT containing walletAddress
 */
export function adminLogin(req, res) {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({ success: false, message: "walletAddress and signature are required" });
    }

    // 1. Check this is the admin wallet
    if (walletAddress !== ADMIN_WALLET) {
      return res.status(403).json({ success: false, message: "Unauthorized wallet address" });
    }

    // 2. Check nonce is still valid
    if (!nonceStore.value || Date.now() > nonceStore.expiresAt) {
      return res.status(400).json({ success: false, message: "Nonce expired or not requested. Call GET /admin/nonce first." });
    }

    // 3. Verify Ed25519 signature
    const messageBytes = new TextEncoder().encode(nonceStore.value);
    const sigBytes     = new Uint8Array(signature);
    const pubkeyBytes  = bs58.decode(walletAddress);

    const valid = nacl.sign.detached.verify(messageBytes, sigBytes, pubkeyBytes);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    // 4. Invalidate nonce (one-time use)
    nonceStore.value = null;

    // 5. Issue JWT
    const token = jwt.sign(
      { walletAddress, role: "admin" },
      config.jwtSecret,
      { expiresIn: "12h" }
    );

    return res.status(200).json({ success: true, token, walletAddress });
  } catch (err) {
    console.error("[AdminLogin] Error:", err);
    return res.status(500).json({ success: false, message: "Login failed", error: err.message });
  }
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

export async function runValidation(req, res) {
  try {
    const { walletAddress } = req.params;
    const { type } = req.query; // "worker" or "company"

    const checks = { emailVerified: false, panVerified: false, panDuplicate: false, underAge: false };

    if (type === "worker") {
      const worker = await WorkerProfile.findOne({ walletAddress });
      if (!worker) return res.status(404).json({ error: "Worker not found" });

      checks.emailVerified = !!worker.verificationStatus?.email;
      checks.panVerified = !!worker.panDetails?.isVerified;

      if (worker.panDetails?.panNumber) {
        const count = await WorkerProfile.countDocuments({
          "panDetails.panNumber": worker.panDetails.panNumber,
          walletAddress: { $ne: walletAddress },
        });
        checks.panDuplicate = count > 0;
      }

      // Age check from stored DOB (DD/MM/YYYY)
      if (worker.panDetails?.dateOfBirth) {
        const [dd, mm, yyyy] = worker.panDetails.dateOfBirth.split("/");
        const dob = new Date(`${yyyy}-${mm}-${dd}`);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear() -
          (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
        checks.underAge = age < 18;
      }
    } else {
      const company = await CompanyProfile.findOne({ walletAddress });
      if (!company) return res.status(404).json({ error: "Company not found" });
      checks.emailVerified = !!company.verificationStatus?.email;
      checks.panVerified = true; // companies don't use PAN
    }

    const isValid = checks.emailVerified && checks.panVerified && !checks.panDuplicate && !checks.underAge;

    res.json({ success: true, isValid, checks });
  } catch (err) {
    console.error("Run validation error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
