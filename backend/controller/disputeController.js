import { Job } from "../model/jobModel.js";
import { WorkerProfile } from "../model/workerModel.js";
import { CompanyProfile } from "../model/companyModel.js";
import { DisputeHistory } from "../model/disputeHistoryModel.js";
import { resolveDisputeOnChain, createDisputeOnChain } from "../services/disputeResolveService.js";

/**
 * POST /api/job/dispute/raise
 *
 * For COMPANY: the frontend already calls createDispute on-chain → passes disputePDA + txSignature
 * For WORKER:  the backend calls createDisputeOnChain (relayer signs as employer) → saves disputePDA
 */
export const raiseDispute = async (req, res) => {
  try {
    const {
      jobId, reason, disputePDA: frontendDisputePDA, txSignature: frontendTxSig, raisedBy,
      otpNotProvided, evidencePhotoUrl, evidenceGpsCoordinates,
    } = req.body;
    const userWallet = req.user.walletAddress;

    if (!jobId || !reason || !raisedBy) {
      return res.status(400).json({ success: false, message: "jobId, reason, and raisedBy are required" });
    }
    if (!["company", "worker"].includes(raisedBy)) {
      return res.status(400).json({ success: false, message: "raisedBy must be 'company' or 'worker'" });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    if (raisedBy === "company" && job.companyWallet !== userWallet) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (raisedBy === "worker" && job.assignedWorker !== userWallet) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // otpNotProvided disputes can be raised from in_progress (worker never got End OTP)
    const isOtpNotProvided = raisedBy === "worker" && otpNotProvided === true;
    const allowedStatuses = isOtpNotProvided
      ? ["in_progress"]
      : ["pending_verification"];

    if (!allowedStatuses.includes(job.status)) {
      const msg = isOtpNotProvided
        ? "This dispute type can only be raised when the job is in progress"
        : "Dispute can only be raised during the dispute period (after proof submission)";
      return res.status(400).json({ success: false, message: msg });
    }

    if (!isOtpNotProvided) {
      if (job.disputePeriod?.endsAt && new Date() > new Date(job.disputePeriod.endsAt)) {
        return res.status(400).json({ success: false, message: "Dispute period has expired" });
      }
      if (!job.disputePeriod?.isActive) {
        return res.status(400).json({ success: false, message: "Dispute period is not active yet" });
      }
    }

    if (job.status === "disputed" || job.dispute?.status) {
      return res.status(400).json({ success: false, message: "A dispute has already been raised for this job" });
    }
    if (!job.jobPDA) {
      return res.status(400).json({ success: false, message: "Job is missing on-chain PDA. Cannot create dispute." });
    }

    let disputePDA   = frontendDisputePDA  || null;
    let txSignature  = frontendTxSig       || null;

    // ── Worker-raised: backend creates the dispute account on-chain ──────────
    if (raisedBy === "worker") {
      try {
        console.log("[RaiseDispute] Worker raised dispute — calling createDisputeOnChain...");
        const onChainResult = await createDisputeOnChain({
          jobPDA: job.jobPDA,
          reason: reason.trim(),
        });
        disputePDA  = onChainResult.disputePDA;
        txSignature = onChainResult.txSignature;
        console.log("[RaiseDispute] ✅ On-chain dispute created:", disputePDA);
      } catch (chainErr) {
        console.error("[RaiseDispute] ❌ createDisputeOnChain failed:", chainErr.message);
        if (chainErr.logs) chainErr.logs.forEach(l => console.error("   >", l));
        return res.status(502).json({
          success: false,
          message: "Failed to create dispute on-chain. Dispute not raised.",
          error: chainErr.message,
          logs: chainErr.logs || [],
        });
      }
    }

    job.status = "disputed";
    job.dispute = {
      disputePDA,
      txSignature,
      reason: reason.trim(),
      raisedBy,
      raisedByWallet: userWallet,
      otpNotProvided: isOtpNotProvided,
      evidencePhotoUrl: evidencePhotoUrl || null,
      evidenceGpsCoordinates: evidenceGpsCoordinates || null,
      status: "open",
      createdAt: new Date(),
    };

    await job.save();

    return res.status(200).json({
      success: true,
      message: "Dispute raised successfully. Funds are frozen in escrow.",
      dispute: job.dispute,
    });
  } catch (error) {
    console.error("Error raising dispute:", error);
    return res.status(500).json({ success: false, message: "Failed to raise dispute", error: error.message });
  }
};


/**
 * GET /api/admin/disputes
 * Returns all active (unresolved) disputes, enriched with full context.
 */
export const adminGetDisputes = async (req, res) => {
  try {
    const disputes = await Job.find({ status: "disputed" })
      .sort({ "dispute.createdAt": -1 })
      .lean();

    const enriched = await Promise.all(
      disputes.map(async (job) => {
        const company = await CompanyProfile.findOne({ walletAddress: job.companyWallet })
          .select("companyName email phone rating ratingCount location")
          .lean();
        const worker = await WorkerProfile.findOne({ walletAddress: job.assignedWorker })
          .select("name email phone rating ratingCount completedJobs skills experienceLevel location")
          .lean();

        const companyJobs = await Job.find({ companyWallet: job.companyWallet })
          .select("title status paymentAmount assignedWorker workerName createdAt dispute")
          .sort({ createdAt: -1 }).limit(20).lean();

        const workerJobs = await Job.find({ assignedWorker: job.assignedWorker })
          .select("title status paymentAmount companyWallet companyName createdAt completedAt fundTransfer")
          .sort({ createdAt: -1 }).limit(20).lean();

        const companyRatingJobs = await Job.find({
          companyWallet: job.companyWallet,
          "workerRating.rating": { $exists: true },
        }).select("title workerName workerRating completedAt").sort({ completedAt: -1 }).limit(10).lean();

        const workerRatingJobs = await Job.find({
          assignedWorker: job.assignedWorker,
          "employerRating.rating": { $exists: true },
        }).select("title companyName employerRating completedAt").sort({ completedAt: -1 }).limit(10).lean();

        return {
          ...job,
          companyDetails: company,
          workerDetails: worker,
          companyJobHistory: companyJobs,
          workerJobHistory: workerJobs,
          companyRatingHistory: companyRatingJobs,
          workerRatingHistory: workerRatingJobs,
        };
      })
    );

    return res.status(200).json({ success: true, disputes: enriched });
  } catch (error) {
    console.error("Error fetching disputes:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch disputes", error: error.message });
  }
};

/**
 * GET /api/admin/disputes/history
 * All resolved disputes.
 */
export const getDisputeHistory = async (req, res) => {
  try {
    const history = await DisputeHistory.find()
      .sort({ resolvedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, history });
  } catch (error) {
    console.error("Error fetching dispute history:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch dispute history", error: error.message });
  }
};

/**
 * POST /api/admin/disputes/:jobId/resolve
 *
 * 1. Calls resolveDispute on Solana (relayer/admin keypair signs)
 * 2. Updates Job document in MongoDB
 * 3. Saves a DisputeHistory record
 * 4. Updates worker profile stats (if favor_worker or split)
 *
 * Body: { resolution: "favor_worker"|"favor_employer"|"split", notes?: string }
 */
export const adminResolveDispute = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { resolution, notes } = req.body;

    const validResolutions = ["favor_worker", "favor_employer", "split"];
    if (!resolution || !validResolutions.includes(resolution)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resolution. Must be favor_worker, favor_employer, or split",
      });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    if (job.status !== "disputed") {
      return res.status(400).json({ success: false, message: "Job is not in disputed state" });
    }
    if (!job.jobPDA || !job.escrowPDA) {
      return res.status(400).json({ success: false, message: "Job is missing on-chain PDA addresses. Cannot proceed." });
    }
    if (!job.assignedWorker || !job.companyWallet) {
      return res.status(400).json({ success: false, message: "Job is missing worker or company wallet. Cannot proceed." });
    }

    // ── STEP 1: Ensure dispute account exists on-chain ───────────────────────
    // For disputes raised by workers before this fix, or any case where
    // the dispute account was not yet created on-chain, create it now.
    let resolveDisputePDA = job.dispute?.disputePDA || null;

    if (!resolveDisputePDA) {
      console.log("[Dispute] No disputePDA in DB — creating dispute account on-chain first...");
      try {
        const createResult = await createDisputeOnChain({
          jobPDA:  job.jobPDA,
          reason:  job.dispute?.reason || "Admin-initiated dispute creation",
        });
        resolveDisputePDA = createResult.disputePDA;
        // Save PDA to DB so future attempts don't re-create
        job.dispute.disputePDA  = resolveDisputePDA;
        job.dispute.txSignature = createResult.txSignature;
        await job.save();
        console.log("[Dispute] ✅ Dispute account created on-chain:", resolveDisputePDA);
      } catch (createErr) {
        console.error("❌ [Dispute] createDisputeOnChain FAILED:", createErr.message);
        if (createErr.logs) createErr.logs.forEach(l => console.error("   >", l));
        return res.status(502).json({
          success: false,
          message: "Failed to initialize dispute account on-chain. No changes made.",
          error:   createErr.message,
          logs:    createErr.logs || [],
        });
      }
    }

    // ── STEP 2: Resolve on-chain — abort everything if this fails ────────────
    let txSignature;
    try {
      console.log("[Dispute] Calling resolveDisputeOnChain...");
      const result = await resolveDisputeOnChain({
        jobPDA:          job.jobPDA,
        escrowPDA:       job.escrowPDA,
        workerWallet:    job.assignedWorker,
        employerWallet:  job.companyWallet,
        disputePDA:      resolveDisputePDA,
        resolution,
        resolutionNotes: notes || resolution,
      });
      txSignature = result.txSignature;
      console.log("✅ [Dispute] On-chain resolveDispute succeeded:", txSignature);
    } catch (chainErr) {
      console.error("❌ [Dispute] On-chain resolveDispute FAILED:", chainErr.message);
      if (chainErr.logs) chainErr.logs.forEach(l => console.error("   >", l));
      // Hard stop — do NOT touch the database
      return res.status(502).json({
        success: false,
        message: "On-chain transaction failed. No database changes were made.",
        error: chainErr.message,
        logs: chainErr.logs || [],
      });
    }

    // ── STEP 2: On-chain confirmed — now update DB ───────────────────────────
    const dbStatus =
      resolution === "favor_worker"   ? "resolved_for_worker"   :
      resolution === "favor_employer" ? "resolved_for_employer" :
      "resolved_for_worker"; // split

    job.dispute.status     = dbStatus;
    job.dispute.resolvedAt = new Date();
    job.dispute.resolution = notes || resolution;
    job.status             = "completed";
    job.completedAt        = new Date();
    job.fundTransfer = {
      isTransferred:        true,
      transferredAt:        new Date(),
      transactionSignature: txSignature,
      amount:               job.paymentAmount,
    };
    await job.save();
    console.log("✅ [Dispute] Job updated in DB");

    // ── STEP 3: Save DisputeHistory audit record ─────────────────────────────
    try {
      await DisputeHistory.create({
        jobId:           job._id,
        jobPDA:          job.jobPDA,
        jobTitle:        job.title,
        resolution,
        resolutionNotes: notes || resolution,
        txSignature,
        onChainSuccess:  true,
        resolvedAt:      new Date(),
        dispute: {
          reason:         job.dispute.reason,
          raisedBy:       job.dispute.raisedBy,
          raisedByWallet: job.dispute.raisedByWallet,
          createdAt:      job.dispute.createdAt,
          disputePDA:     job.dispute.disputePDA,
        },
        companyWallet:  job.companyWallet,
        companyName:    job.companyName,
        workerWallet:   job.assignedWorker,
        workerName:     job.workerName,
        paymentAmount:  job.paymentAmount,
      });
    } catch (histErr) {
      // Non-critical — log but don't fail the request
      console.error("⚠️  Failed to save DisputeHistory:", histErr.message);
    }

    // ── STEP 4: Update worker profile stats ──────────────────────────────────
    if (resolution === "favor_worker" || resolution === "split") {
      try {
        const workerProfile = await WorkerProfile.findOne({ walletAddress: job.assignedWorker });
        if (workerProfile) {
          workerProfile.totalJobs     = (workerProfile.totalJobs || 0) + 1;
          workerProfile.completedJobs = (workerProfile.completedJobs || 0) + 1;
          const earnedAmount = resolution === "split"
            ? Math.floor(job.paymentAmount / 2)
            : job.paymentAmount;
          workerProfile.totalEarnings = (workerProfile.totalEarnings || 0) + earnedAmount;
          await workerProfile.save();
        }
      } catch (e) {
        console.error("⚠️  Worker profile update failed:", e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Dispute resolved successfully — on-chain and in database",
      onChainSuccess: true,
      txSignature,
      resolution: dbStatus,
      job: { _id: job._id, status: job.status, dispute: job.dispute },
    });
  } catch (error) {
    console.error("Error resolving dispute:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve dispute",
      error: error.message,
    });
  }
};


