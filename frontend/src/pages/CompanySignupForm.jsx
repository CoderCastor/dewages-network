import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Building,
  MapPin,
  Briefcase,
  Users,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  FileText,
  Heart,
  X,
} from "lucide-react";
import { z } from "zod";
import { StatefulButton } from "@/components/common/CompanyStatefulButton";
import { useWalletInformation } from "@/context/WalletContext";
import axios from "axios";
import { BACKEND_URL } from "@/env-variables";
import toast from "react-hot-toast";

const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;

// Only individual/skilled jobs (no group hiring)
const INDIVIDUAL_JOB_CATEGORIES = [
//   { value: "construction", label: "Construction" },
  { value: "cleaning", label: "Cleaning" },
  { value: "security", label: "Security" },
  { value: "delivery", label: "Delivery" },
  { value: "domestic_help", label: "Domestic Help" },
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

const COMPANY_TYPES = [
  { value: "individual", label: "Individual/Freelancer" },
  { value: "small_business", label: "Small Business (1-10 employees)" },
  { value: "medium_business", label: "Medium Business (11-50 employees)" },
  { value: "large_enterprise", label: "Large Enterprise (50+ employees)" },
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

// Main CompanySignupForm Component
const CompanySignupForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const { WalletAddress, isWalletVerified } = useWalletInformation();

  const [formData, setFormData] = useState({
    walletAddress: "",
    companyName: "",
    companyType: "individual",
    registrationNumber: "",
    taxId: "",
    phone: "",
    email: "",
    website: "",
    description: "",
    location: {
      address: "",
      city: "",
      state: "",
      country: "India",
      coordinates: [0, 0],
    },
    interestedCategories: [],
    socialProfiles: {
      linkedin: "",
      facebook: "",
      instagram: "",
    },
    contactPerson: {
      name: "",
      designation: "",
      phone: "",
      email: "",
    },
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      walletAddress: WalletAddress,
    }));
  }, [WalletAddress]);

  const steps = [
    {
      title: "Company Information",
      icon: Building,
      description: "Tell us about your company",
      color: "blue",
    },
    {
      title: "Location Details",
      icon: MapPin,
      description: "Where is your company?",
      color: "green",
    },
    {
      title: "Job Interests",
      icon: Briefcase,
      description: "What jobs do you need?",
      color: "purple",
    },
    {
      title: "Contact Person",
      icon: Users,
      description: "Primary contact details",
      color: "orange",
    },
    {
      title: "Review & Submit",
      icon: Shield,
      description: "Review your information",
      color: "indigo",
    },
  ];

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

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Validation function for each step
  const validateStep = (stepIndex) => {
    const stepErrors = {};

    try {
      switch (stepIndex) {
        case 0:
          // Company Information validation
          if (!formData.walletAddress)
            stepErrors.walletAddress = "Connect your wallet first";
          else if (formData.walletAddress.length < 32)
            stepErrors.walletAddress = "Invalid wallet address";

          if (!formData.companyName)
            stepErrors.companyName = "Company name is required";
          if (!formData.phone) stepErrors.phone = "Phone number is required";
          else if (!phoneRegex.test(formData.phone))
            stepErrors.phone = "Invalid phone format";

          if (
            formData.email &&
            !z.string().email().safeParse(formData.email).success
          ) {
            stepErrors.email = "Invalid email format";
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
          // Job categories validation
          if (formData.interestedCategories.length === 0)
            stepErrors.interestedCategories =
              "Select at least one job category";
          break;

        case 3:
          // Contact person validation
          if (!formData.contactPerson.name)
            stepErrors["contactPerson.name"] = "Contact name required";
          if (!formData.contactPerson.phone)
            stepErrors["contactPerson.phone"] = "Contact phone required";
          if (!formData.contactPerson.designation)
            stepErrors["contactPerson.designation"] = "Designation required";
          break;
      }
    } catch {
      stepErrors.general = "Validation error occurred";
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const nextStep = () => {
    if (!WalletAddress) {
      toast.error("Please connect your wallet first");
      return;
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
  const onSubmit = async () => {
    setIsSubmitting(true);

    try {
      console.log(formData);
      const res = await axios.post(`${BACKEND_URL}/company/signup`, {
        formData,
        token: localStorage.getItem("token"),
      });
      console.log(res);

      if (res.data.message === "Company profile created successfully") {
        toast.success("Company profile created successfully!");
        // Redirect or show success message
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(
        error.response?.data?.message || "Failed to create company profile"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle function
  const toggleJobCategory = (category) => {
    if (formData.interestedCategories.includes(category)) {
      updateFormData(
        "interestedCategories",
        formData.interestedCategories.filter((cat) => cat !== category)
      );
    } else {
      updateFormData("interestedCategories", [
        ...formData.interestedCategories,
        category,
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
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Company Information
                  </h2>
                  <p className="text-sm text-gray-600">
                    Basic details about your company
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
                  className="border-blue-600 border"
                  readOnly
                />
              </FormField>

              <FormField
                label="Company Name"
                required
                error={errors.companyName}
              >
                <Input
                  value={formData.companyName}
                  onChange={(e) =>
                    updateFormData("companyName", e.target.value)
                  }
                  placeholder="ABC Construction Pvt Ltd"
                  error={!!errors.companyName}
                />
              </FormField>

              <FormField
                label="Company Type"
                required
                error={errors.companyType}
              >
                <Select
                  value={formData.companyType}
                  onChange={(e) =>
                    updateFormData("companyType", e.target.value)
                  }
                  options={COMPANY_TYPES}
                  error={!!errors.companyType}
                />
              </FormField>

              <FormField
                label="Phone Number"
                required
                error={errors.phone}
              >
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

              <FormField label="Email Address" error={errors.email}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={formData.email}
                    onChange={(e) => updateFormData("email", e.target.value)}
                    type="email"
                    placeholder="company@email.com"
                    className="pl-10"
                    error={!!errors.email}
                  />
                </div>
              </FormField>

              <FormField label="Website (Optional)" error={errors.website}>
                <Input
                  value={formData.website}
                  onChange={(e) => updateFormData("website", e.target.value)}
                  placeholder="https://yourcompany.com"
                  error={!!errors.website}
                />
              </FormField>

              <FormField
                label="Registration Number (Optional)"
                error={errors.registrationNumber}
              >
                <Input
                  value={formData.registrationNumber}
                  onChange={(e) =>
                    updateFormData("registrationNumber", e.target.value)
                  }
                  placeholder="CIN or Registration Number"
                  error={!!errors.registrationNumber}
                />
              </FormField>

              <FormField label="Tax ID/GST (Optional)" error={errors.taxId}>
                <Input
                  value={formData.taxId}
                  onChange={(e) => updateFormData("taxId", e.target.value)}
                  placeholder="GST Number"
                  error={!!errors.taxId}
                />
              </FormField>
            </div>

            <FormField label="Company Description" error={errors.description}>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    updateFormData("description", e.target.value)
                  }
                  rows="4"
                  placeholder="Tell us about your company and what services you need..."
                  className="pl-10"
                  error={!!errors.description}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(formData.description || "").length}/500 characters
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
                <p className="text-sm text-gray-600">
                  Where is your company located?
                </p>
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
                placeholder="Office/Site Address"
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
                  placeholder="Mumbai"
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
                options={[{ value: "India", label: "India" }]}
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
                  Job Interests
                </h2>
                <p className="text-sm text-gray-600">
                  What type of workers do you need?
                </p>
              </div>
            </div>

            <FormField
              label="Interested Job Categories"
              required
              error={errors.interestedCategories}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {INDIVIDUAL_JOB_CATEGORIES.map((category) => (
                  <motion.button
                    key={category.value}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleJobCategory(category.value)}
                    className={`p-3 border rounded-lg transition-colors ${
                      formData.interestedCategories.includes(category.value)
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
                Select all categories that apply (
                {formData.interestedCategories.length} selected)
              </p>
            </FormField>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Contact Person
                </h2>
                <p className="text-sm text-gray-600">
                  Primary contact for job postings
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Contact Person Name"
                required
                error={errors["contactPerson.name"]}
              >
                <Input
                  value={formData.contactPerson.name}
                  onChange={(e) =>
                    updateFormData("contactPerson.name", e.target.value)
                  }
                  placeholder="Amit Sharma"
                  error={!!errors["contactPerson.name"]}
                />
              </FormField>

              <FormField
                label="Designation"
                required
                error={errors["contactPerson.designation"]}
              >
                <Input
                  value={formData.contactPerson.designation}
                  onChange={(e) =>
                    updateFormData("contactPerson.designation", e.target.value)
                  }
                  placeholder="HR Manager"
                  error={!!errors["contactPerson.designation"]}
                />
              </FormField>

              <FormField
                label="Contact Phone"
                required
                error={errors["contactPerson.phone"]}
              >
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={formData.contactPerson.phone}
                    onChange={(e) =>
                      updateFormData("contactPerson.phone", e.target.value)
                    }
                    placeholder="+919876543210"
                    className="pl-10"
                    error={!!errors["contactPerson.phone"]}
                  />
                </div>
              </FormField>

              <FormField
                label="Contact Email"
                error={errors["contactPerson.email"]}
              >
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={formData.contactPerson.email}
                    onChange={(e) =>
                      updateFormData("contactPerson.email", e.target.value)
                    }
                    type="email"
                    placeholder="amit@company.com"
                    className="pl-10"
                    error={!!errors["contactPerson.email"]}
                  />
                </div>
              </FormField>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Social Profiles (Optional)
              </h3>
              <div className="space-y-4">
                <FormField
                  label="LinkedIn URL"
                  error={errors["socialProfiles.linkedin"]}
                >
                  <Input
                    value={formData.socialProfiles.linkedin}
                    onChange={(e) =>
                      updateFormData("socialProfiles.linkedin", e.target.value)
                    }
                    placeholder="https://linkedin.com/company/your-company"
                    error={!!errors["socialProfiles.linkedin"]}
                  />
                </FormField>

                <FormField
                  label="Facebook URL"
                  error={errors["socialProfiles.facebook"]}
                >
                  <Input
                    value={formData.socialProfiles.facebook}
                    onChange={(e) =>
                      updateFormData("socialProfiles.facebook", e.target.value)
                    }
                    placeholder="https://facebook.com/your.company"
                    error={!!errors["socialProfiles.facebook"]}
                  />
                </FormField>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Shield className="w-5 h-5 text-indigo-600" />
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
                  Company Information
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Company:</span>{" "}
                    {formData.companyName}
                  </p>
                  <p>
                    <span className="font-medium">Type:</span>{" "}
                    {formData.companyType}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span> {formData.phone}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {formData.email || "Not provided"}
                  </p>
                  <p>
                    <span className="font-medium">Wallet:</span>{" "}
                    {formData.walletAddress}
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
                  Job Interests
                </h4>
                <p className="text-sm text-gray-600">
                  {formData.interestedCategories.join(", ") ||
                    "No categories selected"}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">
                  Contact Person
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {formData.contactPerson.name}
                  </p>
                  <p>
                    <span className="font-medium">Designation:</span>{" "}
                    {formData.contactPerson.designation}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span>{" "}
                    {formData.contactPerson.phone}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {formData.contactPerson.email || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-start mb-8">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-3xl font-bold text-blue-800 mb-2"
            >
              Register Your Company
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-600 text-lg"
            >
              Create your profile and start hiring workers
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
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
                    className="flex items-center space-x-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
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
        </div>
      </div>
    </div>
  );
};

export default CompanySignupForm;