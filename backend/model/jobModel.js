import mongoose from "mongoose";

// ============================================================================
// Job Schema (Off-chain data + on-chain reference)
// ============================================================================

const jobSchema = new mongoose.Schema(
  {
    // Blockchain reference
    jobPDA: { type: String, required: true, unique: true, index: true },
    escrowPDA: { type: String, required: true },
    transactionSignature: { type: String, required: true },

    // Company Info - FIXED: Changed ref from "User" to "CompanyProfile"
    companyWallet: {
      type: String,
      required: true,
      ref: "CompanyProfile",
      index: true,
    },

    // Start Job OTP
    startJobOTP: {
      code: { type: String },
      generatedAt: { type: Date },
      expiresAt: { type: Date },
      isUsed: { type: Boolean, default: false },
      usedAt: { type: Date },
      photoUrl: { type: String, default: null },
      gpsCoordinates: { type: String, default: null },
    },

      proofOfWork: {
      accountAddress: { type: String },      // ✅ Blockchain account address
      txSignature: { type: String },         // ✅ Transaction signature
      proofType: { type: String },           // ✅ "OTP", "PHOTO_OTP", etc.
      proofData: { type: String },           // ✅ JSON bundle / proof description
      photoUrl: { type: String, default: null },        // ✅ S3 URL of proof photo
      gpsCoordinates: { type: String, default: null },  // ✅ "lat,lng" from browser geolocation
      submittedAt: { type: Date },           // ✅ Submission timestamp
      isVerified: { type: Boolean, default: false }, // ✅ Verification status
    },

    // End Job OTP (Completion OTP)
    endJobOTP: {
      code: { type: String },
      generatedAt: { type: Date },
      expiresAt: { type: Date },
      isUsed: { type: Boolean, default: false },
      usedAt: { type: Date },
    },

     disputePeriod: {
      startedAt: { type: Date }, // When end OTP was used (job completed)
      endsAt: { type: Date }, // startedAt + 3 days
      isActive: { type: Boolean, default: false },
      isExpired: { type: Boolean, default: false },
    },

    // Payment/Fund Transfer Status
    fundTransfer: {
      isTransferred: { type: Boolean, default: false },
      transferredAt: { type: Date },
      transactionSignature: { type: String },
      amount: { type: Number }, // Amount in lamports
    },

    companyName: { type: String, required: true },

    // Job Details
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 500 },
    category: {
      type: String,
      required: true,
      enum: [
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
        "manufacturing",
        "other",
      ],
    },

    // Location
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    // Payment & Duration
    paymentAmount: { type: Number, required: true, min: 0 }, // In lamports
    paymentAmountINR: { type: Number, min: 0 }, // For display (₹)
    durationHours: { type: Number, required: true, min: 1 },
    requirements: { type: String, maxlength: 300 },

    // Worker Assignment - FIXED: Changed ref from "User" to "WorkerProfile"
    assignedWorker: { type: String, default: null, ref: "WorkerProfile" },
    workerName: { type: String, default: null },
    workerPDA: { type: String, default: null },

    // Status (synced with blockchain)
    status: {
      type: String,
      enum: [
        "open",
        "in_progress",
        "pending_verification",
        "completed",
        "disputed",
        "cancelled",
      ],
      default: "open",
      index: true,
    },

    // Applications array (embedded for quick access)
    applications: [
      {
        workerWallet: { type: String, required: true },
        workerName: { type: String },
        appliedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        workerDetails: {
          name: { type: String },
          rating: { type: Number, default: 0 },
          completedJobs: { type: Number, default: 0 },
          experienceLevel: {
            type: String,
            enum: ["beginner", "intermediate", "experienced"],
            default: "beginner",
          },
          skills: [{ type: String }],
          phone: { type: String },
          email: { type: String },
        },
        coverLetter: { type: String, maxlength: 500 },
      },
    ],

    // Timestamps (blockchain + off-chain)
    createdAt: { type: Date, default: Date.now, index: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    disputeDeadline: { type: Date },


    // Dispute (if any)
    dispute: {
      disputePDA: { type: String },
      txSignature: { type: String },
      reason: { type: String },
      raisedBy: { type: String, enum: ["company", "worker"] },
      raisedByWallet: { type: String },
      otpNotProvided: { type: Boolean, default: false }, // true when employer refused to give End OTP
      evidenceS3Urls: [{ type: String }],
      evidencePhotoUrl: { type: String, default: null }, // photo uploaded by worker as evidence
      evidenceGpsCoordinates: { type: String, default: null }, // GPS coords from worker's phone
      status: {
        type: String,
        enum: [
          "open",
          "under_review",
          "resolved_for_employer",
          "resolved_for_worker",
          "dismissed",
        ],
      },
      createdAt: { type: Date },
      resolvedAt: { type: Date },
      resolution: { type: String },
    },

    // Additional metadata
    isUrgent: { type: Boolean, default: false },
    tags: [{ type: String }],
    viewCount: { type: Number, default: 0 },

    // Ratings (after job completion)
    employerRating: { type: Number, min: 1, max: 5 },
    workerRating: { type: Number, min: 1, max: 5 },
    employerReview: { type: String, maxlength: 500 },
    workerReview: { type: String, maxlength: 500 },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// Indexes for better query performance
// ============================================================================

jobSchema.index({ companyWallet: 1, status: 1 });
jobSchema.index({ assignedWorker: 1, status: 1 });
jobSchema.index({ category: 1, status: 1 });
jobSchema.index({ "location.city": 1, status: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ "applications.workerWallet": 1 });

// ============================================================================
// Virtual Fields
// ============================================================================

jobSchema.virtual("totalApplications").get(function () {
  return this.applications ? this.applications.length : 0;
});

jobSchema.virtual("pendingApplications").get(function () {
  return this.applications
    ? this.applications.filter((app) => app.status === "pending").length
    : 0;
});

jobSchema.virtual("approvedApplications").get(function () {
  return this.applications
    ? this.applications.filter((app) => app.status === "approved").length
    : 0;
});

jobSchema.virtual("rejectedApplications").get(function () {
  return this.applications
    ? this.applications.filter((app) => app.status === "rejected").length
    : 0;
});

jobSchema.set("toJSON", { virtuals: true });
jobSchema.set("toObject", { virtuals: true });

// ============================================================================
// Pre-save Hooks
// ============================================================================

jobSchema.pre("save", function (next) {
  if (this.paymentAmount && !this.paymentAmountINR) {
    const SOL_TO_INR = 8000;
    const solAmount = this.paymentAmount / 1_000_000_000;
    this.paymentAmountINR = Math.round(solAmount * SOL_TO_INR);
  }
  next();
});

jobSchema.pre("save", function (next) {
  if (
    this.isModified("assignedWorker") &&
    this.assignedWorker &&
    !this.startedAt
  ) {
    this.startedAt = new Date();
  }
  next();
});

// ============================================================================
// Instance Methods
// ============================================================================

jobSchema.methods.hasWorkerApplied = function (workerWallet) {
  return this.applications.some((app) => app.workerWallet === workerWallet);
};

jobSchema.methods.getApplicationByWorker = function (workerWallet) {
  return this.applications.find((app) => app.workerWallet === workerWallet);
};

jobSchema.methods.addApplication = function (applicationData) {
  if (this.hasWorkerApplied(applicationData.workerWallet)) {
    throw new Error("Worker has already applied to this job");
  }
  this.applications.push(applicationData);
  return this.save();
};

jobSchema.methods.updateApplicationStatus = function (workerWallet, status) {
  const application = this.getApplicationByWorker(workerWallet);
  if (!application) {
    throw new Error("Application not found");
  }
  application.status = status;
  return this.save();
};

// ============================================================================
// Static Methods
// ============================================================================

jobSchema.statics.getAvailableForWorker = function (workerWallet) {
  return this.find({
    status: "open",
    "applications.workerWallet": { $ne: workerWallet },
  }).sort({ createdAt: -1 });
};

jobSchema.statics.getAppliedByWorker = function (workerWallet) {
  return this.find({
    "applications.workerWallet": workerWallet,
    "applications.status": "pending",
  }).sort({ createdAt: -1 });
};

jobSchema.statics.getAssignedToWorker = function (workerWallet) {
  return this.find({
    assignedWorker: workerWallet,
    status: { $in: ["in_progress", "pending_verification", "disputed"] },
  }).sort({ startedAt: -1 });
};

jobSchema.statics.getCompletedByWorker = function (workerWallet) {
  return this.find({
    assignedWorker: workerWallet,
    status: "completed",
  }).sort({ completedAt: -1 });
};

jobSchema.statics.getRejectedForWorker = function (workerWallet) {
  return this.find({
    applications: {
      $elemMatch: {
        workerWallet: workerWallet,
        status: "rejected",
      },
    },
  }).sort({ createdAt: -1 });
};

// ============================================================================
// Model Export
// ============================================================================

const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);

export { Job };

// ============================================================================
// Job Application Schema
// ============================================================================

const jobApplicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    jobPDA: { type: String, required: true },

    // Worker Info
    workerWallet: { type: String, required: true, index: true },
    workerName: { type: String, required: true },
    workerPDA: { type: String },
    workerRating: { type: Number, default: 0 },
    workerTotalJobs: { type: Number, default: 0 },

    // Application Details
    coverLetter: { type: String, maxlength: 500 },
    proposedRate: { type: Number },
    availableStartDate: { type: Date },

    // Status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "withdrawn"],
      default: "pending",
      index: true,
    },

    // Timestamps
    appliedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },

    // Response from employer
    employerResponse: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

jobApplicationSchema.index({ jobId: 1, workerWallet: 1 }, { unique: true });

const JobApplication =
  mongoose.models.JobApplication ||
  mongoose.model("JobApplication", jobApplicationSchema);

export { JobApplication };
