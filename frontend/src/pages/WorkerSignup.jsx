import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Briefcase,
  Settings,
  Users,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  FileText,
  Clock,
  DollarSign,
  Heart,
  X,
  Plus,
} from "lucide-react";
import { z } from "zod";
import {
  JobCategoryEnum,
  phoneRegex,
  WeekDaysEnum,
  WorkerSignupSchema,
} from "@/schemas/workerSchemas";
import { JOB_CATEGORIES } from "@/constants/worker";
import { StatefulButton } from "@/components/common/StatefulButton";
import { useWalletInformation } from "@/context/WalletContext";
import axios from "axios";
import { BACKEND_URL } from "@/env-variables";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

const ExperienceLevelEnum = z.enum(["beginner", "intermediate", "experienced"]);

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner (0-2 years)" },
  { value: "intermediate", label: "Intermediate (3-5 years)" },
  { value: "experienced", label: "Experienced (5+ years)" },
];

const WEEK_DAYS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

const COMMON_SKILLS = [
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
  "Repair work",
];

const INDIAN_STATES = [
  "Maharashtra",
  "Karnataka",
  "Tamil Nadu",
  "Gujarat",
  "Rajasthan",
  "Uttar Pradesh",
  "West Bengal",
  "Madhya Pradesh",
  "Bihar",
  "Punjab",
];

// Form Components
const FormField = ({
  label,
  error,
  required = false,
  children,
  className = "",
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`space-y-2 ${className}`}
  >
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="text-red-500 text-sm flex items-center gap-1"
        >
          <AlertCircle size={14} />
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </motion.div>
);

const Input = ({ error, className = "", ...props }) => (
  <input
    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
      error ? "border-red-500 focus:ring-red-500" : "border-gray-300"
    } ${className}`}
    {...props}
  />
);

const Textarea = ({ error, className = "", ...props }) => (
  <textarea
    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none ${
      error ? "border-red-500 focus:ring-red-500" : "border-gray-300"
    } ${className}`}
    {...props}
  />
);

const Select = ({ error, options, placeholder, className = "", ...props }) => (
  <select
    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white ${
      error ? "border-red-500 focus:ring-red-500" : "border-gray-300"
    } ${className}`}
    {...props}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

// Skills Input Component
const SkillsInput = ({ value = [], onChange, error }) => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSkills = COMMON_SKILLS.filter(
    (skill) =>
      skill.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(skill)
  );

  const addSkill = (skill) => {
    if (!value.includes(skill) && value.length < 20) {
      onChange([...value, skill]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeSkill = (skillToRemove) => {
    onChange(value.filter((skill) => skill !== skillToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addSkill(inputValue.trim());
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyPress}
          placeholder="Type a skill and press Enter"
          error={error}
        />
        {showSuggestions && filteredSkills.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredSkills.slice(0, 10).map((skill) => (
              <button
                key={skill}
                type="button"
                onMouseDown={() => addSkill(skill)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {value.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {value.map((skill) => (
              <motion.span
                key={skill}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <X size={14} />
                </button>
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-sm text-gray-500">{value.length}/20 skills selected</p>
    </div>
  );
};

// Main WorkerSignupForm Component
const WorkerSignupForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const { WalletAddress, isWalletVerified } = useWalletInformation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // PAN Verification state
  const [panData, setPanData] = useState({
    pan: "",
    name_as_per_pan: "",
    date_of_birth: "", // stored as YYYY-MM-DD (HTML date input), sent as DD/MM/YYYY
  });
  const [panVerified, setPanVerified] = useState(false);
  const [isPanVerifying, setIsPanVerifying] = useState(false);

  // Email OTP Verification state
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");

  const [formData, setFormData] = useState({
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
      coordinates: [0, 0],
    },
    skills: [],
    experienceLevel: "beginner",
    jobCategories: [],
    preferences: {
      minPaymentAmount: 500,
      maxDistanceKm: 25,
      workingHours: {
        start: "08:00",
        end: "18:00",
        days: [],
      },
      isAvailableForUrgentJobs: true,
      isOpenToRemoteWork: false,
    },
    socialProfiles: {
      facebook: "",
      linkedin: "",
      instagram: "",
    },
    emergencyContact: {
      name: "",
      phone: "",
      relation: "",
    },
  });

  useEffect(() => {
    setFormData({
      walletAddress: WalletAddress,
      name: "",
      phone: "",
      email: "",
      bio: "",
      location: {
        address: "",
        city: "",
        state: "",
        country: "India",
        coordinates: [0, 0],
      },
      skills: [],
      experienceLevel: "beginner",
      jobCategories: [],
      preferences: {
        minPaymentAmount: 500,
        maxDistanceKm: 25,
        workingHours: {
          start: "08:00",
          end: "18:00",
          days: [],
        },
        isAvailableForUrgentJobs: true,
        isOpenToRemoteWork: false,
      },
      socialProfiles: {
        facebook: "",
        linkedin: "",
        instagram: "",
      },
      emergencyContact: {
        name: "",
        phone: "",
        relation: "",
      },
    });
  }, [WalletAddress]);

  const steps = [
    {
      title: "Basic Information",
      icon: User,
      description: "Tell us about yourself",
      color: "blue",
    },
    {
      title: "Location Details",
      icon: MapPin,
      description: "Where do you work?",
      color: "green",
    },
    {
      title: "Skills & Experience",
      icon: Briefcase,
      description: "What can you do?",
      color: "purple",
    },
    {
      title: "Work Preferences",
      icon: Settings,
      description: "Your work preferences",
      color: "orange",
    },
    {
      title: "Social & Emergency",
      icon: Users,
      description: "Connect & stay safe",
      color: "pink",
    },
    {
      title: "KYC Verification",
      icon: Shield,
      description: "Verify your PAN",
      color: "indigo",
    },
    {
      title: "Review & Submit",
      icon: CheckCircle,
      description: "Review your information",
      color: "green",
    },
  ];

  // ── PAN Verification handler ────────────────────────────────────────────────
  const handlePanVerify = async () => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (!panData.pan || !panData.name_as_per_pan || !panData.date_of_birth) {
      toast.error("Please fill in all PAN details");
      return;
    }
    if (!panRegex.test(panData.pan.toUpperCase())) {
      toast.error("Invalid PAN format — expected ABCDE1234F");
      return;
    }
    if (!WalletAddress) {
      toast.error("Wallet not connected");
      return;
    }

    // Convert date from YYYY-MM-DD (HTML input) → DD/MM/YYYY (Sandbox API)
    const [year, month, day] = panData.date_of_birth.split("-");
    const formattedDob = `${day}/${month}/${year}`;

    setIsPanVerifying(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/worker/verify-pan`, {
        pan: panData.pan.toUpperCase(),
        name_as_per_pan: panData.name_as_per_pan,
        date_of_birth: formattedDob,
        walletAddress: WalletAddress,
      });

      if (res.status === 200) {
        setPanVerified(true);
        toast.success("PAN verified successfully! ✅");
      }
    } catch (error) {
      console.error("PAN verify error:", error);
      toast.error(
        error.response?.data?.message || "PAN verification failed. Please check your details."
      );
    } finally {
      setIsPanVerifying(false);
    }
  };

  // ── Email OTP handlers ────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!formData.email || !z.string().email().safeParse(formData.email).success) {
      toast.error("Please enter a valid email address first");
      return;
    }
    setIsOtpSending(true);
    setOtpError("");
    try {
      await axios.post(`${BACKEND_URL}/worker/send-otp`, { email: formData.email });
      setOtpSent(true);
      toast.success("OTP sent! Check your inbox.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP. Try again.");
    } finally {
      setIsOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue || otpValue.length !== 6) {
      setOtpError("Enter the 6-digit OTP");
      return;
    }
    setIsOtpVerifying(true);
    setOtpError("");
    try {
      await axios.post(`${BACKEND_URL}/worker/verify-otp`, {
        email: formData.email,
        otp: otpValue,
      });
      setEmailVerified(true);
      setOtpSent(false);
      setOtpValue("");
      toast.success("Email verified! ✅");
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid OTP. Try again.");
    } finally {
      setIsOtpVerifying(false);
    }
  };

  // Update form data helper
  const updateFormData = (field, value) => {
    if (field.includes(".")) {
      const keys = field.split(".");
      setFormData((prev) => {
        const newData = { ...prev };
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newData;
      });
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const isStepReadyToProceed = (stepIndex) => {
    switch (stepIndex) {
      case 0:
        return (
          formData.walletAddress &&
          formData.walletAddress.length >= 32 &&
          formData.name &&
          formData.phone &&
          phoneRegex.test(formData.phone) &&
          formData.email &&
          z.string().email().safeParse(formData.email).success &&
          emailVerified
        );
      case 1:
        return (
          formData.location.address &&
          formData.location.city &&
          formData.location.state
        );
      case 2:
        return (
          formData.skills && formData.skills.length > 0 &&
          formData.jobCategories && formData.jobCategories.length > 0
        );
      case 3:
        return (
          formData.preferences.minPaymentAmount >= 0 &&
          formData.preferences.workingHours.days &&
          formData.preferences.workingHours.days.length > 0
        );
      case 4:
        return (
          formData.emergencyContact.name &&
          formData.emergencyContact.phone &&
          formData.emergencyContact.relation
        );
      case 5:
        return panVerified;
      default:
        return true;
    }
  };

  // Validation function for each step
  const validateStep = (stepIndex) => {
    const stepErrors = {};

    try {
      switch (stepIndex) {
        case 0:
          // Basic Information validation
          if (!formData.walletAddress)
            stepErrors.walletAddress = "Connect your wallet for wallet address";
          else if (formData.walletAddress.length < 32)
            stepErrors.walletAddress = "Wallet address too short";

          if (!formData.name) stepErrors.name = "Name is required";
          if (!formData.phone) stepErrors.phone = "Phone number is required";
          else if (!phoneRegex.test(formData.phone))
            stepErrors.phone = "Invalid phone format";

          if (!formData.email) {
            stepErrors.email = "Email is required";
          } else if (
            !z.string().email().safeParse(formData.email).success
          ) {
            stepErrors.email = "Invalid email format";
          } else if (!emailVerified) {
            stepErrors.email = "Please verify your email before continuing";
          }
          break;

        case 1:
          // Location validation
          if (!formData.location.address)
            stepErrors["location.address"] = "Address is required";
          if (!formData.location.city)
            stepErrors["location.city"] = "City is required";
          if (!formData.location.state)
            stepErrors["location.state"] = "State is required";
          break;

        case 2:
          // Skills validation
          if (formData.skills.length === 0)
            stepErrors.skills = "At least one skill is required";
          if (formData.jobCategories.length === 0)
            stepErrors.jobCategories = "Select at least one category";
          break;

        case 3:
          // Preferences validation
          if (formData.preferences.minPaymentAmount < 0)
            stepErrors["preferences.minPaymentAmount"] = "Invalid amount";
          if (formData.preferences.workingHours.days.length === 0)
            stepErrors["preferences.workingHours.days"] = "Select working days";
          break;

        case 4:
          // Emergency contact validation
          if (!formData.emergencyContact.name)
            stepErrors["emergencyContact.name"] = "Contact name required";
          if (!formData.emergencyContact.phone)
            stepErrors["emergencyContact.phone"] = "Contact phone required";
          if (!formData.emergencyContact.relation)
            stepErrors["emergencyContact.relation"] = "Relation required";
          break;

        case 5:
          // PAN verification must be completed before proceeding
          if (!panVerified)
            stepErrors.pan = "Please verify your PAN before continuing";
          break;
      }
    } catch {
      stepErrors.general = "Validation error occurred";
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const nextStep = () => {
    if(!WalletAddress){
      toast.error("Please connect your wallet first")
      return 
    }
    if (!isWalletVerified) {
      toast.error("Please verify your wallet first.");
      return;
    }
    if (validateStep(currentStep) && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit handler
  const onSubmit = async (e) => {
    setIsSubmitting(true);

    try {
      console.log(formData);
      const res = await axios.post(`${BACKEND_URL}/worker/signup`, {
        formData,
        token: localStorage.getItem("token"),
      });
      console.log(res);

      if (res.data.message === "Worker profile created successfully") {
        toast.success("Worker profile created successfully!");
        setTimeout(() => {
          navigate("/worker/signin");
        }, 800);
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(
        error.response?.data?.message || "Failed to create worker profile"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle functions
  const toggleJobCategory = (category) => {
    if (formData.jobCategories.includes(category)) {
      updateFormData(
        "jobCategories",
        formData.jobCategories.filter((cat) => cat !== category)
      );
    } else if (formData.jobCategories.length < 5) {
      updateFormData("jobCategories", [...formData.jobCategories, category]);
    }
  };

  const toggleWorkingDay = (day) => {
    if (formData.preferences.workingHours.days.includes(day)) {
      updateFormData(
        "preferences.workingHours.days",
        formData.preferences.workingHours.days.filter((d) => d !== day)
      );
    } else {
      updateFormData("preferences.workingHours.days", [
        ...formData.preferences.workingHours.days,
        day,
      ]);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start gap-4 justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Basic Information
                  </h2>
                  <p className="text-sm text-gray-600">
                    Essential details about yourself
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <StatefulButton />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Wallet Address"
                required
                error={errors.walletAddress}
              >
                <Input
                  value={formData.walletAddress}
                  placeholder="Click on Connect your wallet"
                  error={!!errors.walletAddress}
                  className="border-purple-600 border"
                />
              </FormField>

              <FormField label="Full Name" required error={errors.name}>
                <Input
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  placeholder="Rajesh Kumar"
                  error={!!errors.name}
                />
              </FormField>

              <FormField label="Phone Number" required error={errors.phone}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={formData.phone}
                    onChange={(e) => updateFormData("phone", e.target.value)}
                    placeholder="+919876543210"
                    className="pl-10"
                    error={!!errors.phone}
                  />
                </div>
              </FormField>

              <FormField label="Email Address" required error={errors.email}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={formData.email}
                    onChange={(e) => {
                      updateFormData("email", e.target.value);
                      // Reset verification if email changes
                      if (emailVerified) {
                        setEmailVerified(false);
                        setOtpSent(false);
                        setOtpValue("");
                        setOtpError("");
                      }
                    }}
                    type="email"
                    placeholder="rajesh.kumar@email.com"
                    className="pl-10"
                    error={!!errors.email}
                    readOnly={emailVerified}
                  />
                </div>

                {/* ── Email OTP Verification Widget ── */}
                {!emailVerified ? (
                  <div className="mt-2 space-y-2">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isOtpSending}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isOtpSending ? (
                        <><Loader2 size={13} className="animate-spin" /> Sending OTP...</>
                      ) : (
                        <><Mail size={13} /> {otpSent ? "Resend OTP" : "Verify Email"}</>
                      )}
                    </button>

                    {otpSent && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={otpValue}
                          onChange={(e) => {
                            setOtpValue(e.target.value.replace(/\D/g, ""));
                            setOtpError("");
                          }}
                          placeholder="Enter 6-digit OTP"
                          className={`flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 tracking-widest ${
                            otpError ? "border-red-400" : "border-gray-300"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={isOtpVerifying}
                          className="px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                        >
                          {isOtpVerifying ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            "Confirm OTP"
                          )}
                        </button>
                      </div>
                    )}
                    {otpError && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle size={11} /> {otpError}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1 font-medium">
                    <CheckCircle size={13} /> Email Verified
                  </p>
                )}
              </FormField>
            </div>

            <FormField label="Bio" error={errors.bio}>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Textarea
                  value={formData.bio}
                  onChange={(e) => updateFormData("bio", e.target.value)}
                  rows="4"
                  placeholder="Tell us about your experience and skills..."
                  className="pl-10"
                  error={!!errors.bio}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(formData.bio || "").length}/500 characters
              </p>
            </FormField>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Location Details
                </h2>
                <p className="text-sm text-gray-600">Where are you located?</p>
              </div>
            </div>

            <FormField
              label="Address"
              required
              error={errors["location.address"]}
            >
              <Input
                value={formData.location.address}
                onChange={(e) =>
                  updateFormData("location.address", e.target.value)
                }
                placeholder="Shivaji Nagar, Pune"
                error={!!errors["location.address"]}
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="City" required error={errors["location.city"]}>
                <Input
                  value={formData.location.city}
                  onChange={(e) =>
                    updateFormData("location.city", e.target.value)
                  }
                  placeholder="Pune"
                  error={!!errors["location.city"]}
                />
              </FormField>

              <FormField
                label="State"
                required
                error={errors["location.state"]}
              >
                <Select
                  value={formData.location.state}
                  onChange={(e) =>
                    updateFormData("location.state", e.target.value)
                  }
                  options={INDIAN_STATES.map((state) => ({
                    value: state,
                    label: state,
                  }))}
                  placeholder="Select State"
                  error={!!errors["location.state"]}
                />
              </FormField>
            </div>

            <FormField
              label="Country"
              required
              error={errors["location.country"]}
            >
              <Select
                value={formData.location.country}
                onChange={(e) =>
                  updateFormData("location.country", e.target.value)
                }
                options={[
                  { value: "India", label: "India" },
                  { value: "USA", label: "USA" },
                  { value: "UK", label: "UK" },
                ]}
                error={!!errors["location.country"]}
              />
            </FormField>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Skills & Experience
                </h2>
                <p className="text-sm text-gray-600">What can you do?</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormField
                label="Experience Level"
                required
                error={errors.experienceLevel}
              >
                <Select
                  value={formData.experienceLevel}
                  onChange={(e) =>
                    updateFormData("experienceLevel", e.target.value)
                  }
                  options={EXPERIENCE_LEVELS}
                  placeholder="Select your experience level"
                  error={!!errors.experienceLevel}
                />
              </FormField>
            </div>

            <FormField label="Skills" required error={errors.skills}>
              <SkillsInput
                value={formData.skills}
                onChange={(value) => updateFormData("skills", value)}
                error={!!errors.skills}
              />
            </FormField>

            <FormField
              label="Job Categories"
              required
              error={errors.jobCategories}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {JOB_CATEGORIES.map((category) => (
                  <motion.button
                    key={category.value}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleJobCategory(category.value)}
                    className={`p-3 border rounded-lg transition-colors ${
                      formData.jobCategories.includes(category.value)
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {category.label}
                    </span>
                  </motion.button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Select up to 5 categories ({formData.jobCategories.length}/5)
              </p>
            </FormField>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Settings className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Work Preferences
                </h2>
                <p className="text-sm text-gray-600">
                  Set your work preferences
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Minimum Payment Amount (₹)"
                required
                error={errors["preferences.minPaymentAmount"]}
              >
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={formData.preferences.minPaymentAmount}
                    onChange={(e) =>
                      updateFormData(
                        "preferences.minPaymentAmount",
                        parseInt(e.target.value) || 0
                      )
                    }
                    type="number"
                    min="0"
                    className="pl-10"
                    error={!!errors["preferences.minPaymentAmount"]}
                  />
                </div>
              </FormField>

              <FormField
                label="Maximum Distance (km)"
                required
                error={errors["preferences.maxDistanceKm"]}
              >
                <Input
                  value={formData.preferences.maxDistanceKm}
                  onChange={(e) =>
                    updateFormData(
                      "preferences.maxDistanceKm",
                      parseInt(e.target.value) || 1
                    )
                  }
                  type="number"
                  min="1"
                  max="100"
                  error={!!errors["preferences.maxDistanceKm"]}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Work Start Time"
                required
                error={errors["preferences.workingHours.start"]}
              >
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={formData.preferences.workingHours.start}
                    onChange={(e) =>
                      updateFormData(
                        "preferences.workingHours.start",
                        e.target.value
                      )
                    }
                    type="time"
                    className="pl-10"
                    error={!!errors["preferences.workingHours.start"]}
                  />
                </div>
              </FormField>

              <FormField
                label="Work End Time"
                required
                error={errors["preferences.workingHours.end"]}
              >
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={formData.preferences.workingHours.end}
                    onChange={(e) =>
                      updateFormData(
                        "preferences.workingHours.end",
                        e.target.value
                      )
                    }
                    type="time"
                    className="pl-10"
                    error={!!errors["preferences.workingHours.end"]}
                  />
                </div>
              </FormField>
            </div>

            <FormField
              label="Working Days"
              required
              error={errors["preferences.workingHours.days"]}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {WEEK_DAYS.map((day) => (
                  <motion.button
                    key={day.value}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleWorkingDay(day.value)}
                    className={`px-3 py-2 text-sm border rounded-lg transition-colors font-medium ${
                      formData.preferences.workingHours.days.includes(day.value)
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    {day.label}
                  </motion.button>
                ))}
              </div>
            </FormField>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  checked={formData.preferences.isAvailableForUrgentJobs}
                  onChange={(e) =>
                    updateFormData(
                      "preferences.isAvailableForUrgentJobs",
                      e.target.checked
                    )
                  }
                  type="checkbox"
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  Available for urgent jobs
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  checked={formData.preferences.isOpenToRemoteWork}
                  onChange={(e) =>
                    updateFormData(
                      "preferences.isOpenToRemoteWork",
                      e.target.checked
                    )
                  }
                  type="checkbox"
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  Open to remote work
                </label>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Users className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Social & Emergency
                </h2>
                <p className="text-sm text-gray-600">
                  Connect with others and stay safe
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Social Profiles (Optional)
              </h3>
              <div className="space-y-4">
                <FormField
                  label="Facebook URL"
                  error={errors["socialProfiles.facebook"]}
                >
                  <Input
                    value={formData.socialProfiles.facebook}
                    onChange={(e) =>
                      updateFormData("socialProfiles.facebook", e.target.value)
                    }
                    placeholder="https://facebook.com/your.profile"
                    error={!!errors["socialProfiles.facebook"]}
                  />
                </FormField>

                <FormField
                  label="LinkedIn URL"
                  error={errors["socialProfiles.linkedin"]}
                >
                  <Input
                    value={formData.socialProfiles.linkedin}
                    onChange={(e) =>
                      updateFormData("socialProfiles.linkedin", e.target.value)
                    }
                    placeholder="https://linkedin.com/in/your-profile"
                    error={!!errors["socialProfiles.linkedin"]}
                  />
                </FormField>

                <FormField
                  label="Instagram URL"
                  error={errors["socialProfiles.instagram"]}
                >
                  <Input
                    value={formData.socialProfiles.instagram}
                    onChange={(e) =>
                      updateFormData("socialProfiles.instagram", e.target.value)
                    }
                    placeholder="https://instagram.com/your_profile"
                    error={!!errors["socialProfiles.instagram"]}
                  />
                </FormField>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Emergency Contact
                </h3>
                <span className="text-red-500">*</span>
              </div>
              <div className="space-y-4">
                <FormField
                  label="Contact Name"
                  required
                  error={errors["emergencyContact.name"]}
                >
                  <Input
                    value={formData.emergencyContact.name}
                    onChange={(e) =>
                      updateFormData("emergencyContact.name", e.target.value)
                    }
                    placeholder="Sunita Kumar"
                    error={!!errors["emergencyContact.name"]}
                  />
                </FormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Phone Number"
                    required
                    error={errors["emergencyContact.phone"]}
                  >
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={formData.emergencyContact.phone}
                        onChange={(e) =>
                          updateFormData(
                            "emergencyContact.phone",
                            e.target.value
                          )
                        }
                        placeholder="+919876543211"
                        className="pl-10"
                        error={!!errors["emergencyContact.phone"]}
                      />
                    </div>
                  </FormField>

                  <FormField
                    label="Relation"
                    required
                    error={errors["emergencyContact.relation"]}
                  >
                    <Input
                      value={formData.emergencyContact.relation}
                      onChange={(e) =>
                        updateFormData(
                          "emergencyContact.relation",
                          e.target.value
                        )
                      }
                      placeholder="wife"
                      error={!!errors["emergencyContact.relation"]}
                    />
                  </FormField>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  KYC / PAN Verification
                </h2>
                <p className="text-sm text-gray-600">
                  Verify your identity with your PAN card
                </p>
              </div>
            </div>

            {panVerified ? (
              /* ── Verified success state ── */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
                >
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </motion.div>
                <h3 className="text-xl font-bold text-green-700">PAN Verified Successfully!</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full max-w-sm space-y-1 text-sm text-gray-700">
                  <p><span className="font-semibold">PAN Number:</span> {panData.pan.toUpperCase()}</p>
                  <p><span className="font-semibold">Name:</span> {panData.name_as_per_pan}</p>
                  <p><span className="font-semibold">Date of Birth:</span> {panData.date_of_birth}</p>
                </div>
                <p className="text-sm text-gray-500">
                  You can now proceed to the final review step.
                </p>
              </motion.div>
            ) : (
              /* ── PAN input form ── */
              <div className="space-y-5 max-w-md">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Your PAN card details are required for identity verification.
                    This information is securely stored and only used for KYC compliance.
                  </span>
                </div>

                <FormField label="PAN Number" required error={errors.pan}>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={panData.pan}
                      onChange={(e) =>
                        setPanData((prev) => ({
                          ...prev,
                          pan: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      className="pl-10 uppercase tracking-widest"
                      error={!!errors.pan}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)</p>
                </FormField>

                <FormField label="Name as per PAN" required>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={panData.name_as_per_pan}
                      onChange={(e) =>
                        setPanData((prev) => ({
                          ...prev,
                          name_as_per_pan: e.target.value,
                        }))
                      }
                      placeholder="Rajesh Kumar"
                      className="pl-10"
                    />
                  </div>
                </FormField>

                <FormField label="Date of Birth" required>
                  <Input
                    type="date"
                    value={panData.date_of_birth}
                    onChange={(e) =>
                      setPanData((prev) => ({
                        ...prev,
                        date_of_birth: e.target.value,
                      }))
                    }
                    max={new Date().toISOString().split("T")[0]}
                  />
                </FormField>

                <motion.button
                  type="button"
                  onClick={handlePanVerify}
                  disabled={isPanVerifying}
                  whileHover={{ scale: isPanVerifying ? 1 : 1.03 }}
                  whileTap={{ scale: isPanVerifying ? 1 : 0.97 }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                >
                  {isPanVerifying ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Verifying PAN...</span>
                    </>
                  ) : (
                    <>
                      <Shield size={18} />
                      <span>Verify PAN</span>
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Review & Submit
                </h2>
                <p className="text-sm text-gray-600">
                  Please review your information before submitting
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg space-y-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">
                  Basic Information
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Name:</span> {formData.name}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span> {formData.phone}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {formData.email || "Not provided"}
                  </p>
                  <p className="break-all">
                    <span className="font-medium">Wallet:</span>{" "}
                    <span className="font-mono text-xs">{formData.walletAddress}</span>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Location</h4>
                <p className="text-sm text-gray-600">
                  {formData.location.address}, {formData.location.city},{" "}
                  {formData.location.state}, {formData.location.country}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">
                  Skills & Experience
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Experience:</span>{" "}
                    {formData.experienceLevel}
                  </p>
                  <p>
                    <span className="font-medium">Skills:</span>{" "}
                    {formData.skills.join(", ")}
                  </p>
                  <p>
                    <span className="font-medium">Categories:</span>{" "}
                    {formData.jobCategories.join(", ")}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">
                  Work Preferences
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Min Payment:</span> ₹
                    {formData.preferences.minPaymentAmount}
                  </p>
                  <p>
                    <span className="font-medium">Max Distance:</span>{" "}
                    {formData.preferences.maxDistanceKm} km
                  </p>
                  <p>
                    <span className="font-medium">Working Hours:</span>{" "}
                    {formData.preferences.workingHours.start} -{" "}
                    {formData.preferences.workingHours.end}
                  </p>
                  <p>
                    <span className="font-medium">Working Days:</span>{" "}
                    {formData.preferences.workingHours.days.join(", ")}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">
                  Emergency Contact
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {formData.emergencyContact.name}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span>{" "}
                    {formData.emergencyContact.phone}
                  </p>
                  <p>
                    <span className="font-medium">Relation:</span>{" "}
                    {formData.emergencyContact.relation}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">KYC / PAN Verification</h4>
                {panVerified ? (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle size={16} className="text-green-500" />
                    <span className="font-medium">PAN Verified</span>
                    <span className="text-gray-500 ml-auto">{panData.pan.toUpperCase()}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle size={16} className="text-red-500" />
                    <span>PAN not verified — go back to complete KYC</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-start mb-8">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-3xl font-bold text-purple-800 mb-2"
            >
              {t("signup.workerTitle")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-600 text-lg"
            >
              {t("signin.workerSubtitle")}
            </motion.p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      index < currentStep
                        ? `bg-${step.color}-500 text-white`
                        : index === currentStep
                        ? `bg-${step.color}-100 text-${step.color}-600 ring-2 ring-${step.color}-500`
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle size={16} />
                    ) : (
                      React.createElement(step.icon, { size: 16 })
                    )}
                  </div>
                  <div className="text-center mt-2">
                    <p
                      className={`text-xs font-medium ${
                        index <= currentStep
                          ? `text-${step.color}-600`
                          : "text-gray-400"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 hidden md:block">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 md:p-8"
          >
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                <motion.button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  whileHover={{ scale: currentStep === 0 ? 1 : 1.05 }}
                  whileTap={{ scale: currentStep === 0 ? 1 : 0.95 }}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 ${
                    currentStep === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </motion.button>

                {currentStep < steps.length - 1 ? (
                  <motion.button
                    type="button"
                    onClick={nextStep}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 ${
                      !isStepReadyToProceed(currentStep)
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={onSubmit}
                    disabled={isSubmitting || !isStepReadyToProceed(steps.length - 2)}
                    whileHover={{ scale: (isSubmitting || !isStepReadyToProceed(steps.length - 2)) ? 1 : 1.05 }}
                    whileTap={{ scale: (isSubmitting || !isStepReadyToProceed(steps.length - 2)) ? 1 : 0.95 }}
                    className={`flex items-center space-x-2 px-8 py-3 rounded-lg transition-all duration-200 ${
                      (isSubmitting || !isStepReadyToProceed(steps.length - 2))
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Creating Profile...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        <span>Create Profile</span>
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Form Validation Errors Display */}
          {/* {Object.keys(errors).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle size={16} className="text-red-500" />
                <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>• {error}</li>
                ))}
              </ul>
            </motion.div>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default WorkerSignupForm;
