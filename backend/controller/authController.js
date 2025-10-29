import { WorkerProfile } from "../model/workerModel.js";
import { CompanyProfile } from "../model/companyModel.js";
import { Connection, PublicKey } from "@solana/web3.js";
import jwt from "jsonwebtoken";
import nacl from "tweetnacl";
import { config } from "../config.js";

export const workerSignin = async (req, res) => {
  try {
    const { publicKey, signature } = req.body;

    // Validate inputs
    if (!publicKey || !signature) {
      return res.status(400).json({
        success: false,
        message: "Public key and signature are required",
      });
    }

    // Verify the message signature
    const message = new TextEncoder().encode("Signin into Dewages Network");

    try {
      const isValid = nacl.sign.detached.verify(
        message,
        new Uint8Array(signature.data),
        new PublicKey(publicKey).toBytes()
      );

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid signature",
        });
      }
    } catch (signatureError) {
      console.error("Signature verification error:", signatureError);
      return res.status(401).json({
        success: false,
        message: "Failed to validate signature",
      });
    }

    // Check if worker exists in database
    const existingWorker = await WorkerProfile.findOne({
      walletAddress: publicKey,
    });

    if (!existingWorker) {
      return res.status(404).json({
        success: false,
        message: "Account not found. Please sign up first.",
      });
    }

    // Check if account is active
    if (!existingWorker.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: existingWorker._id,
        walletAddress: publicKey,
        userType: "worker",
      },
      config.jwtSecret,
      { expiresIn: "7d" } // Token expires in 7 days
    );

    // Update last login time
    existingWorker.lastLoginAt = new Date();
    await existingWorker.save();

    console.log(`✓ Worker signed in: ${publicKey}`);

    return res.status(200).json({
      success: true,
      message: "Successfully signed in",
      token,
      user: {
        id: existingWorker._id,
        name: existingWorker.name,
        walletAddress: existingWorker.walletAddress,
        experienceLevel: existingWorker.experienceLevel,
        rating: existingWorker.rating,
        totalJobs: existingWorker.totalJobs,
        isVerified: existingWorker.isVerified,
        PDAAddress: existingWorker.PDAAddress,
      },
    });
  } catch (error) {
    console.error("Worker signin error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


export const companySignin = async (req, res) => {
  try {
    const { publicKey, signature } = req.body;

    // Validate inputs
    if (!publicKey || !signature) {
      return res.status(400).json({
        success: false,
        message: "Public key and signature are required",
      });
    }

    // Verify the message signature
    const message = new TextEncoder().encode("Signin into Dewages Network");

    try {
      const isValid = nacl.sign.detached.verify(
        message,
        new Uint8Array(signature.data),
        new PublicKey(publicKey).toBytes()
      );

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid signature",
        });
      }
    } catch (signatureError) {
      console.error("Signature verification error:", signatureError);
      return res.status(401).json({
        success: false,
        message: "Failed to validate signature",
      });
    }

    // Check if company exists in database
    const existingCompany = await CompanyProfile.findOne({
      walletAddress: publicKey,
    });

    if (!existingCompany) {
      return res.status(404).json({
        success: false,
        message: "Account not found. Please sign up first.",
      });
    }

    // Check if account is active
    if (!existingCompany.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: existingCompany._id,
        walletAddress: publicKey,
        userType: "company",
      },
      config.jwtSecret,
      { expiresIn: "7d" } // Token expires in 7 days
    );

    // Update last login time
    existingCompany.lastLoginAt = new Date();
    await existingCompany.save();

    console.log(`✓ Company signed in: ${publicKey}`);

    return res.status(200).json({
      success: true,
      message: "Successfully signed in",
      token,
      user: {
        id: existingCompany._id,
        companyName: existingCompany.companyName,
        walletAddress: existingCompany.walletAddress,
        companyType: existingCompany.companyType,
        totalJobsPosted: existingCompany.totalJobsPosted,
        rating: existingCompany.rating,
        isVerified: existingCompany.isVerified,
        PDAAddress: existingCompany.PDAAddress,
      },
    });
  } catch (error) {
    console.error("Company signin error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const { userId, userType } = req.user; // From auth middleware

    if (userType === "worker") {
      const worker = await WorkerProfile.findById(userId).select(
        "-documents"
      );

      if (!worker) {
        return res.status(404).json({
          success: false,
          message: "Worker not found",
        });
      }

      return res.status(200).json({
        success: true,
        user: worker,
        userType: "worker",
      });
    } else if (userType === "company") {
      const company = await CompanyProfile.findById(userId).select(
        "-documents"
      );

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Company not found",
        });
      }

      return res.status(200).json({
        success: true,
        user: company,
        userType: "company",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
    }
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    const { userId, userType } = req.user;
    console.log(`✓ ${userType} logged out: ${userId}`);

    return res.status(200).json({
      success: true,
      message: "Successfully logged out",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
