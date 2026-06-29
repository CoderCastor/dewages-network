import { z } from "zod";

// Helper schemas and validators
const timeFormatRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
const mongoObjectIdRegex = /^[0-9a-fA-F]{24}$/;

// Enums
const JobCategoryEnum = z.enum([
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
]);

const ExperienceLevelEnum = z.enum(["beginner", "intermediate", "experienced"]);
const WeekDaysEnum = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
const DocumentTypeEnum = z.enum([
  "identity",
  "address_proof",
  "skill_certificate",
  "experience_letter",
]);
const ProficiencyLevelEnum = z.enum([
  "basic",
  "intermediate",
  "advanced",
  "expert",
]);

// Base validation schemas
const WalletAddressSchema = z
  .string()

const PhoneSchema = z
  .string()
  

const EmailSchema = z.email("Invalid email format").toLowerCase().optional();

const IPFSHashSchema = z
  .string()
  .regex(
    /^Qm[1-9A-HJ-NP-Za-km-z]{44}|^baf[0-9a-z]{56}$/,
    "Invalid IPFS hash format"
  );

// Location Schema
const LocationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  coordinates: z.tuple([z.number(), z.number()]).optional(), // [longitude, latitude]
});

// Document Schema
const DocumentSchema = z.object({
  type: DocumentTypeEnum,
  ipfsHash: IPFSHashSchema,
  fileName: z.string().optional(),
  verified: z.boolean().default(false),
  uploadedAt: z.date().default(() => new Date()),
});

// Verification Status Schema
const VerificationStatusSchema = z.object({
  phone: z.boolean().default(false),
  email: z.boolean().default(false),
  identity: z.boolean().default(false),
});

// Working Hours Schema
const WorkingHoursSchema = z.object({
  start: z
    .string()
    .regex(timeFormatRegex, "Invalid time format (HH:MM)")
    .optional(),
  end: z
    .string()
    .regex(timeFormatRegex, "Invalid time format (HH:MM)")
    .optional(),
  days: z.array(WeekDaysEnum).max(7, "Cannot have more than 7 days").optional(),
});

// Preferences Schema
const PreferencesSchema = z.object({
  minPaymentAmount: z
    .number()
    .min(0, "Minimum payment must be positive")
    .optional(),
  maxDistanceKm: z
    .number()
    .min(1, "Distance must be at least 1km")
    .max(100, "Distance cannot exceed 100km")
    .default(10),
  workingHours: WorkingHoursSchema.optional(),
  isAvailableForUrgentJobs: z.boolean().default(true),
  isOpenToRemoteWork: z.boolean().default(false),
});

// Social Profiles Schema

// Emergency Contact Schema
const EmergencyContactSchema = z.object({
  name: z.string().min(1, "Emergency contact name is required"),
  phone: PhoneSchema,
  relation: z.string().min(1, "Relation is required"),
});

// Worker Profile Schema
export const WorkerProfileSchema = z.object({
  // Essential Information
  walletAddress: WalletAddressSchema,
  name: z.string().min(1, "Name is required").max(100, "Name too long").trim(),
  phone: PhoneSchema,
  email: EmailSchema,

  // Profile Information
  avatar: IPFSHashSchema.optional(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  location: LocationSchema.optional(),

  // Worker-Specific Information
  skills: z
    .array(z.string())
    .max(20, "Cannot have more than 20 skills")
    .default([]),
  experienceLevel: ExperienceLevelEnum.default("beginner"),
  jobCategories: z
    .array(JobCategoryEnum)
    .max(5, "Cannot select more than 5 job categories")
    .default([]),

  // Verification
  verificationStatus: VerificationStatusSchema.default(() => ({
    phone: false,
    email: false,
    identity: false,
  })),
  documents: z
    .array(DocumentSchema)
    .max(10, "Cannot upload more than 10 documents")
    .default([]),

  // Preferences
  preferences: PreferencesSchema.default({}),


  emergencyContact: EmergencyContactSchema,

  // Account Status
  isActive: z.boolean().default(true),
  isVerified: z.boolean().default(false),

  // Stats
  rating: z.number().min(0).max(5).default(0),
  totalJobs: z.number().min(0).default(0),
  completedJobs: z.number().min(0).default(0),
  totalEarnings: z.number().min(0).default(0),

  // Timestamps
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  lastLoginAt: z.date().optional(),
});

// Worker Skill Schema
export const WorkerSkillSchema = z.object({
  workerWallet: WalletAddressSchema,
  skillName: z
    .string()
    .min(1, "Skill name is required")
    .max(50, "Skill name too long"),
  category: JobCategoryEnum.or(z.literal("technical")), // Extended with 'technical'
  experienceYears: z.number().min(0).max(50).optional(),
  proficiencyLevel: ProficiencyLevelEnum.default("basic"),
  certifications: z
    .array(
      z.object({
        name: z.string().optional(),
        issuer: z.string().optional(),
        dateObtained: z.date().optional(),
        expiryDate: z.date().optional(),
        certificateUrl: IPFSHashSchema.optional(),
      })
    )
    .default([]),
  isVerified: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
});

// Time Slot Schema
const TimeSlotSchema = z
  .object({
    startTime: z
      .string()
      .regex(timeFormatRegex, "Invalid start time format (HH:MM)"),
    endTime: z
      .string()
      .regex(timeFormatRegex, "Invalid end time format (HH:MM)"),
    isAvailable: z.boolean().default(true),
    jobPublicKey: z.string().optional(),
  })
  .refine(
    (data) => {
      // Validate that end time is after start time
      const [startHour, startMin] = data.startTime.split(":").map(Number);
      const [endHour, endMin] = data.endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return endMinutes > startMinutes;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

// Worker Availability Schema
export const WorkerAvailabilitySchema = z.object({
  workerWallet: WalletAddressSchema,
  date: z.date(),
  timeSlots: z.array(TimeSlotSchema).default([]),
  isFullDayAvailable: z.boolean().default(true),
  notes: z.string().max(200, "Notes cannot exceed 200 characters").optional(),
  createdAt: z.date().default(() => new Date()),
});

// Input schemas for API endpoints (omit auto-generated fields)
export const CreateWorkerProfileSchema = WorkerProfileSchema.omit({
  rating: true,
  totalJobs: true,
  completedJobs: true,
  totalEarnings: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  isVerified: true,
});

export const UpdateWorkerProfileSchema =
  CreateWorkerProfileSchema.partial().omit({
    walletAddress: true, // Wallet address should not be updatable
  });

export const CreateWorkerSkillSchema = WorkerSkillSchema.omit({
  createdAt: true,
  isVerified: true,
});

export const UpdateWorkerSkillSchema = CreateWorkerSkillSchema.partial().omit({
  workerWallet: true,
});

export const CreateWorkerAvailabilitySchema = WorkerAvailabilitySchema.omit({
  createdAt: true,
});

export const UpdateWorkerAvailabilitySchema =
  CreateWorkerAvailabilitySchema.partial().omit({
    workerWallet: true,
    date: true,
  });

// Response schemas (include all fields)
export const WorkerProfileResponseSchema = WorkerProfileSchema.extend({
  _id: z.string().regex(mongoObjectIdRegex).optional(),
  isFullyVerified: z.boolean().optional(), // Virtual field
});

export const WorkerSkillResponseSchema = WorkerSkillSchema.extend({
  _id: z.string().regex(mongoObjectIdRegex).optional(),
});

export const WorkerAvailabilityResponseSchema = WorkerAvailabilitySchema.extend(
  {
    _id: z.string().regex(mongoObjectIdRegex).optional(),
  }
);

// Query/Filter schemas
export const WorkerProfileFiltersSchema = z.object({
  skills: z.array(z.string()).optional(),
  jobCategories: z.array(JobCategoryEnum).optional(),
  experienceLevel: ExperienceLevelEnum.optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxDistance: z.number().min(1).max(100).optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  minPayment: z.number().min(0).optional(),
});

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Utility function to convert Mongoose schema to Zod (for reference)
export const validateWithSchema = (schema, data) => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Validation failed: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`
      );
    }
    throw error;
  }
};

// Example usage in API routes
export const validateWorkerProfile = (data) =>
  validateWithSchema(CreateWorkerProfileSchema, data);

export const validateWorkerSkill = (data) =>
  validateWithSchema(CreateWorkerSkillSchema, data);

export const validateWorkerAvailability = (data) =>
  validateWithSchema(CreateWorkerAvailabilitySchema, data);
