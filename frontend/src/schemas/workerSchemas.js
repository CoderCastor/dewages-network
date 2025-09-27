import { z } from "zod";

const timeFormatRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
export const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;

export const JobCategoryEnum = z.enum([
  "construction",
  "delivery",
  "domestic_help",
  "event_staffing",
  "agriculture",
  "cleaning",
  "security",
  "other",
]);

export const ExperienceLevelEnum = z.enum([
  "beginner",
  "intermediate",
  "experienced",
]);

export const WeekDaysEnum = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

// Form validation schema
export const WorkerSignupSchema = z.object({
  walletAddress: z.string()
    .min(32, "Wallet address must be at least 32 characters")
    .max(44, "Wallet address must be at most 44 characters"),
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long"),
  phone: z.string().regex(phoneRegex, "Invalid phone number format"),
  email: z.union([
    z.string().email("Invalid email format"),
    z.literal("")
  ]).optional(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  location: z.object({
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    country: z.string().min(1, "Country is required"),
    coordinates: z.tuple([z.number(), z.number()]).optional(),
  }),
  skills: z.array(z.string())
    .min(1, "At least one skill is required")
    .max(20, "Maximum 20 skills allowed"),
  experienceLevel: ExperienceLevelEnum,
  jobCategories: z.array(JobCategoryEnum)
    .min(1, "Select at least one job category")
    .max(5, "Maximum 5 categories allowed"),
  preferences: z.object({
    minPaymentAmount: z.number().min(0, "Minimum payment must be positive"),
    maxDistanceKm: z.number()
      .min(1, "Distance must be at least 1km")
      .max(100, "Distance cannot exceed 100km"),
    workingHours: z.object({
      start: z.string().regex(timeFormatRegex, "Invalid time format (HH:MM)"),
      end: z.string().regex(timeFormatRegex, "Invalid time format (HH:MM)"),
      days: z.array(WeekDaysEnum).min(1, "Select at least one working day"),
    }),
    isAvailableForUrgentJobs: z.boolean(),
    isOpenToRemoteWork: z.boolean(),
  }),
  socialProfiles: z.object({
    facebook: z.union([z.string().url("Invalid Facebook URL"), z.literal("")]).optional(),
    linkedin: z.union([z.string().url("Invalid LinkedIn URL"), z.literal("")]).optional(),
    instagram: z.union([z.string().url("Invalid Instagram URL"), z.literal("")]).optional(),
  }).optional(),
  emergencyContact: z.object({
    name: z.string().min(1, "Emergency contact name is required"),
    phone: z.string().regex(phoneRegex, "Invalid phone number format"),
    relation: z.string().min(1, "Relation is required"),
  }),
});

// Constants
export const JOB_CATEGORIES = [
  { value: "construction", label: "Construction" },
  { value: "delivery", label: "Delivery" },
  { value: "domestic_help", label: "Domestic Help" },
  { value: "event_staffing", label: "Event Staffing" },
  { value: "agriculture", label: "Agriculture" },
  { value: "cleaning", label: "Cleaning" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];