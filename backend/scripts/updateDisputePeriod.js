import mongoose from "mongoose";
import {Job} from "../model/jobModel.js";
import { config } from "../config.js";

const MONGODB_URI = config.databaseUrl;

async function updateDisputePeriodTo10Seconds() {
  try {
    // await mongoose.connect("mongodb://localhost:27017/dewages-network-db");
    await mongoose.connect(config.databaseUrl);
    console.log("✅ Connected to MongoDB");

    // Find jobs with active dispute periods
    const jobsWithDispute = await Job.find({
      "disputePeriod.isActive": true,
      "disputePeriod.isExpired": false,
    });

    console.log(`📊 Found ${jobsWithDispute.length} jobs with active dispute periods`);

    let updatedCount = 0;

    for (const job of jobsWithDispute) {
      const now = new Date();
      const endsAt = new Date(now.getTime() + 20 * 1000); // 10 seconds from now

      job.disputePeriod.startedAt = now;
      job.disputePeriod.endsAt = endsAt;
      job.disputePeriod.isActive = true;
      job.disputePeriod.isExpired = false;

      await job.save();
      updatedCount++;

      console.log(`✅ Updated job: ${job._id} | Title: ${job.title}`);
      console.log(`   Dispute ends at: ${endsAt.toLocaleString()}`);
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} jobs`);
    console.log(`⏰ All dispute periods now end in 10 seconds from now`);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

updateDisputePeriodTo10Seconds();
