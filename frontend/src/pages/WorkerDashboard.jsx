import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Search,
  Filter,
  MapPin,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import { BACKEND_URL } from "../env-variables";
import toast from "react-hot-toast";
import WorkerStatsCards from "./WorkerStatsCards";
import JobListingCard from "./JobListingCard";
import CompanyInfoModal from "./CompanyInfoModal";
import JobDetailsModalWorker from "./JobDetailsModalWorker";

const ACTIVE_CLASSES = {
  blue: "border-blue-500 text-blue-600",
  orange: "border-orange-500 text-orange-600",
  green: "border-green-500 text-green-600",
  red: "border-red-500 text-red-600",
};

const WorkerDashboard = () => {
  const { publicKey } = useWallet();

  const [activeTab, setActiveTab] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // Jobs by status
  const [jobsByStatus, setJobsByStatus] = useState({
    active: [], // Available jobs to apply
    applied: [], // Jobs worker has applied to
    inProgress: [], // Jobs worker is working on
    completed: [], // Completed jobs
    rejected: [], // Rejected applications
  });

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    availableJobs: 0,
    appliedJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalEarnings: 0,
  });

  const tabs = [
    { id: "active", label: "Available Jobs", icon: Briefcase, color: "blue" },
    { id: "applied", label: "Applied", icon: Clock, color: "orange" },
    {
      id: "inProgress",
      label: "In Progress",
      icon: TrendingUp,
      color: "orange",
    },
    { id: "completed", label: "Completed", icon: CheckCircle, color: "green" },
    { id: "rejected", label: "Rejected", icon: XCircle, color: "red" },
  ];

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "construction", label: "Construction" },
    { value: "delivery", label: "Delivery" },
    { value: "domestic_help", label: "Domestic Help" },
    { value: "event_staffing", label: "Event Staffing" },
    { value: "agriculture", label: "Agriculture" },
    { value: "cleaning", label: "Cleaning" },
    { value: "security", label: "Security" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    if (publicKey) {
      fetchJobs();
      fetchStats();
    } else {
      setLoading(false);
      resetJobsState();
    }
  }, [publicKey, activeTab]);

  const resetJobsState = () => {
    setJobsByStatus({
      active: [],
      applied: [],
      inProgress: [],
      completed: [],
      rejected: [],
    });
  };

  const fetchJobs = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      let endpoint = "";
      switch (activeTab) {
        case "active":
          endpoint = `${BACKEND_URL}/job/available`;
          break;
        case "applied":
          endpoint = `${BACKEND_URL}/job/worker/applied`;
          break;
        case "inProgress":
          endpoint = `${BACKEND_URL}/job/worker/in-progress`;
          break;
        case "completed":
          endpoint = `${BACKEND_URL}/job/worker/completed`;
          break;
        case "rejected":
          endpoint = `${BACKEND_URL}/job/worker/rejected`;
          break;
        default:
          endpoint = `${BACKEND_URL}/job/available`;
      }

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setJobsByStatus((prev) => ({
          ...prev,
          [activeTab]: response.data.jobs || [],
        }));
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
      const response = await axios.get(`${BACKEND_URL}/job/worker/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleApplyJob = async (jobId) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${BACKEND_URL}/job/apply`,
        { jobId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success("Application submitted successfully!");

        // Update the job in the list to show as applied
        setJobsByStatus((prev) => ({
          ...prev,
          active: prev.active.map((job) =>
            job._id === jobId ? { ...job, hasApplied: true } : job
          ),
        }));

        // Refresh stats
        fetchStats();
      }
    } catch (error) {
      console.error("Error applying to job:", error);
      toast.error(error.response?.data?.message || "Failed to apply");
    }
  };

  // NEW: Handler for OTP usage
  const handleOTPUsed = async (jobId, otpType) => {
    // Refresh the job data
    await fetchJobs();
    await fetchStats();

    if (otpType === "start") {
      toast.success("Job started! You can now enter End OTP when done.");
    } else {
      toast.success("Job completed! Entering dispute period...");
    }
  };

  const handleJobClick = async (job) => {
    setSelectedJob(job);
    setShowJobDetailsModal(true);

    // Fetch full job details if needed
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${BACKEND_URL}/job/${job._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setSelectedJob(response.data.job);
      }
    } catch (error) {
      console.error("Error fetching job details:", error);
    }
  };

  const handleViewCompany = async (companyWallet) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BACKEND_URL}/company/${companyWallet}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setSelectedCompany(response.data.company);
        setShowCompanyModal(true);
      }
    } catch (error) {
      console.error("Error fetching company details:", error);
      toast.error("Failed to load company details");
    }
  };

  // Filter jobs based on search and category
  const filteredJobs = (jobsByStatus[activeTab] || []).filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location?.city?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || job.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Worker Dashboard
              </h1>
              <p className="text-gray-600">Find and manage your jobs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkerStatsCards stats={stats} />

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav
              className="flex space-x-8 px-6 overflow-x-auto"
              aria-label="Tabs"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
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

          {/* Search and Filters */}
          {activeTab === "active" && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search jobs by title, location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[200px]"
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No jobs found
                </h3>
                <p className="text-gray-600 mb-6">
                  {activeTab === "active"
                    ? searchTerm || categoryFilter !== "all"
                      ? "Try adjusting your search or filters"
                      : "Check back later for new opportunities"
                    : `No ${activeTab
                        .replace(/([A-Z])/g, " $1")
                        .toLowerCase()} jobs yet`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredJobs.map((job) => (
                  <JobListingCard
                    key={job._id}
                    job={job}
                    onClick={() => handleJobClick(job)}
                    onApply={handleApplyJob}
                    showApplyButton={activeTab === "active"}
                    onOTPUsed={handleOTPUsed} // NEW: Add OTP handler
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Job Details Modal */}
      <AnimatePresence>
        {showJobDetailsModal && selectedJob && (
          <JobDetailsModalWorker
            isOpen={showJobDetailsModal}
            onClose={() => {
              setShowJobDetailsModal(false);
              setSelectedJob(null);
              // Refresh jobs when modal closes to get updated data
              fetchJobs();
            }}
            job={selectedJob}
            onApply={handleApplyJob}
            onViewCompany={handleViewCompany}
            showApplyButton={activeTab === "active"}
          />
        )}
      </AnimatePresence>

      {/* Company Info Modal */}
      <AnimatePresence>
        {showCompanyModal && selectedCompany && (
          <CompanyInfoModal
            isOpen={showCompanyModal}
            onClose={() => {
              setShowCompanyModal(false);
              setSelectedCompany(null);
            }}
            company={selectedCompany}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkerDashboard;
