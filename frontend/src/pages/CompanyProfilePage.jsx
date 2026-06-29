import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  Star,
  Edit3,
  Save,
  X,
  ChevronLeft,
  Database,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Lock,
  Users,
  TrendingUp,
  Award,
  User,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import axios from "axios";
import { BACKEND_URL, RPC_URL, PROGRAM_ID } from "../env-variables";
import idl from "../idl/employment_platform.json" with { type: "json" };
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { useNavigate } from "react-router";

const CompanyProfilePage = () => {
  const walletAdapter = useWallet();
  const { publicKey } = useWallet();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  // On-chain data
  const [onChainData, setOnChainData] = useState(null);
  const [loadingOnChain, setLoadingOnChain] = useState(false);
  const [onChainError, setOnChainError] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, [publicKey]);

  // Bug Fix #2: auto-fetch on-chain data when tab switches to 'onchain'
  useEffect(() => {
    if (activeTab === "onchain" && !onChainData && !loadingOnChain && profile?.PDAAddress) {
      fetchOnChainData();
    }
  }, [activeTab, profile]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${BACKEND_URL}/company/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setProfile(response.data.company);
        const c = response.data.company;
        setFormData({
          companyName: c.companyName || "",
          companyType: c.companyType || "individual",
          phone: c.phone || "",
          email: c.email || "",
          website: c.website || "",
          description: c.description || "",
          location: {
            address: c.location?.address || "",
            city: c.location?.city || "",
            state: c.location?.state || "",
            country: c.location?.country || "India",
          },
          contactPerson: {
            name: c.contactPerson?.name || "",
            designation: c.contactPerson?.designation || "",
            phone: c.contactPerson?.phone || "",
            email: c.contactPerson?.email || "",
          },
          socialProfiles: {
            linkedin: c.socialProfiles?.linkedin || "",
            facebook: c.socialProfiles?.facebook || "",
            instagram: c.socialProfiles?.instagram || "",
          },
        });
      }
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const response = await axios.patch(`${BACKEND_URL}/company/profile/update`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        toast.success("Profile updated successfully!");
        setProfile((prev) => ({ ...prev, ...response.data.company }));
        setEditing(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const fetchOnChainData = async () => {
    if (!profile?.PDAAddress) {
      toast.error("No on-chain profile PDA found. Register on-chain first.");
      return;
    }
    try {
      setLoadingOnChain(true);
      setOnChainError(null);
      const connection = new Connection(RPC_URL, "confirmed");
      const programIdKey = new PublicKey(PROGRAM_ID);
      const readWallet = {
        publicKey: publicKey || PublicKey.default,
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs,
      };
      const provider = new AnchorProvider(connection, readWallet, {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
      });
      const program = new Program(idl, programIdKey, provider);
      const pda = new PublicKey(profile.PDAAddress);
      const data = await program.account.userProfile.fetch(pda);
      const display = {};
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v.toString === "function" && typeof v !== "string") {
          display[k] = v.toString();
        } else {
          display[k] = v;
        }
      }
      setOnChainData(display);
      toast.success("On-chain data loaded!");
    } catch (error) {
      console.error("On-chain fetch error:", error);
      setOnChainData(null);
      setOnChainError(error.message || "Unknown error");
      toast.error("Failed to load on-chain data: " + (error.message || "Unknown error"));
    } finally {
      setLoadingOnChain(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "?");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => navigate("/company/dashboard")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Company Profile</h1>
            <div className="w-24" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 mb-6 text-white shadow-xl"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-4xl font-bold text-white">{getInitial(profile?.companyName)}</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold">{profile?.companyName || "Unnamed Company"}</h2>
                <p className="text-blue-100 text-sm mt-1">{profile?.email || "No email"}</p>
                <div className="flex items-center space-x-3 mt-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white bg-opacity-20 capitalize">
                    {profile?.companyType?.replace("_", " ") || "Individual"}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    <span className="text-sm font-semibold">{profile?.rating?.toFixed(1) || "0.0"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white border-opacity-20">
            {[
              { label: "Total Jobs", value: profile?.totalJobsPosted || 0, icon: Briefcase },
              { label: "Completed", value: profile?.completedJobs || 0, icon: CheckCircle },
              { label: "Active Jobs", value: profile?.activeJobs || 0, icon: TrendingUp },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-3xl font-bold">{item.value}</p>
                <p className="text-blue-100 text-xs mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Wallet Address */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Lock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-medium">Wallet Address (Read-only)</p>
              <code className="text-sm font-mono text-gray-900 break-all">
                {profile?.walletAddress || publicKey?.toString() || "Not connected"}
              </code>
            </div>
            {(profile?.walletAddress || publicKey?.toString()) && (
              <button
                onClick={() => copyToClipboard(profile?.walletAddress || publicKey?.toString(), "Wallet Address")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6">
          {[
            { id: "profile", label: "Company Info", icon: Building2 },
            { id: "onchain", label: "On-Chain Data", icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold text-sm transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Edit Controls */}
              <div className="flex justify-end">
                {editing ? (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setEditing(false)}
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-all"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>{saving ? "Saving..." : "Save Changes"}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              {/* Company Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span>Company Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Company Name", field: "companyName", type: "text", placeholder: "Your company name" },
                    { label: "Phone", field: "phone", type: "tel", placeholder: "+91 XXXXXXXXXX" },
                    { label: "Email", field: "email", type: "email", placeholder: "company@email.com" },
                    { label: "Website", field: "website", type: "url", placeholder: "https://yourcompany.com" },
                  ].map((item) => (
                    <div key={item.field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{item.label}</label>
                      {editing ? (
                        <input
                          type={item.type}
                          value={formData[item.field] || ""}
                          onChange={(e) => setFormData((prev) => ({ ...prev, [item.field]: e.target.value }))}
                          placeholder={item.placeholder}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded-lg">{profile?.[item.field] || "—"}</p>
                      )}
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Type</label>
                    {editing ? (
                      <select
                        value={formData.companyType || "individual"}
                        onChange={(e) => setFormData((prev) => ({ ...prev, companyType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="individual">Individual</option>
                        <option value="small_business">Small Business</option>
                        <option value="medium_business">Medium Business</option>
                        <option value="large_enterprise">Large Enterprise</option>
                      </select>
                    ) : (
                      <span className="inline-flex px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold capitalize">
                        {profile?.companyType?.replace("_", " ") || "Individual"}
                      </span>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    {editing ? (
                      <textarea
                        value={formData.description || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Tell workers about your company..."
                        rows={3}
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded-lg min-h-[60px]">{profile?.description || "—"}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <span>Location</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {["address", "city", "state", "country"].map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field}</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.location?.[field] || ""}
                          onChange={(e) => setFormData((prev) => ({ ...prev, location: { ...prev.location, [field]: e.target.value } }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded-lg">{profile?.location?.[field] || "—"}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Person */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <User className="w-5 h-5 text-purple-600" />
                  <span>Contact Person</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Name", field: "name" },
                    { label: "Designation", field: "designation" },
                    { label: "Phone", field: "phone" },
                    { label: "Email", field: "email" },
                  ].map((item) => (
                    <div key={item.field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{item.label}</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.contactPerson?.[item.field] || ""}
                          onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: { ...prev.contactPerson, [item.field]: e.target.value } }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded-lg">{profile?.contactPerson?.[item.field] || "—"}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Profiles */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  <span>Social Profiles</span>
                </h3>
                <div className="space-y-3">
                  {["linkedin", "facebook", "instagram"].map((field) => (
                    <div key={field} className="flex items-center space-x-3">
                      <span className="w-20 text-sm font-medium text-gray-600 capitalize">{field}</span>
                      {editing ? (
                        <input
                          type="url"
                          value={formData.socialProfiles?.[field] || ""}
                          onChange={(e) => setFormData((prev) => ({ ...prev, socialProfiles: { ...prev.socialProfiles, [field]: e.target.value } }))}
                          placeholder={`https://${field}.com/...`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <span className="text-sm text-blue-600">{profile?.socialProfiles?.[field] || <span className="text-gray-400">Not provided</span>}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "onchain" && (
            <motion.div
              key="onchain"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 border-2 border-indigo-200 rounded-2xl p-8">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-3 bg-indigo-200 rounded-xl">
                    <Database className="w-6 h-6 text-indigo-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-indigo-900">On-Chain Company Data</h3>
                    <p className="text-sm text-indigo-600">Data stored on the Solana blockchain</p>
                  </div>
                </div>

                {profile?.PDAAddress ? (
                  <div className="bg-white rounded-xl p-4 mb-6 border border-indigo-200">
                    <p className="text-xs text-indigo-600 font-medium mb-1">Company Profile PDA</p>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs font-mono text-indigo-900 break-all flex-1">{profile.PDAAddress}</code>
                      <button
                        onClick={() => copyToClipboard(profile.PDAAddress, "PDA Address")}
                        className="p-1.5 hover:bg-indigo-100 rounded-lg"
                      >
                        <Copy className="w-4 h-4 text-indigo-600" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <p className="text-sm text-amber-800">No PDA address found. You may not have created an on-chain profile yet.</p>
                  </div>
                )}

                {!onChainData ? (
                  <div className="text-center py-8">
                    <Database className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                    <p className="text-indigo-700 mb-6">Click below to fetch your on-chain company data</p>
                    <button
                      onClick={fetchOnChainData}
                      disabled={loadingOnChain || !profile?.PDAAddress}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold inline-flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingOnChain ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /><span>Loading...</span></>
                      ) : (
                        <><Database className="w-4 h-4" /><span>Load On-Chain Data</span></>
                      )}
                    </button>
                    {onChainError && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-left">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-red-800">Fetch failed</p>
                            <p className="text-xs text-red-700 mt-1 font-mono break-all">{onChainError}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(onChainData).map(([key, value]) => (
                      <div key={key} className="bg-white rounded-xl p-4 border border-indigo-200">
                        <p className="text-xs text-indigo-600 font-semibold mb-1 capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                        <p className="text-sm text-gray-900 font-mono break-all">
                          {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                        </p>
                      </div>
                    ))}
                    <button
                      onClick={fetchOnChainData}
                      disabled={loadingOnChain}
                      className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center space-x-2 font-semibold disabled:opacity-50"
                    >
                      {loadingOnChain ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Refreshing...</span></> : <><Database className="w-4 h-4" /><span>Refresh On-Chain Data</span></>}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CompanyProfilePage;
