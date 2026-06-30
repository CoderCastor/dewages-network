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
  FileCheck,
  Camera,
  Navigation,
  CheckCircle2,
} from "lucide-react";
import axios from "axios";
import { BACKEND_URL, RPC_URL, PROGRAM_ID } from "../env-variables";
import toast from "react-hot-toast";
import RatingModal from "../components/common/RatingModal";
import ProofCaptureModal from "../components/ProofCaptureModal";
import { useTranslation } from "react-i18next";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import IDL from "../idl/employment_platform.json" with { type: "json" };

const JobDetailsModalWorker = ({
  isOpen,
  onClose,
  job,
  onApply,
  onViewCompany,
  showApplyButton = true,
}) => {
  const { t } = useTranslation();
  const [isApplying, setIsApplying] = useState(false);
  const [submittingOTP, setSubmittingOTP] = useState(null);
  const [otpInput, setOtpInput] = useState({ start: "", end: "" });
  const [showOTPInput, setShowOTPInput] = useState({
    start: false,
    end: false,
  });
  const [disputeTimeRemaining, setDisputeTimeRemaining] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const wallet = useWallet();
  const { connection } = useConnection();
  const [showProofPopup, setShowProofPopup] = useState(false);
  const [showBeforeProofPopup, setShowBeforeProofPopup] = useState(false);
  const [proofData, setProofData] = useState(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  // QR scan handler for delivery jobs
  const handleQRScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-scan-temp-worker");
      const decoded = await scanner.scanFile(file, false);
      setOtpInput((prev) => ({ ...prev, end: decoded.trim() }));
      toast.success("QR scanned! Tap Verify to complete.");
    } catch {
      toast.error("Could not read QR code — enter the OTP manually below.");
    } finally {
      e.target.value = "";
    }
  };

  // OTP-not-provided dispute state
  const [showNoOtpDispute, setShowNoOtpDispute] = useState(false);
  const [noOtpReason, setNoOtpReason] = useState("");
  const [noOtpPhotoUrl, setNoOtpPhotoUrl] = useState(null);
  const [noOtpGps, setNoOtpGps] = useState(null);
  const [uploadingNoOtpPhoto, setUploadingNoOtpPhoto] = useState(false);
  const [submittingNoOtpDispute, setSubmittingNoOtpDispute] = useState(false);

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

    // For end OTP, check if company is rated first
    if (otpType === "end" && !job.employerRating) {
      setShowRatingModal(true);
      return;
    }

    await verifyOTP(otpType, otpCode);
  };

  const handleRatingSubmit = async (rating, review) => {
    try {
      if (wallet.connected && job.companyWallet) {
        toast.loading("Submitting rating to blockchain...", { id: "rating" });
        const provider = new AnchorProvider(connection, wallet, {
          preflightCommitment: "processed",
        });
        const program = new Program(idl, PROGRAM_ID, provider);
        
        const ratingKeypair = Keypair.generate();
        const [targetProfilePDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("user_profile"), new PublicKey(job.companyWallet).toBuffer()],
          new PublicKey(PROGRAM_ID)
        );
        
        await program.methods
          .rateUser(rating, review || "")
          .accounts({
            userRating: ratingKeypair.publicKey,
            job: new PublicKey(job.jobPDA),
            targetProfile: targetProfilePDA,
            targetUser: new PublicKey(job.companyWallet),
            rater: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([ratingKeypair])
          .rpc();
          
        toast.success("Rating recorded on blockchain!", { id: "rating" });
      }

      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${BACKEND_URL}/job/rating/worker`,
        {
          jobId: job._id,
          rating,
          review,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        toast.success("Rating saved locally!");
        const otpCode = otpInput.end.trim();
        await verifyOTP("end", otpCode);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error(error.message || "Failed to submit rating", { id: "rating" });
    }
  };

  const verifyOTP = async (otpType, otpCode) => {
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
        if (otpType === "start") {
          toast.success("Start OTP verified! Now capture your before-work photo.", { id: loadingToast });
          setOtpInput((prev) => ({ ...prev, [otpType]: "" }));
          setShowOTPInput((prev) => ({ ...prev, [otpType]: false }));
          setShowBeforeProofPopup(true);
        }

        if (otpType === "end" && response.data.requiresBlockchainProof) {
          toast.success("OTP Verified! Please submit proof on blockchain", {
            id: loadingToast,
          });
          setProofData(response.data.blockchainData);
          setShowProofPopup(true);
          setShowOTPInput((prev) => ({ ...prev, [otpType]: false }));
        } else if (otpType === "end") {
          toast.success("Job Completed Successfully!", { id: loadingToast });
          setOtpInput((prev) => ({ ...prev, [otpType]: "" }));
          setShowOTPInput((prev) => ({ ...prev, [otpType]: false }));
          setTimeout(() => {
            onClose();
          }, 1500);
        }
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

  const handleBeforeProofComplete = async ({ photoUrl, gpsCoordinates, otp }) => {
    setShowBeforeProofPopup(false);
    const loadingToast = toast.loading("Verifying Start OTP…");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BACKEND_URL}/job/verify-otp`,
        {
          jobId: job._id,
          otpCode: otp,
          otpType: "start",
          photoUrl: photoUrl || null,
          gpsCoordinates: gpsCoordinates || null,
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      if (response.data.success) {
        toast.success("Job Started! Before-work evidence saved.", { id: loadingToast });
        setOtpInput((prev) => ({ ...prev, start: "" }));
      } else {
        toast.error(response.data.message || "Invalid Start OTP", { id: loadingToast });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to verify OTP", { id: loadingToast });
    }
  };

  const handleProofCaptureComplete = async ({ photoUrl, gpsCoordinates, otp }) => {
    setShowProofPopup(false);

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
      const program = new Program(IDL, PROGRAM_ID, provider);

      const proofOfWorkKeypair = Keypair.generate();
      const proofAccountAddress = proofOfWorkKeypair.publicKey.toString();

      const jobPDA = new PublicKey(proofData.jobPDA);
      const workerPublicKey = wallet.publicKey;

      const photoKey = photoUrl ? photoUrl.split('/').pop()?.slice(0, 50) || 'photo' : 'no-photo';
      const proofDataBundle = JSON.stringify({
        otp,
        photo: photoKey,
        at: new Date().toISOString(),
      }).slice(0, 200);

      toast.loading("Please sign the transaction...", { id: loadingToast });

      const tx = await program.methods
        .submitProofOfWork(
          { photo: {} },
          proofDataBundle,
          null
        )
        .accounts({
          job: jobPDA,
          proofOfWork: proofOfWorkKeypair.publicKey,
          worker: workerPublicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      
      const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: tx.instructions,
      }).compileToV0Message();

      const versionedTx = new VersionedTransaction(messageV0);

      const walletSignedTx = await wallet.signTransaction(versionedTx);

      walletSignedTx.sign([proofOfWorkKeypair]);

      const txSignature = await connection.sendRawTransaction(walletSignedTx.serialize());

      toast.loading("Confirming transaction...", { id: loadingToast });
      await connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, "confirmed");

      toast.loading("Updating database...", { id: loadingToast });

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BACKEND_URL}/job/proof-submitted`,
        {
          jobId: job._id,
          txSignature,
          proofAccountAddress,
          proofType: "PHOTO_OTP",
          proofData: proofDataBundle,
          photoUrl: photoUrl || null,
          gpsCoordinates: gpsCoordinates || null,
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
        setOtpInput((prev) => ({ ...prev, end: "" }));
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error("Error submitting proof:", error);
      toast.error(error.message || "Failed to submit proof", { id: loadingToast });
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleNoOtpPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingNoOtpPhoto(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("photo", file);
      const res = await axios.post(`${BACKEND_URL}/upload/proof-photo`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) setNoOtpPhotoUrl(res.data.photoUrl);
    } catch {
      toast.error("Photo upload failed. You can still submit without it.");
    } finally {
      setUploadingNoOtpPhoto(false);
    }
  };

  const handleNoOtpGpsCapture = () => {
    if (!navigator.geolocation) { toast.error("GPS not available on this device"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNoOtpGps(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`);
        toast.success("GPS location captured");
      },
      () => toast.error("Could not get GPS. Check location permissions."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmitNoOtpDispute = async () => {
    if (!noOtpReason.trim()) { toast.error("Please describe the situation"); return; }
    setSubmittingNoOtpDispute(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BACKEND_URL}/job/dispute/raise`,
        {
          jobId: job._id,
          reason: noOtpReason.trim(),
          raisedBy: "worker",
          otpNotProvided: true,
          evidencePhotoUrl: noOtpPhotoUrl || null,
          evidenceGpsCoordinates: noOtpGps || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Dispute raised. Funds frozen until admin resolves.");
        setShowNoOtpDispute(false);
        setTimeout(() => onClose(), 1500);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to raise dispute");
    } finally {
      setSubmittingNoOtpDispute(false);
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
                {isStart ? t("job.jobInProgress") : t("job.jobCompleted")}
              </p>
              <p
                className={`text-sm ${
                  isStart ? "text-green-600" : "text-orange-600"
                }`}
              >
                {isStart
                  ? t("worker.inProgress")
                  : t("job.fundsTransferPending")}
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
              {isStart ? t("job.startJobOTP") : t("job.endJobOTP")}
            </p>
          </div>
          <p
            className={`text-sm ${
              isStart ? "text-green-700" : "text-red-700"
            } mb-3`}
          >
            {isStart ? t("proof.askStartOtp") : t("proof.askEndOtp")}
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
                t("common.verify")
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
            {t("common.cancel")}
          </button>
        </div>
      );
    }

    return (
      <>
        <button
          onClick={() => {
            setShowOTPInput((prev) => ({ ...prev, [otpType]: true }));
          }}
          className={`w-full flex items-center justify-center space-x-2 py-3 px-4 ${
            isStart
              ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              : "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
          } text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg`}
        >
          <Key className="w-5 h-5" />
          <span>{isStart ? t("job.startJobOTP") : t("job.endJobOTP")}</span>
        </button>

        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onSubmit={handleRatingSubmit}
          targetName={job.companyName || "Company"}
          targetType="company"
        />
      </>
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
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{t("jobDetail.title")}</h2>
                  <p className="text-blue-100 text-sm">
                    {t("jobDetail.postedOn")} {formatDate(job.createdAt)}
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

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">
                      {t("common.payment")}
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

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium">
                      {t("common.duration")}
                    </p>
                    <p className="text-2xl font-bold text-blue-900">
                      {job.durationHours} {t("jobDetail.hours")}
                    </p>
                    <p className="text-xs text-blue-600">
                      ≈ {Math.ceil(job.durationHours / 8)} {t("jobDetail.workingDays")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {job.location && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-purple-700 font-medium mb-1">
                      {t("jobDetail.jobLocation")}
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

            {job.requirements && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {t("jobDetail.requirements")}
                    </h4>
                    <p className="text-gray-700 leading-relaxed">
                      {job.requirements}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {job.status === "in_progress" && (
              <div className="mb-6 space-y-3">
                <h4 className="text-lg font-bold text-gray-900 mb-3">
                  {t("jobDetail.jobProgress")}
                </h4>

                {renderOTPSection("start")}

                {job.startJobOTP?.isUsed && (
                  showOTPInput.end ? (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-700">
                        {job.category === "delivery" ? t("jobDetail.scanOrEnterOtp") : t("jobDetail.enterEndOtpFromEmployer")}
                      </p>
                      
                      {job.category === "delivery" && (
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            id="qr-upload"
                            onChange={handleQRScan}
                          />
                          <label
                            htmlFor="qr-upload"
                            className="flex items-center justify-center space-x-2 w-full py-3 bg-blue-50 text-blue-700 font-semibold rounded-xl border-2 border-blue-200 border-dashed cursor-pointer hover:bg-blue-100 transition-colors"
                          >
                            <Camera className="w-5 h-5" />
                            <span>{t("jobDetail.scanQrCode")}</span>
                          </label>
                        </div>
                      )}

                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpInput.end}
                          onChange={(e) =>
                            setOtpInput((prev) => ({
                              ...prev,
                              end: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="e.g. A1B2C3"
                          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 font-mono text-lg tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-base"
                        />
                        <button
                          onClick={() => handleOTPSubmit("end")}
                          disabled={submittingOTP === "end" || otpInput.end.length !== 6}
                          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors flex items-center space-x-2 whitespace-nowrap"
                        >
                          {submittingOTP === "end" ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <span>{t("jobDetail.verifyAndEnd")}</span>
                              <CheckCircle2 className="w-5 h-5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowOTPInput((prev) => ({ ...prev, end: true }))}
                      className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg"
                    >
                      <Key className="w-5 h-5" />
                      <span>{t("jobDetail.enterEndJobOtp")}</span>
                    </button>
                  )
                )}

                {job.startJobOTP?.isUsed && !job.endJobOTP?.isUsed && !showOTPInput.end && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        {t("jobDetail.workInProgressNote")}
                      </span>
                    </div>
                  </div>
                )}

                {/* OTP Not Provided — dispute option */}
                {job.startJobOTP?.isUsed && !job.endJobOTP?.isUsed && !showNoOtpDispute && (
                  <button
                    onClick={() => setShowNoOtpDispute(true)}
                    className="w-full font-semibold text-sm text-white bg-red-600 hover:bg-red-700 rounded-xl py-3 px-4 transition-colors flex items-center justify-center gap-2 mt-2 shadow-md"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {t("jobDetail.employerNotGivingOtp")}
                  </button>
                )}

                {/* No-OTP Dispute Form */}
                {showNoOtpDispute && (
                  <div className="border-2 border-red-300 rounded-xl p-4 bg-red-50 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <p className="font-semibold text-red-800 text-sm">{t("jobDetail.raiseDisputeNoOtp")}</p>
                    </div>
                    <p className="text-xs text-red-700">
                      {t("jobDetail.fundsWillBeFrozen")} {t("jobDetail.evidenceStrengthens")}
                    </p>

                    <textarea
                      rows={3}
                      value={noOtpReason}
                      onChange={e => setNoOtpReason(e.target.value)}
                      placeholder="Describe the situation: e.g. I completed the painting work but the employer is refusing to give me the end OTP..."
                      className="w-full text-sm border border-red-300 rounded-lg p-3 focus:ring-2 focus:ring-red-400 resize-none"
                    />

                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleNoOtpPhotoUpload} />
                        <div className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-colors ${noOtpPhotoUrl ? "bg-green-100 border-green-400 text-green-700" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                          {uploadingNoOtpPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                          {noOtpPhotoUrl ? t("jobDetail.photoAdded") : t("jobDetail.addPhotoEvidence")}
                        </div>
                      </label>
                      <button
                        onClick={handleNoOtpGpsCapture}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-colors ${noOtpGps ? "bg-green-100 border-green-400 text-green-700" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                      >
                        <Navigation className="w-4 h-4" />
                        {noOtpGps ? t("jobDetail.gpsAdded") : t("jobDetail.captureGps")}
                      </button>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => { setShowNoOtpDispute(false); setNoOtpReason(""); setNoOtpPhotoUrl(null); setNoOtpGps(null); }}
                        className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitNoOtpDispute}
                        disabled={submittingNoOtpDispute || !noOtpReason.trim()}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submittingNoOtpDispute ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                        Raise Dispute
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {job.status === "pending_verification" &&
              job.disputePeriod?.isActive && (
                <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Shield className="w-6 h-6 text-yellow-600" />
                    <p className="text-base font-bold text-yellow-900">
                      {t("job.disputePeriodActive")}
                    </p>
                  </div>
                  {disputeTimeRemaining && !disputeTimeRemaining.expired ? (
                    <div className="bg-white bg-opacity-60 rounded p-3">
                      <p className="text-xs text-yellow-700 mb-2">
                        {t("job.timeRemaining")}:
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xl font-bold text-yellow-900">
                            {disputeTimeRemaining.days}
                          </p>
                          <p className="text-xs text-yellow-600">{t("job.days")}</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-yellow-900">
                            {disputeTimeRemaining.hours}
                          </p>
                          <p className="text-xs text-yellow-600">{t("job.hours")}</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-yellow-900">
                            {disputeTimeRemaining.minutes}
                          </p>
                          <p className="text-xs text-yellow-600">{t("job.mins")}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        <p className="text-sm text-blue-700 font-medium">
                          {t("jobDetail.paymentTransferSoon")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            {job.fundTransfer?.isTransferred && (
              <div className="mb-6 bg-green-50 border-2 border-green-400 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Award className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="text-base font-bold text-green-900">
                      {t("jobDetail.paymentReceived")}
                    </p>
                    <p className="text-sm text-green-700">
                      {formatPayment(
                        job.fundTransfer.amount || job.paymentAmount
                      )}{" "}
                      {t("jobDetail.solTransferred")}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                        {t("jobDetail.postedBy")}
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
                    {t("jobDetail.viewCompany")}
                  </button>
                </div>
              </div>
            )}

            {job.jobPDA && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-semibold text-indigo-900">
                    {t("jobDetail.blockchainSecurity")}
                  </h4>
                  <Info size={14} className="text-indigo-500" />
                </div>
                <p className="text-sm text-indigo-700 mb-3">
                  {t("jobDetail.escrowNote")}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-indigo-600 font-medium">
                      {t("jobDetail.jobPda")}
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
                      <span>{t("jobDetail.viewOnExplorer")}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {showApplyButton && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{t("jobDetail.readyToApply")}</p>
                  <p className="text-xs">
                    {t("jobDetail.applyNote")}
                  </p>
                </div>
                {job.hasApplied ? (
                  <button
                    disabled
                    className="px-8 py-3 bg-gray-300 text-gray-600 rounded-lg font-semibold cursor-not-allowed flex items-center gap-2"
                  >
                    <CheckCircle size={18} />
                    {t("worker.applied")}
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
                        {t("jobDetail.applying")}
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        {t("jobDetail.applyNow")}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
      {/* Before-Work Proof Capture Modal (Start OTP) */}
      <ProofCaptureModal
        isOpen={showBeforeProofPopup}
        onClose={() => setShowBeforeProofPopup(false)}
        otpValue=""
        jobId={job._id}
        jobTitle={job.title}
        mode="before"
        onComplete={handleBeforeProofComplete}
      />
      {/* After-Work Proof Capture Modal (End OTP + blockchain) */}
      <ProofCaptureModal
        isOpen={showProofPopup}
        onClose={() => setShowProofPopup(false)}
        otpValue={otpInput.end}
        jobId={job._id}
        jobTitle={job.title}
        mode="after"
        onComplete={handleProofCaptureComplete}
      />
    </AnimatePresence>
  );
};

export default JobDetailsModalWorker;
