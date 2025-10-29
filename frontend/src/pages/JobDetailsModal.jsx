import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  DollarSign,
  Clock,
  Calendar,
  Briefcase,
  User,
  Users,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Shield,
  FileText,
  Eye,
  UserCheck,
  Star,
} from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "@/env-variables";
import toast from "react-hot-toast";

const JobDetailsModal = ({ isOpen, onClose, job, onUpdate }) => {
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showWorkerDetails, setShowWorkerDetails] = useState(false);

  useEffect(() => {
    if (isOpen && job && job.status === "open") {
      fetchApplications();
    }
  }, [isOpen, job]);

  const fetchApplications = async () => {
    try {
      setLoadingApplications(true);
      const token = localStorage.getItem("token");
      
      const response = await axios.get(
        `${BACKEND_URL}/job/${job._id}/applications`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setApplications(response.data.applications);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleApproveWorker = async (workerWallet) => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await axios.post(
        `${BACKEND_URL}/job/approve-worker`,
        {
          jobId: job._id,
          workerWallet,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success("Worker approved! Please complete blockchain transaction.");
        
        // TODO: Add blockchain assign_worker transaction here
        // After blockchain success, update job status
        
        if (onUpdate) onUpdate();
        onClose();
      }
    } catch (error) {
      console.error("Error approving worker:", error);
      toast.error("Failed to approve worker");
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPayment = (lamports) => {
    const sol = lamports / 1_000_000_000;
    return sol.toFixed(2);
  };

  const getStatusColor = (status) => {
    const colors = {
      open: "bg-green-100 text-green-700 border-green-200",
      in_progress: "bg-blue-100 text-blue-700 border-blue-200",
      pending_verification: "bg-yellow-100 text-yellow-700 border-yellow-200",
      completed: "bg-gray-100 text-gray-700 border-gray-200",
      disputed: "bg-red-100 text-red-700 border-red-200",
      cancelled: "bg-gray-100 text-gray-500 border-gray-200",
    };
    return colors[status] || colors.open;
  };

  if (!isOpen || !job) return null;

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
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
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

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Title and Status */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-2xl font-bold text-gray-900">{job.title}</h3>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                    job.status
                  )}`}
                >
                  {job.status.replace("_", " ").toUpperCase()}
                </span>
              </div>
              <p className="text-gray-600 text-lg">{job.description}</p>
            </div>

            {/* Key Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Payment */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">Payment</p>
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Duration</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {job.durationHours} hours
                    </p>
                    <p className="text-xs text-blue-600">
                      ≈ {Math.ceil(job.durationHours / 8)} day
                      {Math.ceil(job.durationHours / 8) > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Location</p>
                    <p className="text-base font-semibold text-purple-900">
                      {job.location?.city}
                    </p>
                    <p className="text-xs text-purple-600">
                      {job.location?.address}, {job.location?.state}
                    </p>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Briefcase className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-700 font-medium">Category</p>
                    <p className="text-base font-semibold text-orange-900 capitalize">
                      {job.category.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Requirements</h4>
              </div>
              <p className="text-gray-700">{job.requirements}</p>
            </div>

            {/* Blockchain Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Blockchain Details</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Job PDA:</span>
                  <div className="flex items-center space-x-2">
                    <code className="text-xs bg-blue-100 px-2 py-1 rounded font-mono">
                      {job.jobPDA?.slice(0, 8)}...{job.jobPDA?.slice(-8)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(job.jobPDA, "Job PDA")}
                      className="p-1 hover:bg-blue-200 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Escrow PDA:</span>
                  <div className="flex items-center space-x-2">
                    <code className="text-xs bg-blue-100 px-2 py-1 rounded font-mono">
                      {job.escrowPDA?.slice(0, 8)}...{job.escrowPDA?.slice(-8)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(job.escrowPDA, "Escrow PDA")}
                      className="p-1 hover:bg-blue-200 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>
                <a
                  href={`https://explorer.solana.com/tx/${job.transactionSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 mt-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View Transaction on Explorer</span>
                </a>
              </div>
            </div>

            {/* Worker Info (if assigned) */}
            {job.assignedWorker && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 mb-3">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">Assigned Worker</h4>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                      <span className="text-green-700 font-semibold">
                        {job.workerName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">{job.workerName}</p>
                      <p className="text-xs text-green-600 font-mono">
                        {job.assignedWorker.slice(0, 8)}...
                        {job.assignedWorker.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(job.assignedWorker, "Worker Address")}
                    className="p-2 hover:bg-green-200 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4 text-green-600" />
                  </button>
                </div>
              </div>
            )}

            {/* Applications Section (for open jobs) */}
            {job.status === "open" && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-gray-600" />
                    <h4 className="font-semibold text-gray-900">
                      Applications ({applications.length})
                    </h4>
                  </div>
                </div>

                {loadingApplications ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No applications yet</p>
                    <p className="text-sm text-gray-500">
                      Workers will see this job and can apply
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <div
                        key={app.workerWallet}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600 font-semibold text-lg">
                                {app.workerName?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h5 className="font-semibold text-gray-900">
                                  {app.workerName}
                                </h5>
                                {app.workerDetails && (
                                  <div className="flex items-center space-x-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="text-sm font-medium text-gray-700">
                                      {app.workerDetails.rating?.toFixed(1) || "N/A"}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {app.workerDetails && (
                                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                  <span>
                                    {app.workerDetails.completedJobs || 0} jobs completed
                                  </span>
                                  <span className="capitalize">
                                    {app.workerDetails.experienceLevel}
                                  </span>
                                </div>
                              )}

                              {app.coverLetter && (
                                <p className="text-sm text-gray-600 mb-2">
                                  {app.coverLetter}
                                </p>
                              )}

                              <p className="text-xs text-gray-500">
                                Applied on {formatDate(app.appliedAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col space-y-2 ml-4">
                            <button
                              onClick={() => {
                                setSelectedWorker(app.workerDetails);
                                setShowWorkerDetails(true);
                              }}
                              className="px-4 py-2 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-1"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View Profile</span>
                            </button>
                            
                            {app.status === "pending" && (
                              <button
                                onClick={() => handleApproveWorker(app.workerWallet)}
                                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Approve</span>
                              </button>
                            )}
                            
                            {app.status === "approved" && (
                              <span className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg font-medium">
                                Approved
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Worker Details Modal (nested) */}
        {showWorkerDetails && selectedWorker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
            onClick={() => setShowWorkerDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Worker Profile</h3>
                <button
                  onClick={() => setShowWorkerDetails(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold text-3xl">
                      {selectedWorker.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedWorker.name}
                  </h4>
                  <div className="flex items-center justify-center space-x-2 text-yellow-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= (selectedWorker.rating || 0)
                            ? "fill-yellow-500"
                            : ""
                        }`}
                      />
                    ))}
                    <span className="text-gray-700 font-semibold ml-2">
                      {selectedWorker.rating?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-blue-700">Total Jobs</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {selectedWorker.totalJobs || 0}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-green-700">Completed</p>
                    <p className="text-2xl font-bold text-green-900">
                      {selectedWorker.completedJobs || 0}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">Experience Level</h5>
                    <p className="text-gray-700 capitalize">
                      {selectedWorker.experienceLevel}
                    </p>
                  </div>

                  {selectedWorker.skills && selectedWorker.skills.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">Skills</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedWorker.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default JobDetailsModal;