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

export { signupUser, verifyWorkerWallet };
