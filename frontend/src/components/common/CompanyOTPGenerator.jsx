import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Key, Loader2, Copy } from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "../../env-variables";
import toast from "react-hot-toast";
import RatingModal from "./RatingModal";

const CompanyOTPGenerator = ({ job, onOTPGenerated }) => {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ratingDone, setRatingDone] = useState(!!job.workerRating);
  const [localOTP, setLocalOTP] = useState(null);

  // Stop click from bubbling to parent card (which opens job details modal)
  const stopProp = (e) => e.stopPropagation();

  const handleGenerateClick = (e) => {
    e.stopPropagation();
    if (ratingDone || job.workerRating) {
      generateOTP();
    } else {
      setShowRatingModal(true);
    }
  };

  const handleRatingSubmit = async (rating, review) => {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${BACKEND_URL}/job/rating/company`,
      { jobId: job._id, rating, review },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to submit rating");
    }

    toast.success("Rating submitted!");
    setRatingDone(true);
    setShowRatingModal(false);
    await generateOTP();
  };

  const generateOTP = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BACKEND_URL}/job/generate-otp`,
        { jobId: job._id, otpType: "end" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("End Job OTP generated!");
        setLocalOTP(response.data.otp?.code || null);
        if (onOTPGenerated) onOTPGenerated(response.data.otp);
      } else {
        toast.error(response.data.message || "Failed to generate OTP");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate OTP");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyOTP = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    toast.success("OTP copied to clipboard!");
  };

  if (job.status !== "in_progress" || !job.assignedWorker) return null;

  // Show OTP (either freshly generated local state OR from job data)
  const displayOTP = localOTP || job.endJobOTP?.code;
  const otpUsed = job.endJobOTP?.isUsed;

  if (displayOTP && !otpUsed) {
    return (
      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4" onClick={stopProp}>
        <p className="text-sm font-medium text-orange-700 mb-2">End Job OTP</p>
        <div className="flex items-center justify-between">
          <p className="text-3xl font-bold text-orange-900 tracking-wider font-mono">
            {displayOTP}
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => copyOTP(e, displayOTP)}
              className="p-2 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors"
              title="Copy OTP"
            >
              <Copy className="w-5 h-5 text-orange-600" />
            </button>
            <Key className="w-6 h-6 text-orange-400" />
          </div>
        </div>
        <p className="text-xs text-orange-600 mt-2">Share this OTP with the worker to complete the job</p>
      </div>
    );
  }

  if (otpUsed) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4" onClick={stopProp}>
        <p className="text-sm font-medium text-green-700">✓ End OTP has been used — Job completed</p>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleGenerateClick}
        disabled={isGenerating}
        className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating OTP...</span>
          </>
        ) : (
          <>
            <Key className="w-5 h-5" />
            <span>
              {ratingDone || job.workerRating
                ? "Generate End Job OTP"
                : "Rate Worker & Get End OTP"}
            </span>
          </>
        )}
      </button>

      {/* Portal: renders directly into document.body, escaping any CSS transform stacking context */}
      {showRatingModal &&
        createPortal(
          <RatingModal
            isOpen={showRatingModal}
            onClose={() => {}}
            onSubmit={handleRatingSubmit}
            targetName={job.workerName || "the Worker"}
            targetType="worker"
          />,
          document.body
        )}
    </>
  );
};

export default CompanyOTPGenerator;
