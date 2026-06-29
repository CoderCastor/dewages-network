import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Star,
  Shield,
  Edit3,
  Save,
  X,
  ChevronLeft,
  Database,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Wallet,
  Award,
  TrendingUp,
  ExternalLink,
  Globe,
  Linkedin,
  Facebook,
  Instagram,
  Lock,
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

const WorkerProfilePage = () => {
  const { publicKey, wallet } = useWallet();
  const walletAdapter = useWallet();
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
      const response = await axios.get(`${BACKEND_URL}/worker/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setProfile(response.data.worker);
        setFormData({
          name: response.data.worker.name || "",
          phone: response.data.worker.phone || "",
          email: response.data.worker.email || "",
          bio: response.data.worker.bio || "",
          experienceLevel: response.data.worker.experienceLevel || "beginner",
          skills: (response.data.worker.skills || []).join(", "),
          location: {
            address: response.data.worker.location?.address || "",
            city: response.data.worker.location?.city || "",
            state: response.data.worker.location?.state || "",
            country: response.data.worker.location?.country || "India",
          },
          socialProfiles: {
            linkedin: response.data.worker.socialProfiles?.linkedin || "",
            facebook: response.data.worker.socialProfiles?.facebook || "",
            instagram: response.data.worker.socialProfiles?.instagram || "",
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
      const updatePayload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        bio: formData.bio,
        experienceLevel: formData.experienceLevel,
        skills: formData.skills.split(",").map((s) => s.trim()).filter(Boolean),
        location: formData.location,
        socialProfiles: formData.socialProfiles,
      };
      const response = await axios.patch(`${BACKEND_URL}/worker/profile/update`, updatePayload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        toast.success("Profile updated successfully!");
        setProfile((prev) => ({ ...prev, ...response.data.worker }));
        setEditing(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const fetchOnChainData = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (!profile?.PDAAddress) {
      toast.error("No on-chain profile PDA found. Register on-chain first.");
      return;
    }
    try {
      setLoadingOnChain(true);
      const connection = new Connection(RPC_URL, "confirmed");

      // walletAdapter from useWallet() already has signTransaction / signAllTransactions
      const provider = new AnchorProvider(connection, walletAdapter, {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
      });

      // Anchor 0.29: new Program(idl, programId, provider)
      const program = new Program(idl, PROGRAM_ID, provider);
      const pda = new PublicKey(profile.PDAAddress);

      const data = await program.account.userProfile.fetch(pda);

      // Flatten BN / PublicKey values for display
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

  const getExpBadgeColor = (level) => {
    const map = {
      beginner: "bg-green-100 text-green-700",
      intermediate: "bg-blue-100 text-blue-700",
      experienced: "bg-purple-100 text-purple-700",
    };
    return map[level] || "bg-gray-100 text-gray-700";
  };

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
              onClick={() => navigate("/worker/dashboard")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
            <div className="w-24" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 mb-6 text-white shadow-xl"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-4xl font-bold text-white">{getInitial(profile?.name)}</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold">{profile?.name || "Unnamed Worker"}</h2>
                <p className="text-blue-100 text-sm mt-1">{profile?.email || "No email"}</p>
                <div className="flex items-center space-x-3 mt-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white bg-opacity-20 capitalize`}>
                    {profile?.experienceLevel || "Beginner"}
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
              { label: "Total Jobs", value: profile?.totalJobs || 0, icon: Briefcase },
              { label: "Completed", value: profile?.completedJobs || 0, icon: CheckCircle },
              { label: "Earnings", value: `${((profile?.totalEarnings || 0) / 1e9).toFixed(2)} SOL`, icon: Award },
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
            { id: "profile", label: "Profile Info", icon: User },
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

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Edit / Save Controls */}
              <div className="flex justify-end">
                {editing ? (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => { setEditing(false); setFormData({ name: profile?.name || "", phone: profile?.phone || "", email: profile?.email || "", bio: profile?.bio || "", experienceLevel: profile?.experienceLevel || "beginner", skills: (profile?.skills || []).join(", "), location: { ...profile?.location }, socialProfiles: { ...profile?.socialProfiles } }); }}
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

              {/* Personal Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>Personal Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name", field: "name", icon: User, type: "text", placeholder: "Your full name" },
                    { label: "Phone", field: "phone", icon: Phone, type: "tel", placeholder: "+91 XXXXXXXXXX" },
                    { label: "Email", field: "email", icon: Mail, type: "email", placeholder: "your@email.com" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.field}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{item.label}</label>
                        {editing ? (
                          <input
                            type={item.type}
                            value={formData[item.field] || ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, [item.field]: e.target.value }))}
                            placeholder={item.placeholder}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        ) : (
                          <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                            <Icon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{profile?.[item.field] || "—"}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    {editing ? (
                      <textarea
                        value={formData.bio || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself..."
                        rows={3}
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded-lg min-h-[60px]">{profile?.bio || "—"}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Skills & Experience */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span>Skills & Experience</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                    {editing ? (
                      <select
                        value={formData.experienceLevel || "beginner"}
                        onChange={(e) => setFormData((prev) => ({ ...prev, experienceLevel: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="experienced">Experienced</option>
                      </select>
                    ) : (
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold capitalize ${getExpBadgeColor(profile?.experienceLevel)}`}>
                        {profile?.experienceLevel || "Beginner"}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.skills || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, skills: e.target.value }))}
                        placeholder="e.g., Carpentry, Welding, Painting"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(profile?.skills || []).length > 0
                          ? profile.skills.map((skill) => (
                              <span key={skill} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {skill}
                              </span>
                            ))
                          : <span className="text-sm text-gray-500">No skills added</span>}
                      </div>
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
                  {[
                    { label: "Address", field: "address" },
                    { label: "City", field: "city" },
                    { label: "State", field: "state" },
                    { label: "Country", field: "country" },
                  ].map((item) => (
                    <div key={item.field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{item.label}</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.location?.[item.field] || ""}
                          onChange={(e) => setFormData((prev) => ({ ...prev, location: { ...prev.location, [item.field]: e.target.value } }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded-lg">{profile?.location?.[item.field] || "—"}</p>
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
                  {[
                    { label: "LinkedIn", field: "linkedin" },
                    { label: "Facebook", field: "facebook" },
                    { label: "Instagram", field: "instagram" },
                  ].map((item) => (
                    <div key={item.field} className="flex items-center space-x-3">
                      <span className="w-20 text-sm font-medium text-gray-600">{item.label}</span>
                      {editing ? (
                        <input
                          type="url"
                          value={formData.socialProfiles?.[item.field] || ""}
                          onChange={(e) => setFormData((prev) => ({ ...prev, socialProfiles: { ...prev.socialProfiles, [item.field]: e.target.value } }))}
                          placeholder={`https://${item.field}.com/...`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      ) : (
                        <span className="text-sm text-blue-600">{profile?.socialProfiles?.[item.field] || <span className="text-gray-400">Not provided</span>}</span>
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
                    <h3 className="text-xl font-bold text-indigo-900">On-Chain Profile Data</h3>
                    <p className="text-sm text-indigo-600">Data stored on the Solana blockchain</p>
                  </div>
                </div>

                {/* PDA Address */}
                {profile?.PDAAddress ? (
                  <div className="bg-white rounded-xl p-4 mb-6 border border-indigo-200">
                    <p className="text-xs text-indigo-600 font-medium mb-1">Profile PDA Address</p>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs font-mono text-indigo-900 break-all flex-1">{profile.PDAAddress}</code>
                      <button
                        onClick={() => copyToClipboard(profile.PDAAddress, "PDA Address")}
                        className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors"
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

                {loadingOnChain ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                    <p className="text-indigo-700 font-medium">Fetching on-chain data...</p>
                  </div>
                ) : !onChainData ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                    <p className="text-indigo-700 mb-4">
                      {profile?.PDAAddress
                        ? "Could not load on-chain data. Try refreshing."
                        : "No on-chain profile found for this wallet."}
                    </p>
                    {profile?.PDAAddress && (
                      <button
                        onClick={fetchOnChainData}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold inline-flex items-center space-x-2"
                      >
                        <Database className="w-4 h-4" />
                        <span>Retry</span>
                      </button>
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
                      {loadingOnChain ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Refreshing...</span></> : <><Database className="w-4 h-4" /><span>Refresh</span></>}
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

export default WorkerProfilePage;
