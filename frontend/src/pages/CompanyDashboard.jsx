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
  AlertTriangle,
  UserCircle,
  LogOut,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import { BACKEND_URL } from "../env-variables";
import toast from "react-hot-toast";
import PostJobModal from "./PostJobModal";
import JobCard from "./JobCard";
import JobDetailsModal from "./JobDetailsModal";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

const ACTIVE_CLASSES = {
  blue: "border-blue-500 text-blue-600",
  orange: "border-orange-500 text-orange-600",
  green: "border-green-500 text-green-600",
  red: "border-red-500 text-red-600",
  purple: "border-purple-500 text-purple-600",
};

const CompanyDashboard = () => {
  const { publicKey, disconnect } = useWallet();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("active");
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Store jobs grouped by status
  const [jobsByStatus, setJobsByStatus] = useState({
    active: [],
    inProgress: [],
    completed: [],
    disputed: [],
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
    { id: "active", label: t("company.activeJobs"), icon: Briefcase, color: "blue" },
    { id: "inProgress", label: t("company.inProgress"), icon: Clock, color: "orange" },
    { id: "completed", label: t("company.completed"), icon: CheckCircle, color: "green" },
    { id: "disputed", label: t("company.dispute"), icon: AlertTriangle, color: "purple" },
    { id: "rejected", label: t("company.rejected"), icon: XCircle, color: "red" },
  ];

  const handleLogout = async () => {
    try {
      await disconnect();
    } catch (e) { /* ignore */ }
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/");
  };

  useEffect(() => {
    if (publicKey) {
      fetchJobs();
      fetchStats();
    } else {
      setLoading(false);
      setJobsByStatus({ active: [], inProgress: [], completed: [], disputed: [], rejected: [] });
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
        const groupedJobs = response.data.jobs;
        setJobsByStatus({
          active: groupedJobs.active || [],
          inProgress: groupedJobs.inProgress || [],
          completed: groupedJobs.completed || [],
          disputed: groupedJobs.disputed || [],
          rejected: groupedJobs.rejected || [],
        });

        const allJobs = [
          ...(groupedJobs.active || []),
          ...(groupedJobs.inProgress || []),
          ...(groupedJobs.completed || []),
          ...(groupedJobs.disputed || []),
          ...(groupedJobs.rejected || []),
        ];

        const totalApps = allJobs.reduce((sum, job) => sum + (job.applications?.length || 0), 0);
        setStats({
          totalJobs: allJobs.length,
          activeJobs: (groupedJobs.active || []).length,
          inProgress: (groupedJobs.inProgress || []).length,
          completed: (groupedJobs.completed || []).length,
          totalApplications: totalApps,
        });
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      if (publicKey) toast.error("Failed to fetch jobs");
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
    }
  };

  const handleJobPosted = (newJob) => {
    setJobsByStatus((prev) => ({ ...prev, active: [newJob, ...prev.active] }));
    setStats((prev) => ({ ...prev, totalJobs: prev.totalJobs + 1, activeJobs: prev.activeJobs + 1 }));
    toast.success("Job posted successfully!");
  };

  const handleJobUpdate = () => fetchJobs();

  const handleJobClick = (job) => {
    setSelectedJob(job);
    setShowJobDetailsModal(true);
  };

  const currentJobs = jobsByStatus[activeTab] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("company.dashboard")}</h1>
              <p className="text-sm sm:text-base text-gray-600">{t("company.manageJobs")}</p>
            </div>
            <div className="flex items-center flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <LanguageSwitcher />
              <button
                onClick={() => navigate("/company/profile")}
                className="flex items-center space-x-2 px-3 sm:px-5 py-2 sm:py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
              >
                <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-semibold">{t("company.viewProfile")}</span>
              </button>
              <button
                onClick={() => setShowPostJobModal(true)}
                className="flex items-center space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-semibold">{t("company.postNewJob")}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 sm:px-5 py-2 sm:py-3 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-all duration-200 shadow-sm text-sm sm:text-base"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-semibold">{t("company.logout")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
          {[
            { label: t("company.totalJobs"), value: stats.totalJobs, icon: Briefcase, bg: "bg-blue-100", iconColor: "text-blue-600" },
            { label: t("company.active"), value: stats.activeJobs, icon: TrendingUp, bg: "bg-blue-100", iconColor: "text-blue-600", valueColor: "text-blue-600" },
            { label: t("company.inProgress"), value: stats.inProgress, icon: Clock, bg: "bg-orange-100", iconColor: "text-orange-600", valueColor: "text-orange-600" },
            { label: t("company.completed"), value: stats.completed, icon: CheckCircle, bg: "bg-green-100", iconColor: "text-green-600", valueColor: "text-green-600" },
            { label: t("company.applications"), value: stats.totalApplications, icon: Users, bg: "bg-purple-100", iconColor: "text-purple-600", valueColor: "text-purple-600" },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className={`text-xl sm:text-2xl font-bold ${stat.valueColor || "text-gray-900"}`}>{stat.value}</p>
                </div>
                <div className={`p-2 sm:p-3 ${stat.bg} rounded-full`}>
                  <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.iconColor}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 overflow-x-auto scrollbar-hide" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const count = tab.id === "disputed"
                  ? (jobsByStatus.disputed?.length || 0)
                  : (jobsByStatus[tab.id]?.length || 0);
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? ACTIVE_CLASSES[tab.color]
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                    <span
                      className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${
                        activeTab === tab.id
                          ? tab.id === "disputed"
                            ? "bg-purple-100 text-purple-600"
                            : "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Dispute tab notice */}
            {activeTab === "disputed" && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <p className="text-sm text-purple-800">
                <span className="font-semibold">{t("company.disputeBanner").split(".")[0]}.</span> {t("company.disputeBanner").split(".").slice(1).join(".")}
                </p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : currentJobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("company.noJobsFound")}</h3>
                <p className="text-gray-600 mb-6">
                  {activeTab === "active"
                    ? t("company.postFirst")
                    : t("company.noJobsFound")}
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
              // Fix 4: Use grid-cols-1 md:grid-cols-2 to match worker side (not full-width single column)
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
