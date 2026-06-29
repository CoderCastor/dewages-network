import { CompanyProfile } from "../model/companyModel.js";
import { Connection, PublicKey } from "@solana/web3.js";
import jwt from "jsonwebtoken";
import nacl from "tweetnacl";
import { config } from "../config.js";
import { z } from "zod";

// Validation Schema
const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;

const CompanySignupSchema = z.object({
  walletAddress: z.string().min(32, "Invalid wallet address"),
  companyName: z.string().min(1, "Company name is required"),
  companyType: z.enum(["individual", "small_business", "medium_business", "large_enterprise"]),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  phone: z.string().regex(phoneRegex, "Invalid phone format"),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string(),
  description: z.string().max(500).optional(),
  location: z.object({
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    country: z.string().default("India"),
    coordinates: z.array(z.number()).length(2).default([0, 0]),
  }),
  interestedCategories: z.array(
    z.enum([
      "construction",
      "plumbing",
      "electrical",
      "carpentry",
      "painting",
      "delivery",
      "driving",
      "domestic_help",
      "cooking",
      "event_staffing",
      "agriculture",
      "cleaning",
      "security",
      "other",
    ])
  ).min(1, "Select at least one category"),
  contactPerson: z.object({
    name: z.string().min(1, "Contact name is required"),
    designation: z.string().min(1, "Designation is required"),
    phone: z.string().regex(phoneRegex, "Invalid phone format"),
    email: z.string().email().optional().or(z.literal("")),
  }),
  socialProfiles: z.object({
    linkedin: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional(),
  }).optional(),
});

// Wallet verification (similar to worker)
const verifyCompanyWallet = async (req, res) => {
  const { publicKey, signature } = req.body;

  console.log("[Company Verify] Received publicKey:", publicKey);
  console.log("[Company Verify] Received signature:", signature);

  // Validate public key format
  const walletSchema = z.object({
    pubkey: z.string().min(32),
  });

  const Zresult = walletSchema.safeParse({ pubkey: publicKey });

  if (!Zresult.success) {
    console.log("[Company Verify] Validation failed:", Zresult.error);
    return res.status(400).json({
      message: "Invalid wallet address",
      errors: Zresult.error.format(),
    });
  }

  const message = new TextEncoder().encode("Signup into Dewages Network");
  console.log("[Company Verify] Message to verify:", message);

  try {
    // Verify signature
    console.log("[Company Verify] Starting signature verification...");
    const result = nacl.sign.detached.verify(
      message,
      new Uint8Array(signature),
      new PublicKey(publicKey).toBytes()
    );

    console.log("[Company Verify] Signature verification result:", result);

    if (!result) {
      console.log("[Company Verify] Signature verification failed - incorrect signature");
      return res.status(411).json({
        message: "Incorrect signature",
      });
    }

    console.log("[Company Verify] Signature verified successfully, checking database...");

    // Check if company already exists
    const existingCompany = await CompanyProfile.findOne({
      walletAddress: publicKey,
    });

    console.log("[Company Verify] Existing company:", existingCompany);

    if (existingCompany) {
      if (existingCompany.isActive) {
        console.log("[Company Verify] Company already active");
        return res.json({
          message: "Company already exists with this wallet.",
          code: 403,
        });
      } else {
        // Existing but inactive
        console.log("[Company Verify] Company exists but inactive, generating token");
        const token = jwt.sign(
          {
            companyId: existingCompany._id,
            publicKey,
          },
          config.jwtSecret
        );
        return res.json({ token });
      }
    } else {
      // No company exists -> create one
      console.log("[Company Verify] Creating new company profile");
      const newCompany = await CompanyProfile.create({
        walletAddress: publicKey,
      });

      console.log("[Company Verify] New company created:", newCompany._id);

      const token = jwt.sign(
        {
          companyId: newCompany._id,
          publicKey,
        },
        config.jwtSecret
      );

      return res.json({ token });
    }
  } catch (e) {
    console.error("[Company Verify] Error:", e);
    return res.status(411).json({
      message: "Failed to validate signature",
      error: e.message,
    });
  }
};

// Company signup
const signupCompany = async (req, res) => {
  const body = req.body;

  // Validate input
  const parsedBody = CompanySignupSchema.safeParse(body.formData);
  console.log(parsedBody)

  // if (!parsedBody.success) {
  //   console.log("Validation errors:", parsedBody.error.errors);

  //   const formattedErrors = parsedBody.error.errors?.map((err) => ({
  //     field: err.path?.join(".") || "unknown",
  //     message: err.message,
  //     received: err.received || "unknown",
  //   })) || [];

  //   return res.status(400).json({
  //     message: "Invalid input",
  //     errors: formattedErrors,
  //     totalErrors: formattedErrors.length,
  //   });
  // }

  try {
    // Check if company already exists
    const existingCompany = await CompanyProfile.findOne({
      walletAddress: parsedBody.data.walletAddress,
    });
    console.log(existingCompany);

    if (existingCompany) {
      if (existingCompany.isActive) {
        return res.status(403).json({
          message: "Company already exists with this wallet.",
          code: 403,
        });
      }
      
      // Update existing inactive company
      const emailVerified = body.emailVerified === true;
      const { verificationStatus: _vs, ...companyData } = parsedBody.data;
      const updatedCompany = await CompanyProfile.updateOne(
        { walletAddress: parsedBody.data.walletAddress },
        { $set: { ...companyData, isActive: true, "verificationStatus.email": emailVerified } }
      );

      console.log(parsedBody.data)

      console.log("Company profile updated successfully");

      return res.status(201).json({
        message: "Company profile created successfully",
        companyId: existingCompany._id,
      });
    }

    // Create new company
    const emailVerified = body.emailVerified === true;
    const createdCompany = await CompanyProfile.create({
      ...parsedBody.data,
      verificationStatus: { email: emailVerified },
    });
    console.log("Company profile created successfully:", createdCompany._id);

    return res.status(201).json({
      message: "Company profile created successfully",
      companyId: createdCompany._id,
    });
  } catch (e) {
    console.error("Database error:", e);

    // Handle duplicate key errors
    if (e.code === 11000) {
      return res.status(409).json({
        message: "Company with this wallet address already exists",
        error: "DUPLICATE_WALLET_ADDRESS",
      });
    }

    return res.status(500).json({
      message: "Failed to create company profile",
      error: e.message,
    });
  }
};

// Get company profile
const getCompanyProfile = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const company = await CompanyProfile.findOne({ walletAddress });

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
      });
    }

    return res.status(200).json({
      success: true,
      company,
    });
  } catch (error) {
    console.error("Error fetching company:", error);
    return res.status(500).json({
      message: "Failed to fetch company profile",
      error: error.message,
    });
  }
};

// Update company profile
const updateCompanyProfile = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const updateData = req.body;

    const updatedCompany = await CompanyProfile.findOneAndUpdate(
      { walletAddress },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedCompany) {
      return res.status(404).json({
        message: "Company not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Company profile updated successfully",
      company: updatedCompany,
    });
  } catch (error) {
    console.error("Error updating company:", error);
    return res.status(500).json({
      message: "Failed to update company profile",
      error: error.message,
    });
  }
};

export const uploadCompanyDocument = async (req, res) => {
  try {
    const walletAddress = req.user?.walletAddress;
    if (!walletAddress) return res.status(401).json({ message: "Unauthorized" });

    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { docType } = req.body;
    const validTypes = ["company_registration", "gst_certificate", "address_proof", "identity_proof"];
    if (!docType || !validTypes.includes(docType)) {
      return res.status(400).json({ message: "Invalid document type" });
    }

    const { uploadCompanyDocument: uploadToS3 } = await import("../services/s3UploadService.js");
    const s3Url = await uploadToS3(req.file.buffer, req.file.mimetype, walletAddress, req.file.originalname);

    await CompanyProfile.findOneAndUpdate(
      { walletAddress },
      {
        $push: {
          documents: {
            type: docType,
            s3Url,
            fileName: req.file.originalname,
            uploadedAt: new Date(),
          },
        },
      }
    );

    return res.status(200).json({ success: true, message: "Document uploaded successfully", s3Url });
  } catch (error) {
    console.error("Document upload error:", error);
    return res.status(500).json({ message: "Failed to upload document", error: error.message });
  }
};

export {
  verifyCompanyWallet,
  signupCompany,
  getCompanyProfile, 
  updateCompanyProfile 
};