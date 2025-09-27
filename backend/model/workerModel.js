import mongoose from "mongoose";

// Helper function
function arrayLimit(val) {
  return val.length <= 20;
}

// Worker Profile Schema
const workerProfileSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true }, // ❌ no unique/index
  name: { type: String, trim: true },
  phone: { type: String },
  email: { type: String, lowercase: true }, // ❌ no unique/sparse
  avatar: String,
  bio: { type: String, maxlength: 500 },
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: { type: [Number] }, // ❌ no index
  },
  skills: {
    type: [String],
    validate: [arrayLimit, "{PATH} exceeds the limit of 20"],
  },
  experienceLevel: {
    type: String,
    enum: ["beginner", "intermediate", "experienced"],
    default: "beginner",
  },
  jobCategories: [
    {
      type: String,
      enum: [
        "construction",
        "delivery",
        "domestic_help",
        "event_staffing",
        "agriculture",
        "cleaning",
        "security",
        "other",
      ],
    },
  ],
  verificationStatus: {
    phone: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
    identity: { type: Boolean, default: false },
  },
  documents: [
    {
      type: {
        type: String,
        enum: [
          "identity",
          "address_proof",
          "skill_certificate",
          "experience_letter",
        ],
      },
      ipfsHash: String,
      fileName: String,
      verified: { type: Boolean, default: false },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  preferences: {
    minPaymentAmount: { type: Number, min: 0 },
    maxDistanceKm: { type: Number, min: 1, max: 100, default: 10 },
    workingHours: {
      start: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      end: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      days: [
        {
          type: String,
          enum: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
        },
      ],
    },
    isAvailableForUrgentJobs: { type: Boolean, default: true },
    isOpenToRemoteWork: { type: Boolean, default: false },
  },
  socialProfiles: { linkedin: String, facebook: String, instagram: String },
  emergencyContact: { name: String, phone: String, relation: String },
  isActive: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  totalJobs: { type: Number, default: 0 },
  completedJobs: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLoginAt: Date,
});

workerProfileSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

workerProfileSchema.virtual("isFullyVerified").get(function () {
  return (
    this.verificationStatus.phone &&
    this.verificationStatus.email &&
    this.verificationStatus.identity
  );
});

// Worker Skill Schema
const workerSkillSchema = new mongoose.Schema({
  workerWallet: { type: String },
  skillName: String,
  category: {
    type: String,
    enum: [
      "construction",
      "delivery",
      "domestic_help",
      "event_staffing",
      "agriculture",
      "cleaning",
      "security",
      "technical",
      "other",
    ],
  },
  experienceYears: { type: Number, min: 0, max: 50 },
  proficiencyLevel: {
    type: String,
    enum: ["basic", "intermediate", "advanced", "expert"],
    default: "basic",
  },
  certifications: [
    {
      name: String,
      issuer: String,
      dateObtained: Date,
      expiryDate: Date,
      certificateUrl: String,
    },
  ],
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Worker Availability Schema
const workerAvailabilitySchema = new mongoose.Schema({
  workerWallet: { type: String },
  date: Date,
  timeSlots: [
    {
      startTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      endTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
      isAvailable: { type: Boolean, default: true },
      jobPublicKey: String,
    },
  ],
  isFullDayAvailable: { type: Boolean, default: true },
  notes: String,
  createdAt: { type: Date, default: Date.now },
});

// ✅ Safe exports
const WorkerProfile =
  mongoose.models.WorkerProfile ||
  mongoose.model("WorkerProfile", workerProfileSchema);
const WorkerSkill =
  mongoose.models.WorkerSkill ||
  mongoose.model("WorkerSkill", workerSkillSchema);
const WorkerAvailability =
  mongoose.models.WorkerAvailability ||
  mongoose.model("WorkerAvailability", workerAvailabilitySchema);

export { WorkerProfile, WorkerSkill, WorkerAvailability };
