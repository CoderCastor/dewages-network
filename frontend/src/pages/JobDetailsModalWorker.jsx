import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  DollarSign,
  Clock,
  Briefcase,
  Calendar,
  FileText,
  Building,
  Send,
  CheckCircle,
  Info,
  Shield,
  ExternalLink,
  Copy,
  Key,
  Loader2,
  PlayCircle,
  StopCircle,
  Award,
  Timer,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "../env-variables";
import toast from "react-hot-toast";

const JobDetailsModalWorker = ({
  isOpen,
  onClose,
  job,
  onApply,
  onViewCompany,
  showApplyButton = true,
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [submittingOTP, setSubmittingOTP] = useState(null);
  const [otpInput, setOtpInput] = useState({ start: "", end: "" });
  const [showOTPInput, setShowOTPInput] = useState({
    start: false,
    end: false,
  });
  const [disputeTimeRemaining, setDisputeTimeRemaining] = useState(null);

  // Calculate dispute period countdown
  useEffect(() => {
    if (
      job?.status === "pending_verification" &&
      job?.disputePeriod?.isActive &&
      job?.disputePeriod?.endsAt
    ) {
      const updateTimer = () => {
        const now = new Date();
        const endsAt = new Date(job.disputePeriod.endsAt);
        const diffMs = endsAt - now;

        if (diffMs <= 0) {
          setDisputeTimeRemaining({ expired: true });
          return;
        }

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        setDisputeTimeRemaining({ days, hours, minutes, expired: false });
      };

      updateTimer();
      const interval = setInterval(updateTimer, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [job?.disputePeriod, job?.status]);

  // Validation: Check if job exists and has required fields
  if (!isOpen || !job) return null;

  // Validate job._id exists
  if (!job._id) {
    console.error("Job object missing _id:", job);
    return null;
  }

  const getCategoryColor = (category) => {
    const colors = {
      construction: "bg-orange-100 text-orange-700 border-orange-200",
      delivery: "bg-blue-100 text-blue-700 border-blue-200",
      domestic_help: "bg-purple-100 text-purple-700 border-purple-200",
      event_staffing: "bg-pink-100 text-pink-700 border-pink-200",
      agriculture: "bg-green-100 text-green-700 border-green-200",
      cleaning: "bg-cyan-100 text-cyan-700 border-cyan-200",
      security: "bg-red-100 text-red-700 border-red-200",
      other: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return colors[category] || colors.other;
  };

  const formatPayment = (lamports) => {
    if (!lamports) return "0.00";
    const sol = lamports / 1_000_000_000;
    return sol.toFixed(2);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const copyToClipboard = (text, label) => {
    if (!text) {
      toast.error("Nothing to copy");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleApply = async () => {
    if (!job._id) {
      toast.error("Invalid job data");
      return;
    }

    setIsApplying(true);
    try {
      await onApply(job._id);
    } catch (error) {
      console.error("Error applying to job:", error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleOTPSubmit = async (otpType) => {
    const otpCode = otpInput[otpType].trim();

    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    if (!job._id) {
      toast.error("Invalid job data");
      return;
    }

    setSubmittingOTP(otpType);
    const loadingToast = toast.loading(
      `Verifying ${otpType === "start" ? "Start Job" : "End Job"} OTP...`
    );

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Authentication required", { id: loadingToast });
        return;
      }

      const response = await axios.post(
        `${BACKEND_URL}/job/verify-otp`,
        {
          jobId: job._id,
          otpCode: otpCode,
          otpType: otpType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        toast.success(
          `${
            otpType === "start" ? "Job Started" : "Job Completed"
          } Successfully!`,
          { id: loadingToast }
        );

        // Clear input and hide form
        setOtpInput((prev) => ({ ...prev, [otpType]: "" }));
        setShowOTPInput((prev) => ({ ...prev, [otpType]: false }));

        // Close modal after success
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        toast.error(response.data.message || "Failed to verify OTP", {
          id: loadingToast,
        });
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to verify OTP";
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setSubmittingOTP(null);
    }
  };

  const renderOTPSection = (otpType) => {
    const isStart = otpType === "start";
    const isUsed = isStart ? job.startJobOTP?.isUsed : job.endJobOTP?.isUsed;
    const showInput = showOTPInput[otpType];

    if (isUsed) {
      return (
        <div
          className={`${
            isStart
              ? "bg-green-100 border-green-300"
              : "bg-orange-100 border-orange-300"
          } border-2 rounded-lg p-4`}
        >
          <div className="flex items-center space-x-3">
            <CheckCircle
              className={`w-6 h-6 ${
                isStart ? "text-green-700" : "text-orange-700"
              }`}
            />
            <div>
              <p
                className={`text-base font-bold ${
                  isStart ? "text-green-900" : "text-orange-900"
                }`}
              >
                {isStart ? "Job Started ✓" : "Job Completed ✓"}
              </p>
              <p
                className={`text-sm ${
                  isStart ? "text-green-600" : "text-orange-600"
                }`}
              >
                {isStart
                  ? "Work is in progress"
                  : "Waiting for payment release"}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (showInput) {
      return (
        <div
          className={`${
            isStart
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          } border-2 rounded-lg p-4`}
        >
          <div className="flex items-center space-x-2 mb-3">
            {isStart ? (
              <PlayCircle className="w-5 h-5 text-green-600" />
            ) : (
              <StopCircle className="w-5 h-5 text-red-600" />
            )}
            <p
              className={`text-base font-bold ${
                isStart ? "text-green-900" : "text-red-900"
              }`}
            >
              Enter {isStart ? "Start" : "End"} Job OTP
            </p>
          </div>
          <p
            className={`text-sm ${
              isStart ? "text-green-700" : "text-red-700"
            } mb-3`}
          >
            Get the OTP from the employer to {isStart ? "start" : "complete"}{" "}
            this job
          </p>
          <div className="flex space-x-3">
            <input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={otpInput[otpType]}
              onChange={(e) =>
                setOtpInput((prev) => ({
                  ...prev,
                  [otpType]: e.target.value.replace(/\D/g, ""),
                }))
              }
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => handleOTPSubmit(otpType)}
              disabled={
                submittingOTP === otpType || otpInput[otpType].length !== 6
              }
              className={`px-6 py-3 ${
                isStart
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              } text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submittingOTP === otpType ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                "Verify"
              )}
            </button>
          </div>
          <button
            onClick={() => {
              setShowOTPInput((prev) => ({ ...prev, [otpType]: false }));
              setOtpInput((prev) => ({ ...prev, [otpType]: "" }));
            }}
            className="text-sm text-gray-500 hover:text-gray-700 mt-3"
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() =>
          setShowOTPInput((prev) => ({ ...prev, [otpType]: true }))
        }
        className={`w-full flex items-center justify-center space-x-2 py-3 px-4 ${
          isStart
            ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            : "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
        } text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg`}
      >
        <Key className="w-5 h-5" />
        <span>Enter {isStart ? "Start" : "End"} Job OTP</span>
      </button>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Job Details</h2>
                  <p className="text-blue-100 text-sm">
                    Posted on {formatDate(job.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Title and Category */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {job.title}
              </h3>
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(
                    job.category
                  )}`}
                >
                  <Briefcase size={14} />
                  {job.category?.replace("_", " ").toUpperCase() || "N/A"}
                </span>
              </div>
              <p className="text-gray-700 text-lg leading-relaxed">
                {job.description}
              </p>
            </div>

            {/* Key Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Payment */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">
                      Payment
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatPayment(job.paymentAmount)} SOL
                    </p>
                    {job.paymentAmountINR && (
                      <p className="text-xs text-green-600">
                        ≈ ₹{job.paymentAmountINR.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium">
                      Duration
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {job.durationHours} hours
                    </p>
                    <p className="text-xs text-blue-600">
                      ≈ {Math.ceil(job.durationHours / 8)} working days
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            {job.location && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-purple-700 font-medium mb-1">
                      Job Location
                    </p>
                    <p className="text-base font-semibold text-purple-900">
                      {job.location.address || "N/A"}
                    </p>
                    <p className="text-sm text-purple-700">
                      {job.location.city || "N/A"},{" "}
                      {job.location.state || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Requirements
                    </h4>
                    <p className="text-gray-700 leading-relaxed">
                      {job.requirements}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* OTP Section for In-Progress Jobs */}
            {job.status === "in_progress" && (
              <div className="mb-6 space-y-3">
                <h4 className="text-lg font-bold text-gray-900 mb-3">
                  Job Progress
                </h4>

                {/* Start OTP */}
                {renderOTPSection("start")}

                {/* End OTP - Only show if start OTP is used */}
                {job.startJobOTP?.isUsed && renderOTPSection("end")}

                {/* Job Progress Indicator */}
                {job.startJobOTP?.isUsed && !job.endJobOTP?.isUsed && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Work in progress - Complete to enter End OTP
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dispute Period Status */}
            {job.status === "pending_verification" &&
              job.disputePeriod?.isActive && (
                <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Shield className="w-6 h-6 text-yellow-600" />
                    <p className="text-base font-bold text-yellow-900">
                      Dispute Period Active
                    </p>
                  </div>
                  {disputeTimeRemaining && !disputeTimeRemaining.expired ? (
                    <div className="bg-white bg-opacity-60 rounded p-3">
                      <p className="text-xs text-yellow-700 mb-2">
                        Time Remaining:
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xl font-bold text-yellow-900">
                            {disputeTimeRemaining.days}
                          </p>
                          <p className="text-xs text-yellow-600">Days</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-yellow-900">
                            {disputeTimeRemaining.hours}
                          </p>
                          <p className="text-xs text-yellow-600">Hours</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-yellow-900">
                            {disputeTimeRemaining.minutes}
                          </p>
                          <p className="text-xs text-yellow-600">Mins</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        <p className="text-sm text-blue-700 font-medium">
                          Payment will be transferred within 30 minutes
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Fund Transfer Status */}
            {job.fundTransfer?.isTransferred && (
              <div className="mb-6 bg-green-50 border-2 border-green-400 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Award className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="text-base font-bold text-green-900">
                      Payment Received!
                    </p>
                    <p className="text-sm text-green-700">
                      {formatPayment(
                        job.fundTransfer.amount || job.paymentAmount
                      )}{" "}
                      SOL transferred to your wallet
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Company Info */}
            {job.companyName && job.companyWallet && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-lg">
                        {job.companyName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 font-medium">
                        Posted by
                      </p>
                      <p className="text-lg font-bold text-blue-900">
                        {job.companyName}
                      </p>
                      <p className="text-xs text-blue-600 font-mono">
                        {job.companyWallet.slice(0, 8)}...
                        {job.companyWallet.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onViewCompany(job.companyWallet)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Building size={16} />
                    View Company
                  </button>
                </div>
              </div>
            )}

            {/* Blockchain Details */}
            {job.jobPDA && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-semibold text-indigo-900">
                    Blockchain Security
                  </h4>
                  <Info size={14} className="text-indigo-500" />
                </div>
                <p className="text-sm text-indigo-700 mb-3">
                  Payment is secured in escrow smart contract. You'll receive
                  payment automatically after job completion and verification.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-indigo-600 font-medium">
                      Job PDA:
                    </span>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-indigo-100 px-2 py-1 rounded font-mono text-indigo-900">
                        {job.jobPDA.slice(0, 8)}...{job.jobPDA.slice(-8)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(job.jobPDA, "Job PDA")}
                        className="p-1 hover:bg-indigo-200 rounded transition-colors"
                      >
                        <Copy className="w-4 h-4 text-indigo-600" />
                      </button>
                    </div>
                  </div>
                  {job.transactionSignature && (
                    <a
                      href={`https://explorer.solana.com/tx/${job.transactionSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View on Solana Explorer</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer with Apply Button */}
          {showApplyButton && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Ready to apply?</p>
                  <p className="text-xs">
                    You'll be notified once the company reviews your application
                  </p>
                </div>
                {job.hasApplied ? (
                  <button
                    disabled
                    className="px-8 py-3 bg-gray-300 text-gray-600 rounded-lg font-semibold cursor-not-allowed flex items-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Applied
                  </button>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={isApplying}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isApplying ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Applying...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Apply Now
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default JobDetailsModalWorker;
