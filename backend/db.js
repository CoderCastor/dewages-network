import mongoose from "mongoose";
import { config } from "./config.js";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("Connected to database successfully");
    });

    mongoose.connection.on("error", (err) => {
      console.log("Error while connecting to database.", err);
    });

    await mongoose.connect(config.databaseUrl);
  } catch (err) {
    console.error("Failed to connect to database.", err);
    process.exit(1);
  }
};

export default connectDB;
