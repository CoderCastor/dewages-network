import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Briefcase,
  Eye,
  CheckCircle,
  AlertCircle,
  XCircle,
  Key,
  Loader2,
  Copy,
  PlayCircle,
  StopCircle,
  RefreshCw,
  Timer,
  Zap,
  Award,
  CheckCircle2,
  Shield,
  TrendingUp,
  Banknote,
  FileCheck,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "@/env-variables";
import toast from "react-hot-toast";
import CompanyOTPGenerator from "@/components/common/CompanyOTPGenerator";
import DisputeModal from "@/components/common/DisputeModal";

const JobCard = ({
  job,
  onClick,
  showApplications = false,
  onOTPGenerated,
  onUpdate,
}) => {
  const [generatingOTP, setGeneratingOTP] = useState(null);
  const [startOTP, setStartOTP] = useState(job.startJobOTP?.code || null);
  const [endOTP, setEndOTP] = useState(job.endJobOTP?.code || null);
  const [startOTPExpiry, setStartOTPExpiry] = useState(
    job.startJobOTP?.expiresAt || null
  );
  const [endOTPExpiry, setEndOTPExpiry] = useState(
    job.endJobOTP?.expiresAt || null
  );
  const [startOTPUsed, setStartOTPUsed] = useState(
    job.startJobOTP?.isUsed || false
  );
  const [endOTPUsed, setEndOTPUsed] = useState(job.endJobOTP?.isUsed || false);
  const [startOTPUsedAt, setStartOTPUsedAt] = useState(
    job.startJobOTP?.usedAt || null
  );
  const [endOTPUsedAt, setEndOTPUsedAt] = useState(
    job.endJobOTP?.usedAt || null
  );
  const [disputePeriodRemaining, setDisputePeriodRemaining] = useState(null);
  const [proofOfWork, setProofOfWork] = useState(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [localDispute, setLocalDispute] = useState(job.dispute || null);

  // Update state when job prop changes
  useEffect(() => {
    setStartOTP(job.startJobOTP?.code || null);
    setEndOTP(job.endJobOTP?.code || null);
    setStartOTPExpiry(job.startJobOTP?.expiresAt || null);
    setEndOTPExpiry(job.endJobOTP?.expiresAt || null);
    setStartOTPUsed(job.startJobOTP?.isUsed || false);
    setEndOTPUsed(job.endJobOTP?.isUsed || false);
    setStartOTPUsedAt(job.startJobOTP?.usedAt || null);
    setEndOTPUsedAt(job.endJobOTP?.usedAt || null);
  }, [job]);

  // Calculate dispute period countdown — FROZEN when job is disputed
  useEffect(() => {
    // If already disputed, don't run the live countdown
    if (job.status === "disputed" || localDispute?.status) return;

    if (job.disputePeriod?.isActive && job.disputePeriod?.endsAt) {
      const updateTimer = () => {
        const now = new Date();
        const endsAt = new Date(job.disputePeriod.endsAt);
        const diffMs = endsAt - now;

        if (diffMs <= 0) {
          setDisputePeriodRemaining({ expired: true });
          return;
        }

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        setDisputePeriodRemaining({
          days,
          hours,
          minutes,
          seconds,
          expired: false,
        });
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    }
  }, [job.disputePeriod, job.status, localDispute]);

  // Fetch proof of work if job is pending verification or completed
  useEffect(() => {
    if (job.status === "pending_verification" || job.status === "completed") {
      fetchProofOfWork();
    }
  }, [job.status, job._id]);

  const fetchProofOfWork = async () => {
    try {
      setLoadingProof(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(`${BACKEND_URL}/job/${job._id}/proof`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setProofOfWork(response.data.proof);
      }
    } catch (error) {
      console.log("Proof not available yet");
    } finally {
      setLoadingProof(false);
    }
  };

  // Check if OTP is expired
  const isOTPExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Format expiry time
  const formatExpiryTime = (expiryDate) => {
    if (!expiryDate) return "";
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffMs = expiry - now;

    if (diffMs < 0) return "Expired";

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `Expires in ${diffHours}h ${diffMins}m`;
    }
    return `Expires in ${diffMins}m`;
  };

  // Format used date/time
  const formatUsedTime = (usedDate) => {
    if (!usedDate) return "";
    const date = new Date(usedDate);
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Format payment amount
  const formatPayment = (lamports) => {
    const sol = lamports / 1_000_000_000;
    return sol.toFixed(2);
  };

  // Status badge configuration
  const getStatusConfig = (status) => {
    const configs = {
      open: {
        color: "bg-green-100 text-green-700 border-green-200",
        icon: CheckCircle,
        label: "Open",
      },
      in_progress: {
        color: "bg-blue-100 text-blue-700 border-blue-200",
        icon: Clock,
        label: "In Progress",
      },
      pending_verification: {
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: AlertCircle,
        label: "Pending Verification",
      },
      completed: {
        color: "bg-gray-100 text-gray-700 border-gray-200",
        icon: CheckCircle,
        label: "Completed",
      },
      disputed: {
        color: "bg-red-100 text-red-700 border-red-200",
        icon: AlertCircle,
        label: "Disputed",
      },
      cancelled: {
        color: "bg-gray-100 text-gray-500 border-gray-200",
        icon: XCircle,
        label: "Cancelled",
      },
    };
    return configs[status] || configs.open;
  };

  // Category badge color
  const getCategoryColor = (category) => {
    const colors = {
      construction: "bg-orange-100 text-orange-700",
      delivery: "bg-blue-100 text-blue-700",
      domestic_help: "bg-purple-100 text-purple-700",
      event_staffing: "bg-pink-100 text-pink-700",
      agriculture: "bg-green-100 text-green-700",
      cleaning: "bg-cyan-100 text-cyan-700",
      security: "bg-red-100 text-red-700",
      other: "bg-gray-100 text-gray-700",
    };
    return colors[category] || colors.other;
  };

  const statusConfig = getStatusConfig(job.status);
  const StatusIcon = statusConfig.icon;

  // Calculate days from hours
  const calculateDays = (hours) => {
    const days = Math.ceil(hours / 8);
    return days === 1 ? "1 day" : `${days} days`;
  };

  // Handle OTP Generation
  const handleGenerateOTP = async (e, otpType) => {
    e.stopPropagation();

    setGeneratingOTP(otpType);
    const loadingToast = toast.loading(
      `Generating ${otpType === "start" ? "Start Job" : "End Job"} OTP...`
    );

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${BACKEND_URL}/job/generate-otp`,
        { jobId: job._id, otpType },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        const { code, expiresAt } = response.data.otp;

        if (otpType === "start") {
          setStartOTP(code);
          setStartOTPExpiry(expiresAt);
        } else {
          setEndOTP(code);
          setEndOTPExpiry(expiresAt);
        }

        toast.success(
          `${
            otpType === "start" ? "Start Job" : "End Job"
          } OTP generated successfully!`,
          { id: loadingToast }
        );

        if (onOTPGenerated) {
          onOTPGenerated(job._id, code, otpType);
        }
      } else {
        toast.error(response.data.message || "Failed to generate OTP", {
          id: loadingToast,
        });
      }
    } catch (error) {
      console.error("Error generating OTP:", error);
      toast.error(error.response?.data?.message || "Failed to generate OTP", {
        id: loadingToast,
      });
    } finally {
      setGeneratingOTP(null);
    }
  };

  // Copy OTP to clipboard
  const handleCopyOTP = (e, otp, type) => {
    e.stopPropagation();
    navigator.clipboard.writeText(otp);
    toast.success(
      `${type === "start" ? "Start Job" : "End Job"} OTP copied to clipboard!`
    );
  };

  // Copy text to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Render OTP Card
  const renderOTPCard = (otpType) => {
    const isStart = otpType === "start";
    
    // For End OTP, use the CompanyOTPGenerator component
    if (!isStart) {
      return (
        <CompanyOTPGenerator
          job={job}
          onOTPGenerated={(otp) => {
            setEndOTP(otp.code);
            setEndOTPExpiry(otp.expiresAt);
            if (onOTPGenerated) onOTPGenerated(job._id, otp.code, "end");
            if (onUpdate) onUpdate();
          }}
        />
      );
    }
    
    // Start OTP rendering logic remains the same
    const otp = startOTP;
    const expiryDate = startOTPExpiry;
    const isUsed = startOTPUsed;
    const usedAt = startOTPUsedAt;
    const isExpired = isOTPExpired(expiryDate);
    const isGenerating = generatingOTP === otpType;

    const bgColor = isStart
      ? isUsed
        ? "from-green-100 to-emerald-100 border-green-300"
        : "from-green-50 to-emerald-50 border-green-200"
      : isUsed
      ? "from-orange-100 to-red-100 border-orange-300"
      : "from-red-50 to-orange-50 border-red-200";

    const buttonColor = isStart
      ? "from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
      : "from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600";

    const iconColor = isStart ? "text-green-600" : "text-red-600";
    const usedIconColor = isStart ? "text-green-700" : "text-orange-700";
    const Icon = isStart ? PlayCircle : StopCircle;
    const label = isStart ? "Start Job OTP" : "End Job OTP";

    return (
      <div
        className={`bg-gradient-to-r ${bgColor} border-2 rounded-lg p-3 shadow-sm`}
      >
        {isUsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={`p-1.5 ${
                    isStart ? "bg-green-200" : "bg-orange-200"
                  } rounded-full`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${usedIconColor}`} />
                </div>
                <div>
                  <p className={`text-xs ${usedIconColor} font-semibold`}>
                    {label}
                  </p>
                  <p className={`text-lg font-bold ${usedIconColor}`}>
                    ✓ OTP Used
                  </p>
                </div>
              </div>
              <div
                className={`p-2 ${
                  isStart ? "bg-green-200" : "bg-orange-200"
                } rounded-lg`}
              >
                {isStart ? (
                  <Zap className={`w-5 h-5 ${usedIconColor}`} />
                ) : (
                  <Award className={`w-5 h-5 ${usedIconColor}`} />
                )}
              </div>
            </div>

            <div
              className={`bg-white bg-opacity-60 rounded-lg p-2 border ${
                isStart ? "border-green-300" : "border-orange-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">
                    {isStart ? "Work in Progress" : "Job Completed"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Used on {formatUsedTime(usedAt)}
                  </p>
                </div>
                <CheckCircle className={`w-6 h-6 ${usedIconColor}`} />
              </div>
            </div>

            {isStart && (
              <div className="flex items-center space-x-1 text-xs text-gray-600 bg-white bg-opacity-50 rounded px-2 py-1">
                <Clock className="w-3 h-3" />
                <span className="font-medium">Worker has started the job</span>
              </div>
            )}

            {!isStart && (
              <div className="flex items-center space-x-1 text-xs text-gray-600 bg-white bg-opacity-50 rounded px-2 py-1">
                <Award className="w-3 h-3" />
                <span className="font-medium">
                  Worker has completed the job
                </span>
              </div>
            )}
          </div>
        ) : otp && !isExpired ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Icon className={`w-4 h-4 ${iconColor}`} />
                <p className={`text-xs ${iconColor} font-medium`}>{label}</p>
              </div>
              <button
                onClick={(e) => handleCopyOTP(e, otp, otpType)}
                className={`p-1.5 hover:bg-white hover:bg-opacity-50 rounded transition-colors`}
                title="Copy OTP"
              >
                <Copy className={`w-3.5 h-3.5 ${iconColor}`} />
              </button>
            </div>

            <div className="bg-white bg-opacity-70 rounded-lg p-2 mb-2">
              <p
                className={`text-2xl font-bold ${iconColor} tracking-wider font-mono text-center`}
              >
                {otp}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1 text-gray-600">
                <Timer className="w-3 h-3" />
                <span>{formatExpiryTime(expiryDate)}</span>
              </div>
              <span className={`${iconColor} font-medium`}>
                Share with worker
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={(e) => handleGenerateOTP(e, otpType)}
            disabled={isGenerating}
            className={`w-full flex items-center justify-center space-x-2 py-2.5 px-3 bg-gradient-to-r ${buttonColor} text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md hover:shadow-lg`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                {isExpired ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>OTP Expired - Regenerate</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Generate {isStart ? "Start" : "End"} OTP</span>
                  </>
                )}
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  // Render Proof of Work Section
  const renderProofOfWorkSection = () => {
    if (!proofOfWork) return null;

    return (
      <div className="bg-indigo-50 border-2 border-indigo-300 rounded-lg p-4 shadow-sm">
        <div className="flex items-center space-x-2 mb-3">
          <FileCheck className="w-5 h-5 text-indigo-600" />
          <h4 className="font-semibold text-indigo-900">
            Proof of Work Submitted
          </h4>
        </div>

        <div className="space-y-2 bg-white rounded-lg p-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Proof Type:</span>
            <span className="font-medium text-gray-900">
              {proofOfWork.proofType.toUpperCase()}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Submitted:</span>
            <span className="font-medium text-gray-900">
              {formatUsedTime(proofOfWork.submittedAt)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Worker:</span>
            <span className="font-medium text-gray-900">
              {proofOfWork.workerName || "Worker"}
            </span>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Proof Data:</p>
            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
              {proofOfWork.proofData}
            </p>
          </div>

          <a
            href={`https://explorer.solana.com/tx/${proofOfWork.txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-700 pt-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Proof Transaction</span>
          </a>

          <div className="flex items-center space-x-2 pt-2">
            <span className="text-xs text-gray-600">Proof Account:</span>
            <code className="text-xs bg-indigo-100 px-2 py-1 rounded font-mono">
              {proofOfWork.accountAddress.slice(0, 8)}...
              {proofOfWork.accountAddress.slice(-8)}
            </code>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(proofOfWork.accountAddress, "Proof Account");
              }}
              className="p-1 hover:bg-indigo-200 rounded transition-colors"
            >
              <Copy className="w-3 h-3 text-indigo-600" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Dispute Period Status
  const renderDisputePeriodStatus = () => {
    const activeDispute = localDispute || job.dispute;

    // ── Dispute already raised ──────────────────────────────────────────────
    if (job.status === "disputed" || activeDispute?.status) {
      const raisedBy = activeDispute?.raisedBy;
      const isMyDispute = raisedBy === "company";
      return (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-900">Dispute Raised</p>
              <p className="text-xs text-red-600">
                {isMyDispute ? "Raised by you" : "Raised by the worker"}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-red-200 text-sm text-red-800">
            <p className="font-medium mb-1">Reason:</p>
            <p className="text-xs text-gray-700">{activeDispute?.reason || "—"}</p>
          </div>
          <p className="text-xs text-red-500 mt-3 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Funds frozen in escrow — Admin is reviewing
          </p>
        </div>
      );
    }

    if (
      !job.disputePeriod ||
      (job.status !== "pending_verification" && job.status !== "completed")
    ) {
      return null;
    }

    const { isActive, isExpired } = job.disputePeriod;
    const fundsTransferred = job.fundTransfer?.isTransferred || false;

    // Case 1: Dispute period active — show countdown + Raise Dispute button
    if (
      isActive &&
      !isExpired &&
      disputePeriodRemaining &&
      !disputePeriodRemaining.expired
    ) {
      const { days, hours, minutes, seconds } = disputePeriodRemaining;

      return (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg p-4 shadow-md space-y-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-yellow-200 rounded-lg">
              <Shield className="w-5 h-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-yellow-900">Dispute Period Active</p>
              <p className="text-xs text-yellow-700">Raise a dispute if work was unsatisfactory</p>
            </div>
          </div>

          <div className="bg-white bg-opacity-70 rounded-lg p-3 border border-yellow-300">
            <p className="text-xs text-yellow-700 font-medium mb-2">Time Remaining:</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><p className="text-2xl font-bold text-yellow-900">{days}</p><p className="text-xs text-yellow-600">Days</p></div>
              <div><p className="text-2xl font-bold text-yellow-900">{hours}</p><p className="text-xs text-yellow-600">Hours</p></div>
              <div><p className="text-2xl font-bold text-yellow-900">{minutes}</p><p className="text-xs text-yellow-600">Mins</p></div>
              <div><p className="text-2xl font-bold text-yellow-900">{seconds}</p><p className="text-xs text-yellow-600">Secs</p></div>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setShowDisputeModal(true); }}
            className="w-full py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center space-x-2 transition-all shadow-sm"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Raise Dispute</span>
          </button>
        </div>
      );
    }

    // Case 2: Dispute period expired, waiting for fund transfer
    if (isExpired && !fundsTransferred) {
      return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 shadow-md">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-200 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900 mb-1">
                Funds Transfer Pending
              </p>
              <p className="text-xs text-blue-700 mb-3">
                Dispute period has ended. Processing payment transfer to worker.
              </p>
              <div className="bg-white bg-opacity-70 rounded-lg p-2 border border-blue-300">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-xs text-blue-700 font-medium">
                    Payment will be transferred within 30 minutes...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Case 3: Funds transferred
    if (fundsTransferred) {
      return (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-4 shadow-md">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-green-200 rounded-lg">
              <Banknote className="w-6 h-6 text-green-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-green-900 mb-1">
                Payment Transferred
              </p>
              <p className="text-xs text-green-700 mb-2">
                Funds successfully transferred to worker on{" "}
                {formatUsedTime(job.fundTransfer.transferredAt)}
              </p>
              <div className="bg-white bg-opacity-70 rounded-lg p-2 border border-green-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-700">Amount:</span>
                  <span className="text-sm font-bold text-green-900">
                    {formatPayment(
                      job.fundTransfer.amount || job.paymentAmount
                    )}{" "}
                    SOL
                  </span>
                </div>
                {job.fundTransfer.transactionSignature && (
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs text-green-600 mb-1">Transaction:</p>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-green-100 px-2 py-1 rounded font-mono flex-1 truncate">
                        {job.fundTransfer.transactionSignature.slice(0, 20)}...
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(
                            job.fundTransfer.transactionSignature,
                            "Transaction signature"
                          );
                        }}
                        className="p-1 hover:bg-green-200 rounded"
                      >
                        <Copy className="w-3 h-3 text-green-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 overflow-hidden"
      >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
              {job.title}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-2">
              {job.description}
            </p>
          </div>
        </div>

        {/* Status & Category Badges */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}
          >
            <StatusIcon size={12} />
            {statusConfig.label}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(
              job.category
            )}`}
          >
            <Briefcase size={12} />
            {job.category.replace("_", " ").toUpperCase()}
          </span>
        </div>

        {/* Job Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium text-gray-900">
                {job.location?.city || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <DollarSign className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Payment</p>
              <p className="text-sm font-bold text-green-600">
                {formatPayment(job.paymentAmount)} SOL
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Clock className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Duration</p>
              <p className="text-sm font-medium text-gray-900">
                {calculateDays(job.durationHours)}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Posted</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(job.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Applications Count (for open jobs) */}
        {showApplications && job.status === "open" && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {job.applications?.length || 0} Application
                {job.applications?.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
              <Eye size={14} />
              View Details
            </button>
          </div>
        )}

        {/* Worker Info + Dual OTP Section (for in-progress jobs) */}
        {job.status === "in_progress" && job.workerName && (
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-bold text-base">
                    {job.workerName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">
                    Assigned Worker
                  </p>
                  <p className="text-sm font-bold text-blue-900">
                    {job.workerName}
                  </p>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-blue-300">
                <Eye size={14} />
                View
              </button>
            </div>

            {startOTPUsed && !endOTPUsed && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">
                      Job In Progress
                    </p>
                    <p className="text-xs text-blue-600">
                      Worker is actively working on this task
                    </p>
                  </div>
                </div>
              </div>
            )}

            {startOTPUsed && endOTPUsed && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Award className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-bold text-green-900">
                      Job Completed!
                    </p>
                    <p className="text-xs text-green-600">
                      Worker has finished the task successfully
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {renderOTPCard("start")}
              {renderOTPCard("end")}
            </div>
          </div>
        )}

        {/* Proof of Work + Dispute Period Status (for pending_verification/completed/disputed jobs) */}
        {(job.status === "pending_verification" ||
          job.status === "disputed" ||
          job.status === "completed") && (
          <div className="pt-4 border-t border-gray-100 space-y-3">
            {job.workerName && (
              <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {job.workerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Worker</p>
                    <p className="text-sm font-medium text-gray-900">
                      {job.workerName}
                    </p>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                  <Eye size={14} />
                  View
                </button>
              </div>
            )}

            {/* Render Proof of Work */}
            {proofOfWork && renderProofOfWorkSection()}

            {/* Render Dispute Period Status / Dispute status */}
            {renderDisputePeriodStatus()}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Click to view full details
        </p>
      </div>
    </motion.div>

    {/* Dispute Modal — portal, escapes transform stacking context */}
    {showDisputeModal && (
      <DisputeModal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        job={job}
        raisedBy="company"
        onDisputeRaised={(dispute) => {
          setLocalDispute(dispute);
          setShowDisputeModal(false);
          if (onUpdate) onUpdate();
        }}
      />
    )}
    </>
  );
};

export default JobCard;
