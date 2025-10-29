import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  DollarSign,
  Clock,
  Briefcase,
  Calendar,
  CheckCircle,
  Send,
  Building,
  Zap,
} from "lucide-react";

const JobListingCard = ({ job, onClick, onApply, showApplyButton = true }) => {
  const [isApplying, setIsApplying] = useState(false);

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

  const formatPayment = (lamports) => {
    const sol = lamports / 1_000_000_000;
    return sol.toFixed(2);
  };

  const calculateDays = (hours) => {
    const days = Math.ceil(hours / 8);
    return days === 1 ? "1 day" : `${days} days`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleApplyClick = async (e) => {
    e.stopPropagation();
    setIsApplying(true);
    try {
      await onApply(job._id);
    } catch (error) {
      console.error("Error applying:", error);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden cursor-pointer"
    >
      <div onClick={() => onClick(job)} className="p-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1 pr-2">
              {job.title}
            </h3>
            {job.isUrgent && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex-shrink-0">
                <Zap size={12} />
                URGENT
              </span>
            )}
          </div>

          {/* Category Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                job.category
              )}`}
            >
              <Briefcase size={12} />
              {job.category.replace("_", " ").toUpperCase()}
            </span>
          </div>

          <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
            {job.description}
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Payment */}
          <div className="flex items-center space-x-2 bg-green-50 p-2 rounded-lg">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-700 font-medium">Payment</p>
              <p className="text-sm font-bold text-green-600">
                {formatPayment(job.paymentAmount)} SOL
              </p>
              <p className="text-xs text-green-600">
                ≈ ₹{job.paymentAmountINR?.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center space-x-2 bg-blue-50 p-2 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-700 font-medium">Duration</p>
              <p className="text-sm font-bold text-blue-600">
                {job.durationHours} hrs
              </p>
              <p className="text-xs text-blue-600">
                {calculateDays(job.durationHours)}
              </p>
            </div>
          </div>

          {/* Location - Full Width */}
          <div className="flex items-center space-x-2 bg-purple-50 p-2 rounded-lg col-span-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MapPin className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-purple-700 font-medium">Location</p>
              <p className="text-sm font-medium text-purple-900 truncate">
                {job.location?.address}
              </p>
              <p className="text-xs text-purple-600">
                {job.location?.city}, {job.location?.state}
              </p>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {job.companyName?.charAt(0).toUpperCase() || "C"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Posted by</p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {job.companyName || "Company"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs text-gray-400 flex-shrink-0">
            <Calendar size={12} />
            <span>{formatDate(job.createdAt)}</span>
          </div>
        </div>

        {/* Applications Count (if applicable) */}
        {job.applications && job.applications.length > 0 && (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              {job.applications.length} worker
              {job.applications.length !== 1 ? "s" : ""} applied
            </p>
          </div>
        )}
      </div>

      {/* Footer with Apply Button */}
      {showApplyButton && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-3 border-t border-gray-200">
          {job.hasApplied ? (
            <button
              disabled
              className="w-full py-2.5 bg-gray-300 text-gray-600 rounded-lg font-semibold cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle size={18} />
              <span>Already Applied</span>
            </button>
          ) : (
            <button
              onClick={handleApplyClick}
              disabled={isApplying}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Apply Now</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
    </motion.div>
  );
};

export default JobListingCard;
