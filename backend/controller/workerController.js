import { WorkerProfile } from "../model/workerModel.js";
import {
  CreateWorkerProfileSchema,
  WorkerProfileSchema,
} from "../schemas/userSchemas.js";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import jwt from "jsonwebtoken";
import nacl from "tweetnacl";
import { config } from "../config.js";
import { walletSchema } from "../schemas/cryptoSchema.js";
import axios from "axios";

const verifyWorkerWallet = async (req, res) => {
  const { publicKey, signature } = req.body;
  console.log("📥 [Worker Verify] Received request:", { publicKey, hasSignature: !!signature });

  const Zresult = walletSchema.safeParse({
    pubkey: publicKey,
  });

  if (!Zresult.success) {
    console.warn("⚠️ [Worker Verify] Zod validation failed:", Zresult.error.format());
    return res.status(400).json({
      success: false,
      message: "Invalid wallet address structure",
      errors: Zresult.error.format(),
    });
  }

  const message = new TextEncoder().encode("Signup into Dewages Network");

  try {
    const result = nacl.sign.detached.verify(
      message,
      new Uint8Array(signature),
      new PublicKey(publicKey).toBytes()
    );

    console.log("ℹ️ [Worker Verify] nacl signature check:", result);

    if (!result) {
      console.warn("❌ [Worker Verify] Signature verification failed (incorrect signature)");
      return res.status(411).json({
        success: false,
        message: "Incorrect signature",
      });
    }
  } catch (e) {
    console.error("🔥 [Worker Verify] Error verifying signature:", e);
    return res.status(411).json({
      success: false,
      message: "Failed to validate signature",
      error: e.message,
    });
  }

  const existingUser = await WorkerProfile.findOne({
    walletAddress: publicKey,
  });

  if (existingUser) {
    if (existingUser.isActive) {
      console.log("checking active true");
      res.json({
        message: "User Already exist with this wallet.",
        code: 403,
      });
      console.log("user existed");
      return;
    } else {
      // existing but inactive
      console.log("checking active false");
      const token = jwt.sign(
        {
          userId: existingUser.id,
          publicKey,
        },
        config.jwtSecret
      );
      res.json({ token });
      return;
    }
  } else {
    // No user exists -> create one
    const newUser = await WorkerProfile.create({
      walletAddress: publicKey,
    });

    const token = jwt.sign(
      {
        userId: newUser.id,
        publicKey,
      },
      config.jwtSecret
    );

    res.json({ token });
    return;
  }
};

const signupUser = async (req, res) => {
  const body = req.body;
  // console.log('Received body:', JSON.stringify(body, null, 2));

  // Use CreateWorkerProfileSchema instead of WorkerProfileSchema
  const parsedBody = CreateWorkerProfileSchema.safeParse(body.formData);
  console.log(body.token);

  if (!parsedBody.success) {
    console.log("Validation errors:", parsedBody.error.errors);

    const formattedErrors =
      parsedBody.error.errors?.map((err) => ({
        field: err.path?.join(".") || "unknown",
        message: err.message,
        received: err.received || "unknown",
      })) || [];

    return res.status(400).json({
      message: "Invalid input",
      errors: formattedErrors,
      totalErrors: formattedErrors.length,
    });
  }

  try {
    const existingWorker = await WorkerProfile.findOne({
      walletAddress: parsedBody.data.walletAddress,
    });

    if (existingWorker) {
      if (existingWorker.isActive) {
        console.log("checking active true");
        res.json({
          message: "User Already exist with this wallet.",
          code: 403,
        });
        console.log("user existed");
        return;
      } 
    }

    const createdWorker = await WorkerProfile.updateOne({ walletAddress : parsedBody.data.walletAddress },{$set : parsedBody.data});
    console.log("Worker profile created successfully:", createdWorker._id);

    return res.status(201).json({
      message: "Worker profile created successfully",
      workerId: createdWorker._id,
    });
  } catch (e) {
    console.error("Database error:", e);

    // Handle duplicate key errors specifically
    if (e.code === 11000) {
      return res.status(409).json({
        message: "Worker with this wallet address already exists",
        error: "DUPLICATE_WALLET_ADDRESS",
      });
    }

    return res.status(500).json({
      message: "Failed to create worker profile",
      error: e.message,
    });
  }

  
};


const verifyPAN = async (req, res) => {
  const { pan, name_as_per_pan, date_of_birth, walletAddress } = req.body;

  // --- Input validation ---
  if (!pan || !name_as_per_pan || !date_of_birth || !walletAddress) {
    return res.status(400).json({
      message: "pan, name_as_per_pan, date_of_birth and walletAddress are required",
    });
  }

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(pan.toUpperCase())) {
    return res.status(400).json({ message: "Invalid PAN format. Expected format: ABCDE1234F" });
  }

  // Check required env vars are set
  if (!process.env.SANDBOX_API_KEY || !process.env.SANDBOX_API_SECRET || !process.env.SANDBOX_HOST) {
    console.error("Sandbox API credentials are not configured in .env");
    return res.status(500).json({ message: "PAN verification service is not configured" });
  }

  try {
    // --- Step 1: Authenticate with Sandbox to get access_token ---
    const authResponse = await axios.post(
      `${process.env.SANDBOX_HOST}/authenticate`,
      {},
      {
        headers: {
          "x-api-key":    process.env.SANDBOX_API_KEY,
          "x-api-secret": process.env.SANDBOX_API_SECRET,
          "x-api-version": process.env.API_VERSION || "1.0",
        },
      }
    );

    const accessToken = authResponse.data?.data?.access_token;
    if (!accessToken) {
      return res.status(502).json({ message: "Failed to authenticate with KYC provider" });
    }

    // --- Step 2: Call PAN KYC verification endpoint ---
    const panPayload = {
      "@entity": "in.co.sandbox.kyc.pan_verification.request",
      pan: pan.toUpperCase(),
      name_as_per_pan,
      date_of_birth, // expected in DD/MM/YYYY
      consent: "Y",
      reason: "For onboarding worker on Dewages Network",
    };

    const panResponse = await axios.post(
      `${process.env.SANDBOX_HOST}/kyc/pan/verify`,
      panPayload,
      {
        headers: {
          authorization:    accessToken,
          "x-api-key":      process.env.SANDBOX_API_KEY,
          "x-accept-cache": "true",
          "Content-Type":   "application/json",
        },
      }
    );

    const panData = panResponse.data?.data;

    // --- Step 3: Save verified PAN details to DB ---
    await WorkerProfile.updateOne(
      { walletAddress },
      {
        $set: {
          "panDetails.panNumber":    pan.toUpperCase(),
          "panDetails.nameAsPerPan": name_as_per_pan,
          "panDetails.dateOfBirth":  date_of_birth,
          "panDetails.verifiedAt":   new Date(),
          "panDetails.isVerified":   true,
          "verificationStatus.identity": true, // flip the existing identity flag
        },
      }
    );

    return res.status(200).json({
      message: "PAN verified successfully",
      data: panData,
    });
  } catch (err) {
    const errData = err.response?.data;
    const status  = err.response?.status || 500;
    console.error("PAN verification error:", errData || err.message);
    return res.status(status).json({
      message: errData?.message || "PAN verification failed",
      error: errData || err.message,
    });
  }
};

export { signupUser, verifyWorkerWallet, verifyPAN };
