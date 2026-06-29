import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Star,
  CheckCircle,
  FileText,
  Globe,
  Calendar,
  Shield,
  XCircle,
} from "lucide-react";
import { BACKEND_URL, PROGRAM_ID } from "@/env-variables";
import IDL from "@/idl/employment_platform.json" with { type: "json" };
import axios from "axios";

// Program ID as PublicKey from env-variables
const PROGRAM_ID_KEY = new PublicKey(PROGRAM_ID);

export default function WorkerDetailPage() {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [pdaAddress, setPdaAddress] = useState("");
  const [onChainData, setOnChainData] = useState(null);
  const [loadingOnChain, setLoadingOnChain] = useState(false);
  const [onChainError, setOnChainError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      toast.error("Please login first");
      navigate("/admin/login");
      return;
    }
    fetchWorkerDetails();
  }, [workerId, navigate]);

  // Fetch on-chain data when worker data is loaded
  useEffect(() => {
    if (worker?.walletAddress) {
      fetchOnChainData();
    }
  }, [worker?.walletAddress]);

  useEffect(() => {
    console.log(onChainData);
    async function verifyUserOnBackend() {
      if (onChainData?.verifiedByAdmin == true) {
        try {
          const res = await axios.post(
            `${BACKEND_URL}/admin/verify-worker/${workerId}`,
            {
              isVerified: true,
              PDAAddress: pdaAddress,
            }
          );
          console.log(res.data);
          if (res.data.success) {
            setWorker(prev => prev ? { ...prev, isVerified: true, PDAAddress: pdaAddress } : null);
          }
        } catch (error) {
          console.error("Error updating backend verification:", error);
        }
      }
    }
    if (onChainData) verifyUserOnBackend()
  }, [onChainData]);

  const fetchWorkerDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`${BACKEND_URL}/admin/worker/${workerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWorker(data.worker);
      } else if (response.status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/admin/login");
      } else {
        toast.error("Failed to fetch worker details");
      }
    } catch (error) {
      console.error("Error fetching worker details:", error);
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const getProvider = () => {
    if (!wallet.publicKey) {
      throw new Error("Admin wallet not connected");
    }

    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return provider;
  };

  const fetchOnChainData = async () => {
    if (!worker?.walletAddress) return;

    setLoadingOnChain(true);
    setOnChainError(false);

    try {
      // Read-only provider — use dummy wallet (no signing needed for reads)
      const readWallet = {
        publicKey: wallet.publicKey || PublicKey.default,
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs,
      };
      const provider = new AnchorProvider(connection, readWallet, { commitment: "confirmed" });
      const program = new Program(IDL, PROGRAM_ID_KEY, provider);

      const workerPublicKey = new PublicKey(worker.walletAddress);
      const [userProfilePDA] = await PublicKey.findProgramAddress(
        [Buffer.from("user_profile"), workerPublicKey.toBuffer()],
        PROGRAM_ID_KEY
      );

      setPdaAddress(userProfilePDA.toString());

      // Try to fetch the account
      const accountData = await program.account.userProfile.fetch(
        userProfilePDA
      );

      // Format the data
      const formattedData = {
        authority: accountData.authority.toString(),
        userType: accountData.userType.worker ? "Worker" : "Employer",
        name: accountData.name,
        phone: accountData.phone,
        location: accountData.location,
        rating: accountData.rating.toString(),
        totalJobs: accountData.totalJobs.toString(),
        totalEarnings: accountData.totalEarnings.toString(),
        isActive: accountData.isActive,
        createdAt: new Date(
          accountData.createdAt.toNumber() * 1000
        ).toLocaleString(),
        verifiedByAdmin: accountData.verifiedByAdmin,
        verifiedAt: accountData.verifiedAt
          ? new Date(accountData.verifiedAt.toNumber() * 1000).toLocaleString()
          : null,
      };

      setOnChainData(formattedData);
      console.log("On-chain data fetched:", formattedData);
    } catch (error) {
      console.log("On-chain data not found or error:", error.message);
      setOnChainError(true);
      setOnChainData(null);
    } finally {
      setLoadingOnChain(false);
    }
  };

  const verifyOnBlockchain = async () => {
    if (!wallet.publicKey) {
      toast.error("Please connect admin wallet first!");
      return;
    }

    if (!worker.walletAddress) {
      toast.error("Worker wallet address not found");
      return;
    }

    setVerifying(true);
    const toastId = toast.loading("Verifying worker on blockchain...");

    // Derive PDA first (needed in catch block too)
    let computedPDA = null;
    try {
      const provider = getProvider();
      const program = new Program(IDL, PROGRAM_ID_KEY, provider);

      const workerPublicKey = new PublicKey(worker.walletAddress);

      const [userProfilePDA, bump] = await PublicKey.findProgramAddress(
        [Buffer.from("user_profile"), workerPublicKey.toBuffer()],
        PROGRAM_ID_KEY
      );
      computedPDA = userProfilePDA;

      console.log("Admin wallet:", wallet.publicKey.toString());
      console.log("Worker wallet (target):", workerPublicKey.toString());
      console.log("Generated PDA:", userProfilePDA.toString());
      console.log("PDA Bump:", bump);
      setPdaAddress(userProfilePDA.toString());

      const userType = { worker: {} };
      const location =
        `${worker.location?.city || ""}, ${worker.location?.state || ""}`.trim() || "Unknown";

      const tx = await program.methods
        .createUserProfile(
          userType,
          worker.name || "Unknown Worker",
          worker.phone || "",
          location
        )
        .accounts({
          userProfile: userProfilePDA,
          targetUser: workerPublicKey,
          admin: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Transaction signature:", tx);
      await updateVerificationStatus(userProfilePDA.toString());

      toast.success(
        <div>
          <div className="font-bold">Worker Verified on Blockchain!</div>
          <div className="text-xs mt-1">TX: {tx.slice(0, 8)}...</div>
          <div className="text-xs mt-1">PDA: {userProfilePDA.toString().slice(0, 8)}...</div>
        </div>,
        { id: toastId, duration: 5000 }
      );

      await fetchOnChainData();
    } catch (err) {
      console.error("Error verifying on blockchain:", err);

      if (err.message.includes("Attempt to debit an account but found no record of a prior credit")) {
        toast.error("Admin wallet needs to be funded with SOL", { id: toastId });
      } else if (err.message.includes("UnauthorizedAdmin")) {
        toast.error("This wallet is not authorized as admin", { id: toastId });
      } else if (err.message.includes("already in use")) {
        // Profile already exists on-chain — just sync the DB record
        toast.success("Profile already on blockchain. Updating database record...", { id: toastId });
        if (computedPDA) {
          await updateVerificationStatus(computedPDA.toString());
          await fetchOnChainData();
        }
      } else {
        toast.error(err.message || "Failed to verify on blockchain", { id: toastId });
      }
    } finally {
      setVerifying(false);
    }
  };

  const updateVerificationStatus = async (pdaAddress) => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`${BACKEND_URL}/admin/verify-worker/${worker.walletAddress}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isVerified: true,
          PDAAddress: pdaAddress,
        }),
      });
      if (response.ok) {
        setWorker(prev => prev ? { ...prev, isVerified: true, PDAAddress: pdaAddress } : null);
      }
    } catch (error) {
      console.error("Error updating verification status:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <svg
          className="animate-spin h-12 w-12 text-purple-500"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-slate-600">Worker not found</p>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="mt-4 text-purple-600 hover:text-purple-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Worker Header Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-purple-600">
                    {worker.name?.charAt(0).toUpperCase() || "W"}
                  </span>
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {worker.name || "Unknown Worker"}
                  </h1>
                  <div className="flex items-center gap-4 text-purple-100">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current" />
                      {worker.rating?.toFixed(1) || "0.0"} Rating
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {worker.completedJobs || 0} Jobs Completed
                    </span>
                  </div>
                </div>
                <div>
                  {worker.isVerified ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full font-medium">
                      <CheckCircle className="w-5 h-5" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-full font-medium">
                      <Shield className="w-5 h-5" />
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Personal Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* On-Chain Data Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-lg p-1"
              >
                <div className="bg-white rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Shield className="w-6 h-6 text-purple-600" />
                      On-Chain Verification Data
                    </h2>
                    {onChainData && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Verified On-Chain
                      </span>
                    )}
                  </div>

                  {loadingOnChain ? (
                    // Shimmer Loading UI
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded w-1/4 mb-2"></div>
                          <div className="h-6 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : onChainData ? (
                    // On-Chain Data Display
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                          <p className="text-xs text-blue-600 font-medium mb-1">
                            Authority (Owner)
                          </p>
                          <p className="text-sm font-mono text-blue-900 break-all">
                            {onChainData.authority.slice(0, 12)}...
                            {onChainData.authority.slice(-8)}
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                          <p className="text-xs text-purple-600 font-medium mb-1">
                            User Type
                          </p>
                          <p className="text-sm font-semibold text-purple-900">
                            {onChainData.userType}
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                          <p className="text-xs text-green-600 font-medium mb-1">
                            Name (On-Chain)
                          </p>
                          <p className="text-sm font-semibold text-green-900">
                            {onChainData.name}
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                          <p className="text-xs text-orange-600 font-medium mb-1">
                            Phone (On-Chain)
                          </p>
                          <p className="text-sm font-semibold text-orange-900">
                            {onChainData.phone}
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 border border-pink-200">
                          <p className="text-xs text-pink-600 font-medium mb-1">
                            Location (On-Chain)
                          </p>
                          <p className="text-sm font-semibold text-pink-900">
                            {onChainData.location}
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                          <p className="text-xs text-yellow-600 font-medium mb-1">
                            Active Status
                          </p>
                          <p className="text-sm font-semibold text-yellow-900">
                            {onChainData.isActive ? "✅ Active" : "❌ Inactive"}
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                          <p className="text-xs text-indigo-600 font-medium mb-1">
                            On-Chain Rating
                          </p>
                          <p className="text-sm font-semibold text-indigo-900">
                            {onChainData.rating} ⭐
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200">
                          <p className="text-xs text-teal-600 font-medium mb-1">
                            Total Jobs (On-Chain)
                          </p>
                          <p className="text-sm font-semibold text-teal-900">
                            {onChainData.totalJobs} jobs
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                          <p className="text-xs text-purple-600 font-medium mb-1">
                            Total Earnings (On-Chain)
                          </p>
                          <p className="text-sm font-semibold text-purple-900">
                            {(
                              parseInt(onChainData.totalEarnings) / 1e9
                            ).toFixed(4)}{" "}
                            SOL
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
                          <p className="text-xs text-emerald-600 font-medium mb-1">
                            Verified By Admin
                          </p>
                          <p className="text-sm font-semibold text-emerald-900">
                            {onChainData.verifiedByAdmin ? "✅ Yes" : "❌ No"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                        <p className="text-xs text-slate-600 font-medium mb-2">
                          Blockchain Timestamps
                        </p>
                        <div className="space-y-1 text-sm">
                          <p className="text-slate-700">
                            <span className="font-medium">Created:</span>{" "}
                            {onChainData.createdAt}
                          </p>
                          {onChainData.verifiedAt && (
                            <p className="text-slate-700">
                              <span className="font-medium">Verified:</span>{" "}
                              {onChainData.verifiedAt}
                            </p>
                          )}
                        </div>
                      </div>

                      {pdaAddress && (
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                          <p className="text-xs text-purple-600 font-medium mb-2">
                            PDA Address
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-mono text-purple-900 break-all flex-1">
                              {pdaAddress}
                            </p>
                            <a
                              href={`https://explorer.solana.com/address/${pdaAddress}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 text-xs font-medium whitespace-nowrap"
                            >
                              Explorer ↗
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : onChainError ? (
                    // Not Verified Yet - Call to Action
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                        <Shield className="w-8 h-8 text-orange-500" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">
                        Worker Not Verified On-Chain
                      </h3>
                      <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">
                        This worker's profile hasn't been uploaded to the Solana
                        blockchain yet. Click the button below to verify and
                        store their data on-chain.
                      </p>
                      <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Scroll down to verify this worker on blockchain
                      </div>
                    </div>
                  ) : null}
                </div>
              </motion.div>

              {/* Contact Information */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Contact Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-slate-400 mt-1" />
                    <div>
                      <p className="text-sm text-slate-600">Email</p>
                      <p className="font-medium text-slate-800">
                        {worker.email || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-slate-400 mt-1" />
                    <div>
                      <p className="text-sm text-slate-600">Phone</p>
                      <p className="font-medium text-slate-800">
                        {worker.phone || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-slate-400 mt-1" />
                    <div>
                      <p className="text-sm text-slate-600">Location</p>
                      <p className="font-medium text-slate-800">
                        {worker.location?.city && worker.location?.state
                          ? `${worker.location.city}, ${worker.location.state}`
                          : "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-slate-400 mt-1" />
                    <div>
                      <p className="text-sm text-slate-600">Country</p>
                      <p className="font-medium text-slate-800">
                        {worker.location?.country || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet & Blockchain Info */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">
                  Blockchain Information
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">
                      Worker Wallet Address
                    </p>
                    <div className="bg-slate-50 rounded-lg p-3 font-mono text-sm text-slate-800 break-all">
                      {worker.walletAddress || "Not provided"}
                    </div>
                  </div>
                  {pdaAddress && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        Generated PDA Address
                      </p>
                      <div className="bg-purple-50 rounded-lg p-3 font-mono text-sm text-purple-800 break-all">
                        {pdaAddress}
                      </div>
                      <a
                        href={`https://explorer.solana.com/address/${pdaAddress}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm font-medium mt-2"
                      >
                        View on Solana Explorer
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  )}
                  {wallet.publicKey && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        Admin Wallet (You)
                      </p>
                      <div className="bg-green-50 rounded-lg p-3 font-mono text-sm text-green-800 break-all">
                        {wallet.publicKey.toString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Details */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                  Professional Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">
                      Experience Level
                    </p>
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium capitalize">
                      {worker.experienceLevel || "Not specified"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Active Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${worker.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                        }`}
                    >
                      {worker.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {worker.skills && worker.skills.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-600 mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {worker.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {worker.jobCategories && worker.jobCategories.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-600 mb-2">
                      Job Categories
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {worker.jobCategories.map((category, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm capitalize"
                        >
                          {category.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {worker.bio && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-600 mb-1">Bio</p>
                    <p className="text-slate-800">{worker.bio}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Stats & Actions */}
            <div className="space-y-6">
              {/* Statistics Card */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">
                  Statistics
                </h2>
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium">
                      Total Jobs
                    </p>
                    <p className="text-3xl font-bold text-blue-800">
                      {worker.totalJobs || 0}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">
                      Completed Jobs
                    </p>
                    <p className="text-3xl font-bold text-green-800">
                      {worker.completedJobs || 0}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                    <p className="text-sm text-purple-600 font-medium">
                      Total Earnings
                    </p>
                    <p className="text-3xl font-bold text-purple-800">
                      {((worker.totalEarnings || 0) / 1e9).toFixed(4)} SOL
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                    <p className="text-sm text-orange-600 font-medium">
                      Average Rating
                    </p>
                    <p className="text-3xl font-bold text-orange-800">
                      {worker.rating?.toFixed(1) || "0.0"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">
                  Verification Status
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Phone Verified
                    </span>
                    {worker.verificationStatus?.phone ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Email Verified
                    </span>
                    {worker.verificationStatus?.email ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Identity Verified
                    </span>
                    {worker.verificationStatus?.identity ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Documents */}
              {worker.documents && worker.documents.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Documents
                  </h2>
                  <div className="space-y-2">
                    {worker.documents.map((doc, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800 capitalize">
                            {doc.type?.replace("_", " ")}
                          </p>
                          <p className="text-xs text-slate-500">
                            {doc.fileName}
                          </p>
                        </div>
                        {doc.verified && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Timestamps
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-600">Created At</p>
                    <p className="font-medium text-slate-800">
                      {worker.createdAt
                        ? new Date(worker.createdAt).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Last Updated</p>
                    <p className="font-medium text-slate-800">
                      {worker.updatedAt
                        ? new Date(worker.updatedAt).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  {worker.lastLoginAt && (
                    <div>
                      <p className="text-slate-600">Last Login</p>
                      <p className="font-medium text-slate-800">
                        {new Date(worker.lastLoginAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Verify Button */}
          {!worker.isVerified && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-md p-6"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">
                    Verify Worker on Blockchain
                  </h3>
                  <p className="text-sm text-slate-600 mb-2">
                    This will create a PDA account for this worker on Solana
                    blockchain
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-slate-700">
                    <p className="font-medium text-blue-800 mb-1">
                      How it works:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Admin wallet signs and pays for the transaction</li>
                      <li>
                        PDA is created using the worker's wallet address as seed
                      </li>
                      <li>Worker information is stored on-chain</li>
                      <li>Worker gains verified status in the system</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={verifyOnBlockchain}
                  disabled={verifying || !wallet.publicKey}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none whitespace-nowrap"
                >
                  {verifying ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Verify on Blockchain
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
