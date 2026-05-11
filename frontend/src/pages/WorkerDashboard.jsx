import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Clock, CheckCircle, XCircle, TrendingUp,
  Search, Filter, AlertTriangle, UserCircle, LogOut,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import { BACKEND_URL } from "../env-variables";
import toast from "react-hot-toast";
import WorkerStatsCards from "./WorkerStatsCards";
import JobListingCard from "./JobListingCard";
import CompanyInfoModal from "./CompanyInfoModal";
import JobDetailsModalWorker from "./JobDetailsModalWorker";
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

const TAB_ENDPOINTS = {
  active:     "/job/available",
  applied:    "/job/worker/applied",
  inProgress: "/job/worker/in-progress",
  completed:  "/job/worker/completed",
  disputed:   "/job/worker/disputed",
  rejected:   "/job/worker/rejected",
};

const WorkerDashboard = () => {
  const { publicKey, disconnect } = useWallet();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const TABS = [
    { id: "active",     label: t("worker.availableJobs"), icon: Briefcase,     color: "blue"   },
    { id: "applied",    label: t("worker.applied"),       icon: Clock,          color: "orange" },
    { id: "inProgress", label: t("worker.inProgress"),    icon: TrendingUp,     color: "orange" },
    { id: "completed",  label: t("worker.completed"),     icon: CheckCircle,    color: "green"  },
    { id: "disputed",   label: t("worker.dispute"),       icon: AlertTriangle,  color: "purple" },
    { id: "rejected",   label: t("worker.rejected"),      icon: XCircle,        color: "red"    },
  ];

  const CATEGORIES = [
    { value: "all",           label: t("worker.allCategories") },
    { value: "construction",  label: "Construction"   },
    { value: "delivery",      label: "Delivery"       },
    { value: "domestic_help", label: "Domestic Help"  },
    { value: "event_staffing",label: "Event Staffing" },
    { value: "agriculture",   label: "Agriculture"    },
    { value: "cleaning",      label: "Cleaning"       },
    { value: "security",      label: "Security"       },
    { value: "other",         label: "Other"          },
  ];

  const [activeTab, setActiveTab]         = useState("active");
  const [searchTerm, setSearchTerm]       = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedJob, setSelectedJob]     = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal]       = useState(false);

  // All jobs keyed by tab id
  const [jobsByStatus, setJobsByStatus] = useState({
    active: [], applied: [], inProgress: [], completed: [], disputed: [], rejected: [],
  });
  // Tab counts — set from fetched data on mount
  const [tabCounts, setTabCounts] = useState({
    active: 0, applied: 0, inProgress: 0, completed: 0, disputed: 0, rejected: 0,
  });

  const [loadingAll, setLoadingAll]   = useState(true);   // first-load spinner
  const [loadingTab, setLoadingTab]   = useState(false);   // tab-switch spinner
  const [stats, setStats] = useState({
    availableJobs: 0, appliedJobs: 0, activeJobs: 0, completedJobs: 0, totalEarnings: 0,
  });

  // Track which tabs have already been fully loaded
  const loadedTabs = useRef(new Set());

  const handleLogout = async () => {
    try {
      await disconnect();
    } catch (e) { /* ignore */ }
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/");
  };

  // ─── On mount: fetch ALL tabs in parallel so counts are correct immediately ──
  useEffect(() => {
    if (!publicKey) {
      setLoadingAll(false);
      return;
    }
    initialLoad();
    fetchStats();
  }, [publicKey]);

  const initialLoad = async () => {
    setLoadingAll(true);
    const token = localStorage.getItem("token");
    const entries = Object.entries(TAB_ENDPOINTS);

    const results = await Promise.allSettled(
      entries.map(([, endpoint]) =>
        axios.get(`${BACKEND_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );

    const newJobsByStatus = {};
    const newCounts       = {};

    entries.forEach(([tabId], idx) => {
      const r = results[idx];
      if (r.status === "fulfilled" && r.value.data.success) {
        const jobs = r.value.data.jobs || [];
        newJobsByStatus[tabId] = jobs;
        newCounts[tabId]       = jobs.length;
        loadedTabs.current.add(tabId);
      } else {
        newJobsByStatus[tabId] = [];
        newCounts[tabId]       = 0;
      }
    });

    setJobsByStatus(newJobsByStatus);
    setTabCounts(newCounts);
    setLoadingAll(false);
  };

  // ─── On tab switch: re-fetch only that tab (to get fresh data) ───────────────
  const handleTabSwitch = useCallback(async (tabId) => {
    setActiveTab(tabId);
    if (!publicKey) return;
    const token = localStorage.getItem("token");
    try {
      setLoadingTab(true);
      const res = await axios.get(`${BACKEND_URL}${TAB_ENDPOINTS[tabId]}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const jobs = res.data.jobs || [];
        setJobsByStatus(prev => ({ ...prev, [tabId]: jobs }));
        setTabCounts(prev    => ({ ...prev, [tabId]: jobs.length }));
      }
    } catch (e) {
      console.error("Error fetching tab:", e);
    } finally {
      setLoadingTab(false);
    }
  }, [publicKey]);

  const fetchStats = async () => {
    if (!publicKey) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/job/worker/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setStats(res.data.stats);
    } catch (e) { console.error("Stats error:", e); }
  };

  const refreshCurrentTab = useCallback(() => {
    handleTabSwitch(activeTab);
    fetchStats();
  }, [activeTab, handleTabSwitch]);

  const handleApplyJob = async (jobId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BACKEND_URL}/job/apply`, { jobId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Application submitted successfully!");
        setJobsByStatus(prev => ({
          ...prev,
          active: prev.active.map(j => j._id === jobId ? { ...j, hasApplied: true } : j),
        }));
        setTabCounts(prev => ({ ...prev, applied: prev.applied + 1 }));
        fetchStats();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to apply");
    }
  };

  const handleOTPUsed = async (_jobId, otpType) => {
    await refreshCurrentTab();
    if (otpType === "start") toast.success("Job started! Enter End OTP when done.");
    else toast.success("Job completed! Entering dispute period...");
  };

  const handleJobClick = async (job) => {
    setSelectedJob(job);
    setShowJobDetailsModal(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/job/${job._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setSelectedJob(res.data.job);
    } catch (e) { console.error("Error fetching job details:", e); }
  };

  const handleViewCompany = async (companyWallet) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/company/${companyWallet}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) { setSelectedCompany(res.data.company); setShowCompanyModal(true); }
    } catch { toast.error("Failed to load company details"); }
  };

  const filteredJobs = (jobsByStatus[activeTab] || []).filter((job) => {
    if (!job.title) return true;
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.location?.city || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || job.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isLoading = loadingAll || loadingTab;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t("worker.dashboard")}</h1>
              <p className="text-gray-600">{t("worker.findJobs")}</p>
            </div>
            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              <button
                onClick={() => navigate("/worker/profile")}
                className="flex items-center space-x-2 px-5 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <UserCircle className="w-5 h-5" />
                <span className="font-semibold">{t("worker.viewProfile")}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-5 py-3 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-all duration-200 shadow-sm"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold">{t("worker.logout")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkerStatsCards stats={stats} />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-2 px-4 overflow-x-auto" aria-label="Tabs">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSwitch(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      isActive ? ACTIVE_CLASSES[tab.color] : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive
                        ? tab.id === "disputed" ? "bg-purple-100 text-purple-700"
                          : tab.id === "rejected" ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {loadingAll ? "…" : (tabCounts[tab.id] ?? 0)}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Dispute banner */}
          {activeTab === "disputed" && (
            <div className="mx-6 mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <p className="text-sm text-purple-800">
                <span className="font-semibold">{t("worker.disputeBanner").split(".")[0]}.</span> {t("worker.disputeBanner").split(".").slice(1).join(".")}
              </p>
            </div>
          )}

          {/* Search bar (active tab only) */}
          {activeTab === "active" && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={t("worker.searchJobs")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white min-w-[200px]"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("worker.noJobsFound")}</h3>
                <p className="text-gray-500">
                  {activeTab === "active" && (searchTerm || categoryFilter !== "all")
                    ? t("worker.adjustFilters")
                    : `${t("worker.noJobsFound")}`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredJobs.map(job => (
                  <JobListingCard
                    key={job._id}
                    job={job}
                    onClick={() => handleJobClick(job)}
                    onApply={handleApplyJob}
                    showApplyButton={activeTab === "active"}
                    onOTPUsed={handleOTPUsed}
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
              refreshCurrentTab();
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
            onClose={() => { setShowCompanyModal(false); setSelectedCompany(null); }}
            company={selectedCompany}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkerDashboard;
