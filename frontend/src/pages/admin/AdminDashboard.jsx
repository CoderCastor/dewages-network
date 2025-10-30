import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  LogOut,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
  Mail,
  Phone,
  MapPin,
  Shield,
  Star,
  Briefcase,
  CheckCircle,
  XCircle,
  Building2,
} from "lucide-react";
import { BACKEND_URL } from "@/env-variables";

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Shared state
  const [activeTab, setActiveTab] = useState("workers");
  const [adminName, setAdminName] = useState("Admin");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Workers state
  const [workers, setWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [showVerifiedWorkers, setShowVerifiedWorkers] = useState(false);
  const [workerStats, setWorkerStats] = useState({
    total: 0,
    verified: 0,
    unverified: 0,
  });

  // Companies state
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [showVerifiedCompanies, setShowVerifiedCompanies] = useState(false);
  const [companyStats, setCompanyStats] = useState({
    total: 0,
    verified: 0,
    unverified: 0,
  });

  const itemsPerPage = 10;

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      toast.error("Please login first");
      navigate("/admin/login");
      return;
    }

    const adminInfo = localStorage.getItem("adminInfo");
    if (adminInfo) {
      const parsed = JSON.parse(adminInfo);
      setAdminName(parsed.username || "Admin");
    }

    fetchAllData();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === "workers") {
      filterWorkers();
    } else {
      filterCompanies();
    }
  }, [
    workers,
    companies,
    showVerifiedWorkers,
    showVerifiedCompanies,
    searchQuery,
    activeTab,
  ]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");

      // Fetch workers
      const workersRes = await fetch(`${BACKEND_URL}/admin/workers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Fetch companies
      const companiesRes = await fetch(`${BACKEND_URL}/admin/companies`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (workersRes.ok) {
        const data = await workersRes.json();
        setWorkers(data.workers || []);

        const total = data.workers.length;
        const verified = data.workers.filter((w) => w.isVerified).length;
        setWorkerStats({
          total,
          verified,
          unverified: total - verified,
        });
      }

      if (companiesRes.ok) {
        const data = await companiesRes.json();
        setCompanies(data.companies || []);

        const total = data.companies.length;
        const verified = data.companies.filter((c) => c.isVerified).length;
        setCompanyStats({
          total,
          verified,
          unverified: total - verified,
        });
      }

      if (workersRes.status === 401 || companiesRes.status === 401) {
        toast.error("Session expired. Please login again.");
        handleLogout();
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const filterWorkers = () => {
    let filtered = [...workers];

    if (!showVerifiedWorkers) {
      filtered = filtered.filter((worker) => !worker.isVerified);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (worker) =>
          worker.name?.toLowerCase().includes(query) ||
          worker.email?.toLowerCase().includes(query) ||
          worker.phone?.includes(query) ||
          worker.walletAddress?.toLowerCase().includes(query)
      );
    }

    setFilteredWorkers(filtered);
    setCurrentPage(1);
  };

  const filterCompanies = () => {
    let filtered = [...companies];

    if (!showVerifiedCompanies) {
      filtered = filtered.filter((company) => !company.isVerified);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (company) =>
          company.name?.toLowerCase().includes(query) ||
          company.companyName?.toLowerCase().includes(query) ||
          company.email?.toLowerCase().includes(query) ||
          company.phone?.includes(query) ||
          company.walletAddress?.toLowerCase().includes(query)
      );
    }

    setFilteredCompanies(filtered);
    setCurrentPage(1);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminInfo");
    toast.success("Logged out successfully");
    navigate("/admin/login");
  };

  const handleItemClick = (walletAddress) => {
    if (activeTab === "workers") {
      navigate(`/admin/worker/${walletAddress}`);
    } else {
      navigate(`/admin/company/${walletAddress}`);
    }
  };

  // Get current data based on active tab
  const currentData =
    activeTab === "workers" ? filteredWorkers : filteredCompanies;
  const currentStats = activeTab === "workers" ? workerStats : companyStats;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedData = currentData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(currentData.length / itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <svg
            className="animate-spin h-16 w-16 text-purple-500 mx-auto mb-4"
            viewBox="0 0 24 24"
          >
            ircle className="opacity-25" cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"4" fill="none" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-slate-600 text-lg font-medium">
            Loading dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white shadow-lg border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-slate-500">
                  Platform Management System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {adminName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">
                    {adminName}
                  </p>
                  <p className="text-xs text-slate-500">Administrator</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-4 mb-8 bg-white rounded-xl shadow-md p-2"
        >
          <button
            onClick={() => {
              setActiveTab("workers");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
              activeTab === "workers"
                ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Workers</span>
            <span
              className={`ml-2 px-3 py-1 rounded-full text-xs font-bold ${
                activeTab === "workers"
                  ? "bg-white text-purple-600"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {workerStats.total}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("companies");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
              activeTab === "companies"
                ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span>Companies</span>
            <span
              className={`ml-2 px-3 py-1 rounded-full text-xs font-bold ${
                activeTab === "companies"
                  ? "bg-white text-blue-600"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {companyStats.total}
            </span>
          </button>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">
                  Total {activeTab === "workers" ? "Workers" : "Companies"}
                </p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {currentStats.total}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                {activeTab === "workers" ? (
                  <Users className="w-8 h-8 text-blue-600" />
                ) : (
                  <Building2 className="w-8 h-8 text-blue-600" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">
                  Verified {activeTab === "workers" ? "Workers" : "Companies"}
                </p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {currentStats.verified}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">
                  Pending Verification
                </p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {currentStats.unverified}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <UserX className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-md p-6 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={`Search by name, email, phone, or wallet address...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <button
              onClick={() => {
                if (activeTab === "workers") {
                  setShowVerifiedWorkers(!showVerifiedWorkers);
                } else {
                  setShowVerifiedCompanies(!showVerifiedCompanies);
                }
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 whitespace-nowrap ${
                (
                  activeTab === "workers"
                    ? showVerifiedWorkers
                    : showVerifiedCompanies
                )
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              <Filter className="w-5 h-5" />
              {(
                activeTab === "workers"
                  ? showVerifiedWorkers
                  : showVerifiedCompanies
              )
                ? "Show All"
                : "Show Verified"}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">Showing:</span>
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
              {currentData.length} item(s)
            </span>
            {searchQuery && (
              <span className="text-slate-500">matching "{searchQuery}"</span>
            )}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-md overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={`text-white ${
                  activeTab === "workers"
                    ? "bg-gradient-to-r from-purple-500 to-indigo-600"
                    : "bg-gradient-to-r from-blue-500 to-cyan-600"
                }`}
              >
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    {activeTab === "workers" ? "Worker" : "Company"} Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Location
                  </th>
                  {activeTab === "workers" && (
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Stats
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <AnimatePresence>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item, index) => (
                      <motion.tr
                        key={item._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                activeTab === "workers"
                                  ? "bg-gradient-to-br from-purple-400 to-indigo-500"
                                  : "bg-gradient-to-br from-blue-400 to-cyan-500"
                              }`}
                            >
                              <span className="text-white font-bold text-lg">
                                {(item.name || item.companyName || "Unknown")
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {item.name || item.companyName || "Unknown"}
                              </p>
                              <p className="text-xs text-slate-500 font-mono">
                                {item.walletAddress?.slice(0, 8)}...
                                {item.walletAddress?.slice(-6)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <Mail className="w-4 h-4 text-slate-400" />
                              {item.email || "N/A"}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-700">
                              <Phone className="w-4 h-4 text-slate-400" />
                              {item.phone || "N/A"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span>
                              {item.location?.city && item.location?.state
                                ? `${item.location.city}, ${item.location.state}`
                                : "N/A"}
                            </span>
                          </div>
                        </td>
                        {activeTab === "workers" && (
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <span className="text-slate-700 font-medium">
                                  {item.rating?.toFixed(1) || "0.0"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Briefcase className="w-4 h-4 text-blue-500" />
                                <span className="text-slate-700 font-medium">
                                  {item.completedJobs || 0} jobs
                                </span>
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            {item.isVerified ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <CheckCircle className="w-4 h-4" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                <XCircle className="w-4 h-4" />
                                Pending
                              </span>
                            )}
                            {item.isActive ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleItemClick(item.walletAddress)}
                            className={`inline-flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
                              activeTab === "workers"
                                ? "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                                : "bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
                            }`}
                          >
                            View Details
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={activeTab === "workers" ? 6 : 5}
                        className="px-6 py-12 text-center"
                      >
                        <div className="flex flex-col items-center justify-center">
                          {activeTab === "workers" ? (
                            <Users className="w-16 h-16 text-slate-300 mb-4" />
                          ) : (
                            <Building2 className="w-16 h-16 text-slate-300 mb-4" />
                          )}
                          <p className="text-slate-500 text-lg font-medium">
                            No{" "}
                            {activeTab === "workers" ? "workers" : "companies"}{" "}
                            found
                          </p>
                          <p className="text-slate-400 text-sm mt-2">
                            {searchQuery
                              ? "Try adjusting your search criteria"
                              : `${
                                  activeTab === "workers"
                                    ? "Workers"
                                    : "Companies"
                                } will appear here once registered`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing {indexOfFirstItem + 1} to{" "}
                  {Math.min(indexOfLastItem, currentData.length)} of{" "}
                  {currentData.length}{" "}
                  {activeTab === "workers" ? "workers" : "companies"}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </button>

                  <div className="flex gap-1">
                    {[...Array(totalPages)].map((_, index) => (
                      <button
                        key={index + 1}
                        onClick={() => setCurrentPage(index + 1)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          currentPage === index + 1
                            ? activeTab === "workers"
                              ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
                              : "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
                            : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
