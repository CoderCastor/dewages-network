import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import { BACKEND_URL } from "../env-variables";
import toast from "react-hot-toast";
import PostJobModal from "./PostJobModal";
import JobCard from "./JobCard";
import JobDetailsModal from "./JobDetailsModal";

const ACTIVE_CLASSES = {
  blue: "border-blue-500 text-blue-600",
  orange: "border-orange-500 text-orange-600",
  green: "border-green-500 text-green-600",
  red: "border-red-500 text-red-600",
};

const CompanyDashboard = () => {
  const { publicKey } = useWallet();

  const [activeTab, setActiveTab] = useState("active");
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Store jobs grouped by status
  const [jobsByStatus, setJobsByStatus] = useState({
    active: [],
    inProgress: [],
    completed: [],
    rejected: [],
  });

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    inProgress: 0,
    completed: 0,
    totalApplications: 0,
  });

  const tabs = [
    { id: "active", label: "Active Jobs", icon: Briefcase, color: "blue" },
    { id: "inProgress", label: "In Progress", icon: Clock, color: "orange" },
    { id: "completed", label: "Completed", icon: CheckCircle, color: "green" },
    { id: "rejected", label: "Rejected", icon: XCircle, color: "red" },
  ];

  useEffect(() => {
    if (publicKey) {
      fetchJobs();
      fetchStats();
    } else {
      setLoading(false);
      setJobsByStatus({
        active: [],
        inProgress: [],
        completed: [],
        rejected: [],
      });
    }
  }, [publicKey]);

  const fetchJobs = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(`${BACKEND_URL}/job/company/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        console.log("Fetched jobs:", response.data.jobs);

        // Backend returns jobs grouped by status
        const groupedJobs = response.data.jobs;

        setJobsByStatus({
          active: groupedJobs.active || [],
          inProgress: groupedJobs.inProgress || [],
          completed: groupedJobs.completed || [],
          rejected: groupedJobs.rejected || [],
        });

        // Calculate stats from grouped jobs
        const totalActive = (groupedJobs.active || []).length;
        const totalInProgress = (groupedJobs.inProgress || []).length;
        const totalCompleted = (groupedJobs.completed || []).length;
        const totalRejected = (groupedJobs.rejected || []).length;

        const allJobs = [
          ...(groupedJobs.active || []),
          ...(groupedJobs.inProgress || []),
          ...(groupedJobs.completed || []),
          ...(groupedJobs.rejected || []),
        ];

        const totalApps = allJobs.reduce(
          (sum, job) => sum + (job.applications?.length || 0),
          0
        );

        setStats({
          totalJobs: allJobs.length,
          activeJobs: totalActive,
          inProgress: totalInProgress,
          completed: totalCompleted,
          totalApplications: totalApps,
        });
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      if (publicKey) {
        toast.error("Failed to fetch jobs");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!publicKey) return;
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${BACKEND_URL}/job/company/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setStats((prev) => ({ ...prev, ...response.data.stats }));
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Stats endpoint might not exist yet, so don't show error
    }
  };

  const handleJobPosted = (newJob) => {
    // Add new job to active tab
    setJobsByStatus((prev) => ({
      ...prev,
      active: [newJob, ...prev.active],
    }));

    // Update stats
    setStats((prev) => ({
      ...prev,
      totalJobs: prev.totalJobs + 1,
      activeJobs: prev.activeJobs + 1,
    }));

    toast.success("Job posted successfully!");
  };

  const handleJobUpdate = () => {
    // Refresh jobs after any update (approve worker, etc.)
    fetchJobs();
  };

  const handleJobClick = (job) => {
    setSelectedJob(job);
    setShowJobDetailsModal(true);
  };

  // Get current tab's jobs
  const currentJobs = jobsByStatus[activeTab] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Company Dashboard
              </h1>
              <p className="text-gray-600">Manage your job postings</p>
            </div>
            <button
              onClick={() => setShowPostJobModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">Post New Job</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalJobs}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.activeJobs}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.inProgress}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Applications
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalApplications}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? ACTIVE_CLASSES[tab.color]
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                    {/* Show count badge */}
                    <span
                      className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${
                        activeTab === tab.id
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {jobsByStatus[tab.id]?.length || 0}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : currentJobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No jobs found
                </h3>
                <p className="text-gray-600 mb-6">
                  {activeTab === "active"
                    ? "Post your first job to get started"
                    : `No ${activeTab
                        .replace(/([A-Z])/g, " $1")
                        .toLowerCase()} jobs yet`}
                </p>
                {activeTab === "active" && (
                  <button
                    onClick={() => setShowPostJobModal(true)}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Post New Job</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {currentJobs.map((job) => (
                  <JobCard
                    key={job._id}
                    job={job}
                    onClick={() => handleJobClick(job)}
                    showApplications={activeTab === "active"}
                    onUpdate={handleJobUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Job Modal */}
      <AnimatePresence>
        {showPostJobModal && (
          <PostJobModal
            isOpen={showPostJobModal}
            onClose={() => setShowPostJobModal(false)}
            onJobPosted={handleJobPosted}
          />
        )}
      </AnimatePresence>

      {/* Job Details Modal */}
      <AnimatePresence>
        {showJobDetailsModal && selectedJob && (
          <JobDetailsModal
            isOpen={showJobDetailsModal}
            onClose={() => {
              setShowJobDetailsModal(false);
              setSelectedJob(null);
            }}
            job={selectedJob}
            onUpdate={handleJobUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompanyDashboard;
