// Run this migration script once

import mongoose from "mongoose";
import {Job} from "../model/jobModel.js";
import { config } from "../config.js";

async function migrateJobSchema() {
  try {
    await mongoose.connect(config.databaseUrl);

    console.log("🔄 Migrating job schema...");

    // Find all jobs with old schema
    const result = await Job.updateMany(
      {
        // Jobs with old schema (has s3Urls)
        "proofOfWork.s3Urls": { $exists: true }
      },
      {
        $unset: { "proofOfWork.s3Urls": "" }, // Remove old field
        $set: {
          "proofOfWork.accountAddress": null,
          "proofOfWork.txSignature": null,
          "proofOfWork.proofType": null,
          "proofOfWork.proofData": null,
          "proofOfWork.submittedAt": null,
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} jobs`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

migrateJobSchema();
