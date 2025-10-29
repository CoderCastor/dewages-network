import React, { useState } from "react";
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
  User,
} from "lucide-react";
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

  if (!isOpen || !job) return null;

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
    const sol = lamports / 1_000_000_000;
    return sol.toFixed(2);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleApply = async () => {
    setIsApplying(true);
    await onApply(job._id);
    setIsApplying(false);
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
                  {job.category.replace("_", " ").toUpperCase()}
                </span>
                {job.isUrgent && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 border-red-200">
                    URGENT HIRING
                  </span>
                )}
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
                    <p className="text-xs text-green-600">
                      ≈ ₹{job.paymentAmountINR?.toLocaleString("en-IN")}
                    </p>
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
                    {job.location?.address}
                  </p>
                  <p className="text-sm text-purple-700">
                    {job.location?.city}, {job.location?.state}
                  </p>
                </div>
              </div>
            </div>

            {/* Requirements */}
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

            {/* Company Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">
                      {job.companyName?.charAt(0).toUpperCase() || "C"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium">
                      Posted by
                    </p>
                    <p className="text-lg font-bold text-blue-900">
                      {job.companyName || "Company"}
                    </p>
                    <p className="text-xs text-blue-600 font-mono">
                      {job.companyWallet?.slice(0, 8)}...
                      {job.companyWallet?.slice(-8)}
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

            {/* Blockchain Details */}
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
                      {job.jobPDA?.slice(0, 8)}...{job.jobPDA?.slice(-8)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(job.jobPDA, "Job PDA")}
                      className="p-1 hover:bg-indigo-200 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-indigo-600" />
                    </button>
                  </div>
                </div>
                <a
                  href={`https://explorer.solana.com/tx/${job.transactionSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View on Solana Explorer</span>
                </a>
              </div>
            </div>
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
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50"
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
