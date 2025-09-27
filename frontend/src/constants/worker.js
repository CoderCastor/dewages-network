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

export const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner (0-2 years)" },
  { value: "intermediate", label: "Intermediate (3-5 years)" },
  { value: "experienced", label: "Experienced (5+ years)" },
];

export const WEEK_DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export const COMMON_SKILLS = [
  "Concrete work",
  "Electrical wiring",
  "Plumbing",
  "Tile installation",
  "Painting",
  "Carpentry",
  "Welding",
  "Masonry",
  "Roofing",
  "Landscaping",
  "Cleaning",
  "Cooking",
  "Driving",
  "Security",
  "Event setup",
  "Farming",
  "Equipment operation",
  "Construction",
  "Maintenance",
  "Repair work"
];

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

// Default form values
export const DEFAULT_FORM_VALUES = {
  walletAddress: "",
  name: "",
  phone: "",
  email: "",
  bio: "",
  location: {
    address: "",
    city: "",
    state: "",
    country: "India",
    coordinates: null
  },
  skills: [],
  experienceLevel: "beginner",
  jobCategories: [],
  preferences: {
    minPaymentAmount: 500,
    maxDistanceKm: 10,
    workingHours: {
      start: "08:00",
      end: "18:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    },
    isAvailableForUrgentJobs: true,
    isOpenToRemoteWork: false
  },
  socialProfiles: {
    linkedin: "",
    facebook: "",
    instagram: ""
  },
  emergencyContact: {
    name: "",
    phone: "",
    relation: ""
  }
};