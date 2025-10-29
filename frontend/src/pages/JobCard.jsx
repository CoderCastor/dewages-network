import React from "react";
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
} from "lucide-react";

const JobCard = ({ job, onClick, showApplications = false }) => {
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

  return (
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
          {/* Location */}
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium text-gray-900">
                {job.location?.city || "N/A"}
              </p>
            </div>
          </div>

          {/* Payment */}
          <div className="flex items-start space-x-2">
            <DollarSign className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Payment</p>
              <p className="text-sm font-bold text-green-600">
                {formatPayment(job.paymentAmount)} SOL
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-start space-x-2">
            <Clock className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Duration</p>
              <p className="text-sm font-medium text-gray-900">
                {calculateDays(job.durationHours)}
              </p>
            </div>
          </div>

          {/* Posted Date */}
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

        {/* Worker Info (for in-progress/completed jobs) */}
        {(job.status === "in_progress" ||
          job.status === "pending_verification" ||
          job.status === "completed") &&
          job.workerName && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
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
                View Progress
              </button>
            </div>
          )}
      </div>

      {/* Footer - Hover Action */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Click to view full details
        </p>
      </div>
    </motion.div>
  );
};

export default JobCard;
