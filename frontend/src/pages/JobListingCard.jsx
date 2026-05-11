import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RatingModal from "@/components/common/RatingModal";
import DisputeModal from "@/components/common/DisputeModal";
import {
  MapPin,
  Clock,
  DollarSign,
  Briefcase,
  Calendar,
  CheckCircle,
  Key,
  Loader2,
  PlayCircle,
  StopCircle,
  Award,
  Shield,
  TrendingUp,
  FileCheck,
  ExternalLink,
  Copy,
  Banknote,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";
import { BACKEND_URL, RPC_URL, PROGRAM_ID } from "../env-variables";
import toast from "react-hot-toast";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import idl from "../idl/employment_platform.json" with { type: "json" };

const JobListingCard = ({
  job,
  onClick,
  onApply,
  showApplyButton = false,
  onOTPUsed,
}) => {
  const wallet = useWallet();
  const [submittingOTP, setSubmittingOTP] = useState(null);
  const [otpInput, setOtpInput] = useState({ start: "", end: "" });
  const [showOTPInput, setShowOTPInput] = useState({ start: false, end: false });
  const [showProofPopup, setShowProofPopup] = useState(false);
  const [proofData, setProofData] = useState(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [disputeTimeRemaining, setDisputeTimeRemaining] = useState(null);
  const [proofOfWork, setProofOfWork] = useState(null);
  const [fetchedProof, setFetchedProof] = useState(false);
  // Worker rating flow
  const [showWorkerRatingModal, setShowWorkerRatingModal] = useState(false);
  const [workerRatingDone, setWorkerRatingDone] = useState(!!job.employerRating);
  // Dispute flow
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [localDispute, setLocalDispute] = useState(job.dispute || null);

  // Calculate dispute period countdown — FROZEN when job is disputed
  useEffect(() => {
    // Don't tick when a dispute is already raised
    if (job.status === "disputed" || localDispute?.status) return;

    if (
      job.status === "pending_verification" &&
      job.disputePeriod?.isActive &&
      job.disputePeriod?.endsAt
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
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        setDisputeTimeRemaining({ days, hours, minutes, seconds, expired: false });
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    }
  }, [job.disputePeriod, job.status, localDispute]);

  // Fetch proof of work
  useEffect(() => {
    const shouldFetch =
      (job.status === "pending_verification" || job.status === "completed") &&
      !proofOfWork;

    if (shouldFetch) {
      fetchProofOfWork();
    }
  }, [job._id, job.status]);

  const fetchProofOfWork = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BACKEND_URL}/job/${job._id}/proof`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setProofOfWork(response.data.proof);
        setFetchedProof(true);
      }
    } catch (error) {
      console.log("Proof not available yet");
      setFetchedProof(true);
    }
  }, [job._id]);

  const formatPayment = (lamports) => {
    const sol = lamports / 1_000_000_000;
    return sol.toFixed(2);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleOTPSubmit = async (e, otpType) => {
    e.stopPropagation();

    const otpCode = otpInput[otpType].trim();

    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setSubmittingOTP(otpType);
    const loadingToast = toast.loading(
      `Verifying ${otpType === "start" ? "Start Job" : "End Job"} OTP...`
    );

    try {
      const token = localStorage.getItem("token");

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
        if (otpType === "start") {
          toast.success("Job Started Successfully!", { id: loadingToast });
          setOtpInput((prev) => ({ ...prev, [otpType]: "" }));
          setShowOTPInput((prev) => ({ ...prev, [otpType]: false }));
          if (onOTPUsed) onOTPUsed(job._id, otpType);
        }

        if (otpType === "end" && response.data.requiresBlockchainProof) {
          toast.success("OTP Verified! Please submit proof on blockchain", {
            id: loadingToast,
          });
          setProofData(response.data.blockchainData);
          setShowProofPopup(true);
          setShowOTPInput((prev) => ({ ...prev, [otpType]: false }));
        }
      } else {
        toast.error(response.data.message || "Failed to verify OTP", {
          id: loadingToast,
        });
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error(error.response?.data?.message || "Failed to verify OTP", {
        id: loadingToast,
      });
    } finally {
      setSubmittingOTP(null);
    }
  };

  const handleSubmitProof = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error("Please connect your wallet");
      return;
    }

    setSubmittingProof(true);
    const loadingToast = toast.loading("Preparing blockchain transaction...");

    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const provider = new AnchorProvider(
        connection,
        wallet,
        AnchorProvider.defaultOptions()
      );
      const program = new Program(idl, PROGRAM_ID, provider);

      const proofOfWorkKeypair = Keypair.generate();
      const proofAccountAddress = proofOfWorkKeypair.publicKey.toString();

      const jobPDA = new PublicKey(proofData.jobPDA);
      const workerPublicKey = new PublicKey(proofData.workerWallet);

      toast.loading("Please sign the transaction...", { id: loadingToast });

      const txSignature = await program.methods
        .submitProofOfWork({ otp: {} }, proofData.proofData, null)
        .accounts({
          job: jobPDA,
          proofOfWork: proofOfWorkKeypair.publicKey,
          worker: workerPublicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([proofOfWorkKeypair])
        .rpc();

      toast.loading("Confirming transaction...", { id: loadingToast });
      await connection.confirmTransaction(txSignature, "confirmed");

      toast.loading("Updating database...", { id: loadingToast });

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BACKEND_URL}/job/proof-submitted`,
        {
          jobId: job._id,
          txSignature: txSignature,
          proofAccountAddress: proofAccountAddress,
          proofType: "OTP",
          proofData: proofData.proofData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        toast.success("Proof submitted! Dispute period started.", {
          id: loadingToast,
        });

        setProofOfWork({
          accountAddress: proofAccountAddress,
          txSignature: txSignature,
          proofType: "OTP",
          proofData: proofData.proofData,
          submittedAt: new Date(),
          isVerified: false,
        });

        setShowProofPopup(false);
        setOtpInput((prev) => ({ ...prev, end: "" }));
        if (onOTPUsed) onOTPUsed(job._id, "end");
      }
    } catch (error) {
      console.error("Error submitting proof:", error);
      toast.error(error.message || "Failed to submit proof", { id: loadingToast });
    } finally {
      setSubmittingProof(false);
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
              ? "bg-green-50 border-green-300"
              : "bg-orange-50 border-orange-300"
          } border-2 rounded-lg p-3`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle
              className={`w-5 h-5 ${
                isStart ? "text-green-600" : "text-orange-600"
              }`}
            />
            <div>
              <p
                className={`text-sm font-bold ${
                  isStart ? "text-green-900" : "text-orange-900"
                }`}
              >
                {isStart ? "Job Started ✓" : "Job Completed ✓"}
              </p>
              <p
                className={`text-xs ${
                  isStart ? "text-green-600" : "text-orange-600"
                }`}
              >
                {isStart ? "Work is in progress" : "Proof submitted"}
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
          } border-2 rounded-lg p-3`}
        >
          <div className="flex items-center space-x-2 mb-2">
            {isStart ? (
              <PlayCircle className="w-4 h-4 text-green-600" />
            ) : (
              <StopCircle className="w-4 h-4 text-red-600" />
            )}
            <p
              className={`text-sm font-semibold ${
                isStart ? "text-green-900" : "text-red-900"
              }`}
            >
              Enter {isStart ? "Start" : "End"} OTP
            </p>
          </div>
          <div className="flex space-x-2">
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
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={(e) => handleOTPSubmit(e, otpType)}
              disabled={submittingOTP === otpType}
              className={`px-4 py-2 ${
                isStart
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              } text-white rounded-lg font-medium transition-colors disabled:opacity-50`}
            >
              {submittingOTP === otpType ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Verify"
              )}
            </button>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOTPInput((prev) => ({ ...prev, [otpType]: false }));
              setOtpInput((prev) => ({ ...prev, [otpType]: "" }));
            }}
            className="text-xs text-gray-500 hover:text-gray-700 mt-2"
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isStart && !workerRatingDone && !job.employerRating) {
            // Must rate company before entering End OTP
            setShowWorkerRatingModal(true);
          } else {
            setShowOTPInput((prev) => ({ ...prev, [otpType]: true }));
          }
        }}
        className={`w-full flex items-center justify-center space-x-2 py-2 px-3 ${
          isStart
            ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            : "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
        } text-white rounded-lg font-medium transition-all text-sm`}
      >
        <Key className="w-4 h-4" />
        <span>
          {isStart
            ? "Enter Start OTP"
            : workerRatingDone || job.employerRating
            ? "Enter End OTP"
            : "Rate Company & Enter End OTP"}
        </span>
      </button>
    );
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 p-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
              {job.title}
            </h3>
            <p className="text-sm text-gray-600 mb-2">{job.companyName}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(
              job.category
            )}`}
          >
            <Briefcase size={12} />
            {job.category.replace("_", " ").toUpperCase()}
          </span>
        </div>

        {/* Job Details */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-xs text-gray-500">Payment</p>
              <p className="text-sm font-bold text-green-600">
                {formatPayment(job.paymentAmount)} SOL
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Duration</p>
              <p className="text-sm font-medium text-gray-900">
                {Math.ceil(job.durationHours / 8)} days
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-purple-500" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium text-gray-900">
                {job.location?.city || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <div>
              <p className="text-xs text-gray-500">Posted</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(job.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Apply Button */}
        {showApplyButton && !job.hasApplied && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply(job._id);
            }}
            className="w-full mt-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Apply Now
          </button>
        )}

        {/* Applied Badge */}
        {job.hasApplied && (
          <div className="mt-3 py-2 bg-green-100 text-green-700 rounded-lg font-medium text-center flex items-center justify-center space-x-2">
            <CheckCircle size={18} />
            <span>Applied</span>
          </div>
        )}

        {/* OTP Sections */}
        {job.status === "in_progress" && (
          <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
            {renderOTPSection("start")}
            {job.startJobOTP?.isUsed && renderOTPSection("end")}

            {job.startJobOTP?.isUsed && !job.endJobOTP?.isUsed && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-900">
                    Work in progress - Complete to enter End OTP
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Proof of Work Section */}
        {(job.status === "pending_verification" || job.status === "completed") &&
          proofOfWork && (
            <div className="mt-3 border-t border-gray-200 pt-3">
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-3 mb-2">
                <div className="flex items-center space-x-2 mb-2">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <p className="text-sm font-bold text-indigo-900">
                    Proof of Work Verified
                  </p>
                </div>

                <div className="space-y-2 bg-white rounded p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted:</span>
                    <span className="font-medium text-gray-900">
                      {formatDateTime(proofOfWork.submittedAt)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium text-gray-900">
                      {proofOfWork.proofType}
                    </span>
                  </div>

                  <a
                    href={`https://explorer.solana.com/tx/${proofOfWork.txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-700 pt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View on Solana Explorer</span>
                  </a>

                  <div className="pt-2 border-t border-indigo-100">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Proof Account:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(
                            proofOfWork.accountAddress,
                            "Proof Account Address"
                          );
                        }}
                        className="p-1 hover:bg-indigo-100 rounded"
                      >
                        <Copy className="w-3 h-3 text-indigo-600" />
                      </button>
                    </div>
                    <code className="text-xs bg-indigo-100 px-2 py-1 rounded font-mono block mt-1">
                      {proofOfWork.accountAddress?.slice(0, 16)}...
                      {proofOfWork.accountAddress?.slice(-16)}
                    </code>
                  </div>
                </div>
              </div>

              {/* ✅ Fund Transfer Status / Dispute status shows after proof */}

            </div>
        )}

        {/* Bug Fix #4: Dispute already raised — show OUTSIDE proofOfWork block so it renders on Dispute tab */}
        {(job.status === "disputed" || (localDispute || job.dispute)?.status) && (
          <div className="mt-3 bg-red-50 border-2 border-red-300 rounded-lg p-3 mb-2">
            <div className="flex items-center space-x-2 mb-2">
              <div className="p-1.5 bg-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-700" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-900">⚠️ Dispute Raised</p>
                <p className="text-xs text-red-600">
                  {(localDispute || job.dispute)?.raisedBy === "worker"
                    ? "Raised by you (worker)"
                    : `Raised by the company`}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-2 border border-red-200 mb-2">
              <p className="text-xs font-medium text-red-800 mb-0.5">Reason:</p>
              <p className="text-xs text-gray-700">{(localDispute || job.dispute)?.reason || "—"}</p>
            </div>
            {(localDispute || job.dispute)?.createdAt && (
              <p className="text-xs text-red-500 mb-1">
                Raised on: {new Date((localDispute || job.dispute).createdAt).toLocaleString()}
              </p>
            )}
            <p className="text-xs text-red-500 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Funds frozen — Admin is reviewing
            </p>
          </div>
        )}


        {/* Dispute Period Active — show countdown + Raise Dispute */}
        {!job.dispute?.status && job.status !== "disputed" &&
          job.disputePeriod?.isActive &&
          !job.disputePeriod?.isExpired &&
          disputeTimeRemaining &&
          !disputeTimeRemaining.expired && (
            <div className="mt-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 mb-2 space-y-2">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-yellow-600" />
                <p className="text-sm font-bold text-yellow-900">Dispute Period Active</p>
              </div>
              <div className="bg-white bg-opacity-60 rounded p-2">
                <p className="text-xs text-yellow-700 mb-1">Time Remaining:</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div><p className="text-lg font-bold text-yellow-900">{disputeTimeRemaining.days}</p><p className="text-xs text-yellow-600">Days</p></div>
                  <div><p className="text-lg font-bold text-yellow-900">{disputeTimeRemaining.hours}</p><p className="text-xs text-yellow-600">Hrs</p></div>
                  <div><p className="text-lg font-bold text-yellow-900">{disputeTimeRemaining.minutes}</p><p className="text-xs text-yellow-600">Mins</p></div>
                  <div><p className="text-lg font-bold text-yellow-900">{disputeTimeRemaining.seconds}</p><p className="text-xs text-yellow-600">Secs</p></div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDisputeModal(true); }}
                className="w-full py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Raise Dispute</span>
              </button>
            </div>
          )}

        {/* Dispute Expired - Transfer Pending */}
        {job.disputePeriod?.isExpired && !job.fundTransfer?.isTransferred && (
          <div className="mt-3 bg-blue-50 border-2 border-blue-300 rounded-lg p-3 mb-2">
            <div className="flex items-start space-x-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900 mb-1">Payment Transfer Pending</p>
                <p className="text-xs text-blue-700">Dispute period ended. Funds will be transferred to your wallet soon.</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Transferred */}
        {job.fundTransfer?.isTransferred && (
          <div className="mt-3 bg-green-50 border-2 border-green-400 rounded-lg p-3">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-200 rounded-lg">
                <Award className="w-5 h-5 text-green-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-green-900 mb-1">Payment Received! 🎉</p>
                <div className="space-y-2 bg-white bg-opacity-70 rounded p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-bold text-green-700">{formatPayment(job.fundTransfer.amount || job.paymentAmount)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transferred:</span>
                    <span className="font-medium text-gray-900">{formatDateTime(job.fundTransfer.transferredAt)}</span>
                  </div>

                  {/* Wallet Address */}
                  <div className="pt-2 border-t border-green-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-600">To Wallet:</span>
                      <button onClick={(e) => { e.stopPropagation(); copyToClipboard(job.assignedWorker, "Wallet Address"); }} className="p-1 hover:bg-green-100 rounded">
                        <Copy className="w-3 h-3 text-green-600" />
                      </button>
                    </div>
                    <code className="text-xs bg-green-100 px-2 py-1 rounded font-mono block">
                      {job.assignedWorker?.slice(0, 16)}...{job.assignedWorker?.slice(-16)}
                    </code>
                  </div>

                  {/* Transaction Signature */}
                  {job.fundTransfer.transactionSignature && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-600">Transaction:</span>
                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(job.fundTransfer.transactionSignature, "Transaction Signature"); }} className="p-1 hover:bg-green-100 rounded">
                          <Copy className="w-3 h-3 text-green-600" />
                        </button>
                      </div>
                      <code className="text-xs bg-green-100 px-2 py-1 rounded font-mono block">
                        {job.fundTransfer.transactionSignature.slice(0, 20)}...
                      </code>
                      <a href={`https://explorer.solana.com/tx/${job.fundTransfer.transactionSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center space-x-1 text-green-600 hover:text-green-700 mt-1">
                        <ExternalLink className="w-3 h-3" />
                        <span>View Transaction</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>


      {/* Worker Rating Modal — shown before end OTP entry */}
      {showWorkerRatingModal && (
        <RatingModal
          isOpen={showWorkerRatingModal}
          onClose={() => {}} // no-op: rating is mandatory
          onSubmit={async (rating, review) => {
            const token = localStorage.getItem("token");
            const response = await axios.post(
              `${BACKEND_URL}/job/rating/worker`,
              { jobId: job._id, rating, review },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.data.success) {
              throw new Error(response.data.message || "Failed to submit rating");
            }
            toast.success("Rating submitted!");
            setWorkerRatingDone(true);
            setShowWorkerRatingModal(false);
            // Now open the OTP input
            setShowOTPInput((prev) => ({ ...prev, end: true }));
          }}
          targetName={job.companyName || "the Company"}
          targetType="company"
        />
      )}

      {/* Proof of Work Popup */}
      <AnimatePresence>
        {showProofPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
            style={{ zIndex: 9998 }}
            onClick={() => !submittingProof && setShowProofPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <FileCheck className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Submit Proof of Work
                </h3>
                <p className="text-sm text-gray-600">
                  Sign the transaction to submit proof on blockchain and start
                  the dispute period
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Job:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {job.title}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Payment:</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatPayment(job.paymentAmount)} SOL
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowProofPopup(false)}
                  disabled={submittingProof}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitProof}
                  disabled={submittingProof}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {submittingProof ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-5 h-5" />
                      <span>Submit Proof</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Worker Dispute Modal */}
      {showDisputeModal && (
        <DisputeModal
          isOpen={showDisputeModal}
          onClose={() => setShowDisputeModal(false)}
          job={job}
          raisedBy="worker"
          onDisputeRaised={(dispute) => {
            setLocalDispute(dispute);
            setShowDisputeModal(false);
          }}
        />
      )}
    </>
  );
};

export default JobListingCard;
