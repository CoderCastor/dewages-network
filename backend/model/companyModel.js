import mongoose from "mongoose";

// Company Profile Schema
const companyProfileSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true, index: true },
  PDAAddress: { type: String, default: null, sparse: true },
  
  // Company Basic Info
  companyName: { type: String, required: false, trim: true },
  companyType: {
    type: String,
    enum: ["individual", "small_business", "medium_business", "large_enterprise"],
    default: "individual",
  },
  registrationNumber: { type: String, trim: true },
  taxId: { type: String, trim: true },
  
  // Logo
  logo: { type: String },

  // Contact Info
  phone: { type: String, required: false },
  email: { type: String, lowercase: true },
  website: { type: String },
  
  // Description
  description: { type: String, maxlength: 500 },
  
  // Location
  location: {
    address: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    country: { type: String, default: "India" },
    coordinates: { type: [Number], default: [0, 0] },
  },
  
  // Job Categories they're interested in
  interestedCategories: [
    {
      type: String,
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
        "other",
      ],
    },
  ],
  
  // Contact Person
  contactPerson: {
    name: { type: String, required: false },
    designation: { type: String, required: false },
    phone: { type: String, required: false },
    email: { type: String },
  },
  
  // Verification Status
  verificationStatus: {
    phone: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
    documents: { type: Boolean, default: false },
  },
  
  // Documents (optional, for verification)
  documents: [
    {
      type: {
        type: String,
        enum: [
          "company_registration",
          "gst_certificate",
          "address_proof",
          "identity_proof",
        ],
      },
      s3Url: String, // Changed from ipfsHash to s3Url
      fileName: String,
      verified: { type: Boolean, default: false },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  
  // Social Profiles
  socialProfiles: {
    linkedin: String,
    facebook: String,
    instagram: String,
  },
  
  // Account Status
  isActive: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  
  // Statistics
  totalJobsPosted: { type: Number, default: 0 },
  activeJobs: { type: Number, default: 0 },
  completedJobs: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLoginAt: Date,
});

// Pre-save hook to update timestamp
companyProfileSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for full verification
companyProfileSchema.virtual("isFullyVerified").get(function () {
  return (
    this.verificationStatus.email &&
    this.isVerified
  );
});

// Safe export
const CompanyProfile =
  mongoose.models.CompanyProfile ||
  mongoose.model("CompanyProfile", companyProfileSchema);

export { CompanyProfile };