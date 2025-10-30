import mongoose from "mongoose";
import {Job} from "../model/jobModel.js"; // Adjust path to your model
import { config } from "../config.js";

const MONGODB_URI = config.databaseUrl; // Replace with your MongoDB URI

async function deleteJobsExceptGG() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Count total jobs before deletion
    const totalBefore = await Job.countDocuments();
    console.log(`📊 Total jobs before: ${totalBefore}`);

    // Count "gg" jobs (to preserve)
    const ggJobsCount = await Job.countDocuments({ title: "gg" });
    console.log(`🔒 Jobs with title "gg" (will be preserved): ${ggJobsCount}`);

    // Delete all jobs EXCEPT those with title "gg"
    const result = await Job.deleteMany({
      title: { $ne: "gg" } // $ne = "not equal"
    });

    console.log(`🗑️  Deleted ${result.deletedCount} jobs`);

    // Count remaining jobs
    const totalAfter = await Job.countDocuments();
    console.log(`📊 Total jobs after: ${totalAfter}`);

    // Verify "gg" jobs are still there
    const ggJobsAfter = await Job.countDocuments({ title: "gg" });
    console.log(`✅ "gg" jobs remaining: ${ggJobsAfter}`);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

// Run the script
deleteJobsExceptGG();
