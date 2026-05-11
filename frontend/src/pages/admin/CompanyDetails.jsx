import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  CheckCircle,
  FileText,
  Calendar,
  Shield,
  XCircle,
  Briefcase,
} from "lucide-react";
import { BACKEND_URL, PROGRAM_ID } from "@/env-variables";
import IDL from "@/idl/employment_platform.json" with { type: "json" };
import axios from "axios";

// Program ID as PublicKey from env-variables
const PROGRAM_ID_KEY = new PublicKey(PROGRAM_ID);

export default function CompanyDetailPage() {
  const { walletAddress } = useParams();
  const navigate = useNavigate();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [company, setCompany] = useState(null);
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
    fetchCompanyDetails();
  }, [walletAddress, navigate]);

  // Fetch on-chain data when company data is loaded
  useEffect(() => {
    if (company?.walletAddress) {
      fetchOnChainData();
    }
  }, [company?.walletAddress]);

  useEffect(() => {
    console.log(onChainData);
    async function verifyUserOnBackend() {
      if (onChainData?.verifiedByAdmin == true) {
        try {
          const res = await axios.post(
            `${BACKEND_URL}/admin/verify-company/${walletAddress}`,
            {
              verify: true,
              PDAAddress: pdaAddress,
            }
          );
          console.log(res.data);
        } catch (error) {
          console.error("Error updating backend:", error);
        }
      }
    }
    verifyUserOnBackend();
  }, [onChainData, walletAddress, pdaAddress]);

  const fetchCompanyDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `${BACKEND_URL}/admin/company/${walletAddress}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCompany(data.company);
      } else if (response.status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/admin/login");
      } else if (response.status === 404) {
        toast.error("Company not found");
        navigate("/admin/dashboard");
      } else {
        toast.error("Failed to fetch company details");
      }
    } catch (error) {
      console.error("Error fetching company details:", error);
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
    if (!company?.walletAddress) return;

    setLoadingOnChain(true);
    setOnChainError(false);

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey: null, signTransaction: null, signAllTransactions: null },
        { commitment: "confirmed" }
      );
      const program = new Program(IDL, PROGRAM_ID_KEY, provider);

      const companyPublicKey = new PublicKey(company.walletAddress);
      const [userProfilePDA] = await PublicKey.findProgramAddress(
        [Buffer.from("user_profile"), companyPublicKey.toBuffer()],
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
        userType: accountData.userType.employer ? "Employer" : "Worker",
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

    if (!company.walletAddress) {
      toast.error("Company wallet address not found");
      return;
    }

    setVerifying(true);
    const toastId = toast.loading("Verifying company on blockchain...");

    try {
      const provider = getProvider();
      const program = new Program(IDL, PROGRAM_ID_KEY, provider);

      // Convert company's wallet address to PublicKey
      const companyPublicKey = new PublicKey(company.walletAddress);

      // Derive PDA for company profile
      const [userProfilePDA, bump] = await PublicKey.findProgramAddress(
        [Buffer.from("user_profile"), companyPublicKey.toBuffer()],
        PROGRAM_ID_KEY
      );

      console.log("Admin wallet:", wallet.publicKey.toString());
      console.log("Company wallet (target):", companyPublicKey.toString());
      console.log("Generated PDA:", userProfilePDA.toString());
      console.log("PDA Bump:", bump);
      setPdaAddress(userProfilePDA.toString());

      // Prepare user type enum (Employer for company)
      const userType = { employer: {} };

      // Prepare location string
      const location =
        `${company.location?.city || ""}, ${company.location?.state || ""
          }`.trim() || "Unknown";

      // Call create_user_profile instruction
      const tx = await program.methods
        .createUserProfile(
          userType,
          company.name || company.companyName || "Unknown Company",
          company.phone || "",
          location
        )
        .accounts({
          userProfile: userProfilePDA,
          targetUser: companyPublicKey,
          admin: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Transaction signature:", tx);
      console.log("PDA Address:", userProfilePDA.toString());

      // Update verification status in database
      await updateVerificationStatus(userProfilePDA.toString());

      toast.success(
        <div>
          <div className="font-bold">Company Verified on Blockchain!</div>
          <div className="text-xs mt-1">TX: {tx.slice(0, 8)}...</div>
          <div className="text-xs mt-1">
            PDA: {userProfilePDA.toString().slice(0, 8)}...
          </div>
        </div>,
        { id: toastId, duration: 5000 }
      );

      // Refresh on-chain data
      await fetchOnChainData();
    } catch (err) {
      console.error("Error verifying on blockchain:", err);

      if (
        err.message.includes(
          "Attempt to debit an account but found no record of a prior credit"
        )
      ) {
        toast.error("Admin wallet needs to be funded with SOL", {
          id: toastId,
        });
      } else if (err.message.includes("UnauthorizedAdmin")) {
        toast.error("This wallet is not authorized as admin", { id: toastId });
      } else if (err.message.includes("already in use")) {
        toast.error("Company profile already exists on blockchain", {
          id: toastId,
        });
      } else {
        toast.error(err.message || "Failed to verify on blockchain", {
          id: toastId,
        });
      }
    } finally {
      setVerifying(false);
    }
  };

  const updateVerificationStatus = async (pdaAddress) => {
    try {
      const token = localStorage.getItem("adminToken");
      await fetch(`${BACKEND_URL}/admin/verify-company/${walletAddress}`, {
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
    } catch (error) {
      console.error("Error updating verification status:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <svg
          className="animate-spin h-12 w-12 text-blue-500"
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

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-slate-600">Company not found</p>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="mt-4 text-blue-600 hover:text-blue-700"
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
          {/* Company Header Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-blue-600">
                    {(company.name || company.companyName || "C")
                      ?.charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {company.name || company.companyName || "Unknown Company"}
                  </h1>
                  <div className="flex items-center gap-4 text-blue-100">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {company.totalJobs || 0} Jobs Posted
                    </span>
                  </div>
                </div>
                <div>
                  {company.isVerified ? (
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
            {/* Left Column - Company Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* On-Chain Data Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-xl shadow-lg p-1"
              >
                <div className="bg-white rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Shield className="w-6 h-6 text-blue-600" />
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

                        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-4 border border-cyan-200">
                          <p className="text-xs text-cyan-600 font-medium mb-1">
                            User Type
                          </p>
                          <p className="text-sm font-semibold text-cyan-900">
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
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                          <p className="text-xs text-blue-600 font-medium mb-2">
                            PDA Address
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-mono text-blue-900 break-all flex-1">
                              {pdaAddress}
                            </p>
                            <a
                              href={`https://explorer.solana.com/address/${pdaAddress}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium whitespace-nowrap"
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
                        Company Not Verified On-Chain
                      </h3>
                      <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">
                        This company's profile hasn't been uploaded to the
                        Solana blockchain yet. Click the button below to verify
                        and store their data on-chain.
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
                        Scroll down to verify this company on blockchain
                      </div>
                    </div>
                  ) : null}
                </div>
              </motion.div>

              {/* Contact Information */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Company Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-slate-400 mt-1" />
                    <div>
                      <p className="text-sm text-slate-600">Email</p>
                      <p className="font-medium text-slate-800">
                        {company.email || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-slate-400 mt-1" />
                    <div>
                      <p className="text-sm text-slate-600">Phone</p>
                      <p className="font-medium text-slate-800">
                        {company.phone || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-slate-400 mt-1" />
                    <div>
                      <p className="text-sm text-slate-600">Location</p>
                      <p className="font-medium text-slate-800">
                        {company.location?.city && company.location?.state
                          ? `${company.location.city}, ${company.location.state}`
                          : "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-slate-400 mt-1" />
                    <div>
                      <p className="text-sm text-slate-600">Website</p>
                      {company.website ? (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {company.website}
                        </a>
                      ) : (
                        <p className="font-medium text-slate-800">
                          Not provided
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Blockchain Information */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">
                  Blockchain Information
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">
                      Company Wallet Address
                    </p>
                    <div className="bg-slate-50 rounded-lg p-3 font-mono text-sm text-slate-800 break-all">
                      {company.walletAddress || "Not provided"}
                    </div>
                  </div>
                  {pdaAddress && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        Generated PDA Address
                      </p>
                      <div className="bg-blue-50 rounded-lg p-3 font-mono text-sm text-blue-800 break-all">
                        {pdaAddress}
                      </div>
                      <a
                        href={`https://explorer.solana.com/address/${pdaAddress}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
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

              {/* Company Details */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Company Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Active Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${company.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                        }`}
                    >
                      {company.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Industry</p>
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium capitalize">
                      {company.industry || "Not specified"}
                    </span>
                  </div>
                  {company.companySize && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        Company Size
                      </p>
                      <p className="font-medium text-slate-800">
                        {company.companySize}
                      </p>
                    </div>
                  )}
                  {company.totalJobs !== undefined && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Total Jobs</p>
                      <p className="font-medium text-slate-800">
                        {company.totalJobs} jobs
                      </p>
                    </div>
                  )}
                </div>

                {company.description && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-600 mb-2">Description</p>
                    <p className="text-slate-800">{company.description}</p>
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
                      Total Jobs Posted
                    </p>
                    <p className="text-3xl font-bold text-blue-800">
                      {company.totalJobs || 0}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">
                      Active Jobs
                    </p>
                    <p className="text-3xl font-bold text-green-800">
                      {company.activeJobs || 0}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                    <p className="text-sm text-purple-600 font-medium">
                      Total Paid
                    </p>
                    <p className="text-3xl font-bold text-purple-800">
                      {((company.totalPaid || 0) / 1e9).toFixed(2)} SOL
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                    <p className="text-sm text-orange-600 font-medium">
                      Workers Hired
                    </p>
                    <p className="text-3xl font-bold text-orange-800">
                      {company.workersHired || 0}
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
                      Email Verified
                    </span>
                    {company.verificationStatus?.email ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Phone Verified
                    </span>
                    {company.verificationStatus?.phone ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Legal Verified
                    </span>
                    {company.verificationStatus?.legal ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Timestamps
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-600">Created At</p>
                    <p className="font-medium text-slate-800">
                      {company.createdAt
                        ? new Date(company.createdAt).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Last Updated</p>
                    <p className="font-medium text-slate-800">
                      {company.updatedAt
                        ? new Date(company.updatedAt).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Verify Button */}
          {!company.isVerified && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-md p-6"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">
                    Verify Company on Blockchain
                  </h3>
                  <p className="text-sm text-slate-600 mb-2">
                    This will create a PDA account for this company on Solana
                    blockchain
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-slate-700">
                    <p className="font-medium text-blue-800 mb-1">
                      How it works:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Admin wallet signs and pays for the transaction</li>
                      <li>
                        PDA is created using the company's wallet address as
                        seed
                      </li>
                      <li>Company information is stored on-chain</li>
                      <li>Company gains verified status in the system</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={verifyOnBlockchain}
                  disabled={verifying || !wallet.publicKey}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none whitespace-nowrap"
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
