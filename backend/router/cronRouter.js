import express from "express";
import { runDisbursement } from "../controller/cronController.js";

const cronRouter = express.Router();

/**
 * Simple secret-based auth for cron jobs.
 * Set CRON_SECRET in your .env file.
 * Apps Script sends it as ?secret=YOUR_SECRET
 */
cronRouter.use((req, res, next) => {
  const secret = req.query.secret || req.headers["x-cron-secret"];
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    // If CRON_SECRET not set, allow all (dev mode)
    return next();
  }

  if (secret !== expectedSecret) {
    return res.status(403).json({ success: false, error: "Invalid cron secret" });
  }

  next();
});

// POST /cron/disburse-funds?secret=YOUR_SECRET
cronRouter.post("/disburse-funds", runDisbursement);

// GET  /cron/disburse-funds?secret=YOUR_SECRET (Apps Script convenience)
cronRouter.get("/disburse-funds", runDisbursement);

export default cronRouter;
