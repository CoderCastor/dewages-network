import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    MapPin,
    DollarSign,
    Clock,
    Briefcase,
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
    Loader2,
    Database,
    Lock,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import axios from "axios";
import { BACKEND_URL, RPC_URL, PROGRAM_ID } from "@/env-variables";
import toast from "react-hot-toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import idl from "@/idl/employment_platform.json";

const JobDetailsModal = ({ isOpen, onClose, job, onUpdate }) => {
    const [applications, setApplications] = useState([]);
    const [loadingApplications, setLoadingApplications] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [showWorkerDetails, setShowWorkerDetails] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [onChainJobData, setOnChainJobData] = useState(null);
    const [onChainEscrowData, setOnChainEscrowData] = useState(null);
    const [loadingOnChainData, setLoadingOnChainData] = useState(false);
    const [showOnChainData, setShowOnChainData] = useState(false);

    const wallet = useWallet();

    useEffect(() => {
        if (isOpen && job) {
            if (job.status === "open") {
                fetchApplications();
            }
            // Reset on-chain data when modal opens
            setOnChainJobData(null);
            setOnChainEscrowData(null);
            setShowOnChainData(false);
        }
    }, [isOpen, job]);

    const fetchOnChainData = async () => {
        try {
            setLoadingOnChainData(true);
            const connection = new Connection(RPC_URL, "confirmed");
            const provider = new AnchorProvider(
                connection,
                wallet,
                AnchorProvider.defaultOptions(),
            );
            const program = new Program(idl, PROGRAM_ID, provider);

            // Fetch Job PDA data
            const jobPDA = new PublicKey(job.jobPDA);
            const jobAccount = await program.account.job.fetch(jobPDA);
            setOnChainJobData(jobAccount);
            console.log("On-chain job data:", jobAccount);

            // Fetch Escrow PDA data with balance
            const escrowPDA = new PublicKey(job.escrowPDA);
            const escrowAccount =
                await program.account.escrowAccount.fetch(escrowPDA);

            // Fetch actual SOL balance in the escrow account
            const escrowBalance = await connection.getBalance(escrowPDA);

            // Add balance to escrow data
            const escrowWithBalance = {
                ...escrowAccount,
                balance: escrowBalance,
            };

            setOnChainEscrowData(escrowWithBalance);
            console.log("On-chain escrow data:", escrowWithBalance);
            console.log("Escrow balance (lamports):", escrowBalance);

            toast.success("Blockchain data loaded successfully");
        } catch (error) {
            console.error("Error fetching on-chain data:", error);
            toast.error("Failed to fetch blockchain data");
        } finally {
            setLoadingOnChainData(false);
        }
    };

    const fetchApplications = async () => {
        try {
            setLoadingApplications(true);
            const token = localStorage.getItem("token");

            const response = await axios.get(
                `${BACKEND_URL}/job/${job._id}/applications`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
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

    // ── FIX: Retry the backend call when the tx is still propagating ──────────
    // The blockchain tx is already confirmed on-chain by the time this runs
    // (we called connection.confirmTransaction above). But Solana's RPC nodes
    // can still return "not found" for a short window after confirmation.
    // This helper retries the backend API call up to `maxRetries` times
    // whenever the backend responds with { retryable: true }.
    const callApproveWorkerWithRetry = async (payload, maxRetries = 5) => {
        const token = localStorage.getItem("token");

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(
                `📡 Backend call attempt ${attempt}/${maxRetries} for approve-worker`,
            );

            try {
                const response = await axios.post(
                    `${BACKEND_URL}/job/approve-worker`,
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    },
                );

                // Success — return immediately
                if (response.data.success) {
                    return response.data;
                }

                // Backend says tx still propagating — wait and retry
                if (response.data.retryable) {
                    console.log(
                        `⏳ Backend: tx still processing, retrying in 4s... (${attempt}/${maxRetries})`,
                    );
                    if (attempt < maxRetries) {
                        await new Promise((r) => setTimeout(r, 4000));
                        continue;
                    }
                }

                // Non-retryable backend error
                throw new Error(
                    response.data.message || "Failed to update database",
                );
            } catch (err) {
                // Axios network / 5xx errors on last attempt — bubble up
                if (attempt === maxRetries) throw err;

                // For unexpected errors (network blip etc.) also retry
                if (err.response?.data?.retryable === false) throw err;

                console.warn(
                    `⚠️ Attempt ${attempt} failed, retrying...`,
                    err.message,
                );
                await new Promise((r) => setTimeout(r, 4000));
            }
        }

        throw new Error(
            "Transaction could not be confirmed by the server after multiple retries. Please refresh and check job status.",
        );
    };
    // ── End fix ───────────────────────────────────────────────────────────────

    const handleApproveWorker = async (workerWallet) => {
        if (!wallet.publicKey || !wallet.signTransaction) {
            toast.error("Please connect your wallet first");
            return;
        }

        setIsApproving(true);
        const loadingToast = toast.loading(
            "Preparing blockchain transaction...",
        );

        try {
            const connection = new Connection(RPC_URL, "confirmed");
            const provider = new AnchorProvider(
                connection,
                wallet,
                AnchorProvider.defaultOptions(),
            );
            const program = new Program(idl, PROGRAM_ID, provider);

            const jobPDA = new PublicKey(job.jobPDA);
            const [escrowPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("escrow"), jobPDA.toBuffer()],
                new PublicKey(PROGRAM_ID),
            );
            const workerPublicKey = new PublicKey(workerWallet);

            toast.loading("Assigning worker on blockchain...", {
                id: loadingToast,
            });

            const tx = await program.methods
                .assignWorker()
                .accounts({
                    job: jobPDA,
                    escrow: escrowPDA,
                    worker: workerPublicKey,
                    employer: wallet.publicKey,
                })
                .rpc();

            toast.loading("Confirming transaction...", { id: loadingToast });

            // Wait for confirmation with finalized commitment for stronger guarantee
            await connection.confirmTransaction(tx, "finalized");

            console.log("✅ Transaction confirmed:", tx);
            toast.loading("Worker assigned on blockchain!", {
                id: loadingToast,
            });

            // Wait a moment for state to propagate
            toast.loading("Refreshing on-chain data...", { id: loadingToast });
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Fetch updated Job PDA with multiple attempts
            let updatedJobAccount = null;
            let attempts = 0;
            const maxAttempts = 5;

            while (attempts < maxAttempts) {
                try {
                    updatedJobAccount = await program.account.job.fetch(jobPDA);
                    console.log(
                        `Attempt ${attempts + 1} - Job Status:`,
                        updatedJobAccount.status,
                    );

                    // Check if status has been updated (InProgress = 1)
                    if (
                        updatedJobAccount.status === 1 ||
                        (typeof updatedJobAccount.status === "object" &&
                            updatedJobAccount.status.inProgress)
                    ) {
                        console.log(
                            "✅ Job status successfully updated to InProgress",
                        );
                        break;
                    }

                    // If still showing Open (0), wait and retry
                    if (attempts < maxAttempts - 1) {
                        console.log("⏳ Status still Open, retrying...");
                        await new Promise((resolve) =>
                            setTimeout(resolve, 1000),
                        );
                    }
                } catch (error) {
                    console.error(
                        `Fetch attempt ${attempts + 1} failed:`,
                        error,
                    );
                }
                attempts++;
            }

            if (updatedJobAccount) {
                setOnChainJobData(updatedJobAccount);
                setShowOnChainData(true); // Auto-expand on-chain data after approval
                console.log("📊 Updated on-chain job data:", updatedJobAccount);
                console.log("📊 Job Status Value:", updatedJobAccount.status);
                console.log("📊 Worker:", updatedJobAccount.worker?.toString());
            }

            // Fetch updated Escrow PDA
            const updatedEscrowAccount =
                await program.account.escrowAccount.fetch(escrowPDA);
            const updatedEscrowBalance = await connection.getBalance(escrowPDA);
            setOnChainEscrowData({
                ...updatedEscrowAccount,
                balance: updatedEscrowBalance,
            });
            console.log(
                "📊 Updated on-chain escrow data:",
                updatedEscrowAccount,
            );
            console.log(
                "📊 Escrow Worker:",
                updatedEscrowAccount.worker.toString(),
            );

            // ── FIX: Use retry-aware backend call instead of a plain axios.post ──
            toast.loading("Updating database...", { id: loadingToast });

            const result = await callApproveWorkerWithRetry({
                jobId: job._id,
                workerWallet,
                transactionSignature: tx,
                escrowPDA: escrowPDA.toString(),
            });

            console.log("Backend response:", result);

            toast.success("Worker approved successfully!", {
                id: loadingToast,
            });
            if (onUpdate) onUpdate();

            // Small delay before closing to show success
            setTimeout(() => {
                onClose();
            }, 1000);
            // ── End fix ────────────────────────────────────────────────────────────
        } catch (error) {
            console.error("Error approving worker:", error);
            toast.dismiss(loadingToast);

            if (error.message?.includes("User rejected")) {
                toast.error("Transaction cancelled by user");
            } else if (error.message?.includes("UnauthorizedEmployer")) {
                toast.error(
                    "You are not authorized to approve workers for this job",
                );
            } else if (error.message?.includes("JobNotOpen")) {
                toast.error("This job is no longer open for applications");
            } else if (error.response?.data?.message) {
                toast.error("Database error: " + error.response.data.message);
            } else {
                toast.error(
                    "Failed to approve worker: " +
                        (error.message || "Unknown error"),
                );
            }
        } finally {
            setIsApproving(false);
        }
    };

    const handleToggleOnChainData = () => {
        if (!showOnChainData && !onChainJobData && !onChainEscrowData) {
            fetchOnChainData();
        }
        setShowOnChainData(!showOnChainData);
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

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "N/A";
        const date = new Date(timestamp.toNumber() * 1000);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatPayment = (lamports) => {
        const sol = lamports / 1_000_000_000;
        return sol.toFixed(4);
    };

    const getStatusColor = (status) => {
        const colors = {
            open: "bg-green-100 text-green-700 border-green-200",
            in_progress: "bg-blue-100 text-blue-700 border-blue-200",
            pending_verification:
                "bg-yellow-100 text-yellow-700 border-yellow-200",
            completed: "bg-gray-100 text-gray-700 border-gray-200",
            disputed: "bg-red-100 text-red-700 border-red-200",
            cancelled: "bg-gray-100 text-gray-500 border-gray-200",
        };
        return colors[status] || colors.open;
    };

    const getOnChainStatusLabel = (status) => {
        // Handle both numeric and object status formats
        let statusValue = status;

        if (typeof status === "object") {
            if (status.open !== undefined) statusValue = 0;
            else if (status.inProgress !== undefined) statusValue = 1;
            else if (status.pendingVerification !== undefined) statusValue = 2;
            else if (status.completed !== undefined) statusValue = 3;
            else if (status.disputed !== undefined) statusValue = 4;
            else if (status.cancelled !== undefined) statusValue = 5;
        }

        const statusMap = {
            0: { label: "Open", color: "green" },
            1: { label: "In Progress", color: "blue" },
            2: { label: "Pending Verification", color: "yellow" },
            3: { label: "Completed", color: "gray" },
            4: { label: "Disputed", color: "red" },
            5: { label: "Cancelled", color: "gray" },
        };
        return statusMap[statusValue] || statusMap[0];
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
                                <h2 className="text-xl font-bold text-white">
                                    Job Details
                                </h2>
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
                                <h3 className="text-2xl font-bold text-gray-900">
                                    {job.title}
                                </h3>
                                <span
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                        job.status,
                                    )}`}
                                >
                                    {job.status.replace("_", " ").toUpperCase()}
                                </span>
                            </div>
                            <p className="text-gray-600 text-lg">
                                {job.description}
                            </p>
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
                                        <p className="text-sm text-green-700 font-medium">
                                            Payment
                                        </p>
                                        <p className="text-2xl font-bold text-green-900">
                                            {formatPayment(job.paymentAmount)}{" "}
                                            SOL
                                        </p>
                                        <p className="text-xs text-green-600">
                                            ≈ ₹
                                            {job.paymentAmountINR?.toLocaleString(
                                                "en-IN",
                                            )}
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
                                        <p className="text-sm text-blue-700 font-medium">
                                            Duration
                                        </p>
                                        <p className="text-2xl font-bold text-blue-900">
                                            {job.durationHours} hours
                                        </p>
                                        <p className="text-xs text-blue-600">
                                            ≈ {Math.ceil(job.durationHours / 8)}{" "}
                                            day
                                            {Math.ceil(job.durationHours / 8) >
                                            1
                                                ? "s"
                                                : ""}
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
                                        <p className="text-sm text-purple-700 font-medium">
                                            Location
                                        </p>
                                        <p className="text-base font-semibold text-purple-900">
                                            {job.location?.city}
                                        </p>
                                        <p className="text-xs text-purple-600">
                                            {job.location?.address},{" "}
                                            {job.location?.state}
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
                                        <p className="text-sm text-orange-700 font-medium">
                                            Category
                                        </p>
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
                                <h4 className="font-semibold text-gray-900">
                                    Requirements
                                </h4>
                            </div>
                            <p className="text-gray-700">{job.requirements}</p>
                        </div>

                        {/* Blockchain Details */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center space-x-2 mb-3">
                                <Shield className="w-5 h-5 text-blue-600" />
                                <h4 className="font-semibold text-blue-900">
                                    Blockchain Details
                                </h4>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-blue-700">
                                        Job PDA:
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <code className="text-xs bg-blue-100 px-2 py-1 rounded font-mono">
                                            {job.jobPDA?.slice(0, 8)}...
                                            {job.jobPDA?.slice(-8)}
                                        </code>
                                        <button
                                            onClick={() =>
                                                copyToClipboard(
                                                    job.jobPDA,
                                                    "Job PDA",
                                                )
                                            }
                                            className="p-1 hover:bg-blue-200 rounded transition-colors"
                                        >
                                            <Copy className="w-4 h-4 text-blue-600" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-blue-700">
                                        Escrow PDA:
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <code className="text-xs bg-blue-100 px-2 py-1 rounded font-mono">
                                            {job.escrowPDA?.slice(0, 8)}...
                                            {job.escrowPDA?.slice(-8)}
                                        </code>
                                        <button
                                            onClick={() =>
                                                copyToClipboard(
                                                    job.escrowPDA,
                                                    "Escrow PDA",
                                                )
                                            }
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

                        {/* On-Chain Data Section - Single Unified Card */}
                        <div className="border-t border-gray-200 pt-6 mb-6">
                            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-emerald-50 border-2 border-indigo-200 rounded-xl overflow-hidden">
                                <button
                                    onClick={handleToggleOnChainData}
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-white hover:bg-opacity-40 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-indigo-200 rounded-lg">
                                            <Database className="w-5 h-5 text-indigo-700" />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="font-bold text-indigo-900 text-lg">
                                                Blockchain Account Data
                                            </h4>
                                            <p className="text-xs text-indigo-600">
                                                View Job PDA & Escrow PDA
                                                Details
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {loadingOnChainData && (
                                            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                                        )}
                                        {showOnChainData ? (
                                            <ChevronUp className="w-6 h-6 text-indigo-700" />
                                        ) : (
                                            <ChevronDown className="w-6 h-6 text-indigo-700" />
                                        )}
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {showOnChainData && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{
                                                height: "auto",
                                                opacity: 1,
                                            }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-6">
                                                {onChainJobData &&
                                                onChainEscrowData ? (
                                                    <div className="space-y-6">
                                                        {/* Job PDA Section */}
                                                        <div className="bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl p-5 border-2 border-indigo-300">
                                                            <div className="flex items-center space-x-2 mb-4">
                                                                <Briefcase className="w-5 h-5 text-indigo-700" />
                                                                <h5 className="font-bold text-indigo-900 text-base">
                                                                    Job PDA
                                                                    Account
                                                                </h5>
                                                            </div>

                                                            <div className="space-y-3">
                                                                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                    <p className="text-xs text-indigo-600 font-medium mb-1">
                                                                        Status
                                                                    </p>
                                                                    <div className="flex items-center space-x-2">
                                                                        {(() => {
                                                                            const statusInfo =
                                                                                getOnChainStatusLabel(
                                                                                    onChainJobData.status,
                                                                                );
                                                                            return (
                                                                                <span
                                                                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-${statusInfo.color}-100 text-${statusInfo.color}-700 border border-${statusInfo.color}-300`}
                                                                                >
                                                                                    {
                                                                                        statusInfo.label
                                                                                    }
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </div>

                                                                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                    <p className="text-xs text-indigo-600 font-medium mb-1">
                                                                        Employer
                                                                    </p>
                                                                    <code className="text-xs font-mono text-indigo-900 break-all">
                                                                        {onChainJobData.employer.toString()}
                                                                    </code>
                                                                </div>

                                                                {onChainJobData.worker && (
                                                                    <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                        <p className="text-xs text-indigo-600 font-medium mb-1">
                                                                            Assigned
                                                                            Worker
                                                                        </p>
                                                                        <code className="text-xs font-mono text-indigo-900 break-all">
                                                                            {onChainJobData.worker.toString()}
                                                                        </code>
                                                                    </div>
                                                                )}

                                                                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                    <p className="text-xs text-indigo-600 font-medium mb-1">
                                                                        Payment
                                                                        Amount
                                                                    </p>
                                                                    <p className="text-lg font-bold text-indigo-900">
                                                                        {formatPayment(
                                                                            onChainJobData.paymentAmount.toNumber(),
                                                                        )}{" "}
                                                                        SOL
                                                                    </p>
                                                                </div>

                                                                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                    <p className="text-xs text-indigo-600 font-medium mb-1">
                                                                        Created
                                                                        At
                                                                    </p>
                                                                    <p className="text-sm text-indigo-900">
                                                                        {formatTimestamp(
                                                                            onChainJobData.createdAt,
                                                                        )}
                                                                    </p>
                                                                </div>

                                                                {onChainJobData.startedAt &&
                                                                    onChainJobData.startedAt.toNumber() >
                                                                        0 && (
                                                                        <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                            <p className="text-xs text-indigo-600 font-medium mb-1">
                                                                                Started
                                                                                At
                                                                            </p>
                                                                            <p className="text-sm text-indigo-900">
                                                                                {formatTimestamp(
                                                                                    onChainJobData.startedAt,
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                {onChainJobData.completedAt &&
                                                                    onChainJobData.completedAt.toNumber() >
                                                                        0 && (
                                                                        <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                            <p className="text-xs text-indigo-600 font-medium mb-1">
                                                                                Completed
                                                                                At
                                                                            </p>
                                                                            <p className="text-sm text-indigo-900">
                                                                                {formatTimestamp(
                                                                                    onChainJobData.completedAt,
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        </div>

                                                        {/* Divider */}
                                                        <div className="relative">
                                                            <div className="absolute inset-0 flex items-center">
                                                                <div className="w-full border-t-2 border-indigo-300"></div>
                                                            </div>
                                                            <div className="relative flex justify-center">
                                                                <span className="px-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-emerald-50 text-sm font-semibold text-indigo-700">
                                                                    ESCROW DATA
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Escrow PDA Section */}
                                                        <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl p-5 border-2 border-emerald-300">
                                                            <div className="flex items-center space-x-2 mb-4">
                                                                <Lock className="w-5 h-5 text-emerald-700" />
                                                                <h5 className="font-bold text-emerald-900 text-base">
                                                                    Escrow PDA
                                                                    Account
                                                                </h5>
                                                            </div>

                                                            <div className="space-y-3">
                                                                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                    <p className="text-xs text-emerald-600 font-medium mb-1">
                                                                        Job
                                                                        Reference
                                                                    </p>
                                                                    <code className="text-xs font-mono text-emerald-900 break-all">
                                                                        {onChainEscrowData.job.toString()}
                                                                    </code>
                                                                </div>

                                                                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                    <p className="text-xs text-emerald-600 font-medium mb-1">
                                                                        Employer
                                                                    </p>
                                                                    <code className="text-xs font-mono text-emerald-900 break-all">
                                                                        {onChainEscrowData.employer.toString()}
                                                                    </code>
                                                                </div>

                                                                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                    <p className="text-xs text-emerald-600 font-medium mb-1">
                                                                        Assigned
                                                                        Worker
                                                                    </p>
                                                                    {onChainEscrowData.worker &&
                                                                    onChainEscrowData.worker.toString() !==
                                                                        "11111111111111111111111111111111" ? (
                                                                        <code className="text-xs font-mono text-emerald-900 break-all">
                                                                            {onChainEscrowData.worker.toString()}
                                                                        </code>
                                                                    ) : (
                                                                        <div className="flex items-center space-x-2">
                                                                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                                                                            <span className="text-sm text-yellow-700 font-medium">
                                                                                Worker
                                                                                not
                                                                                assigned
                                                                                yet
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                    <p className="text-xs text-emerald-600 font-medium mb-1">
                                                                        Escrow
                                                                        Balance
                                                                        (Actual)
                                                                    </p>
                                                                    <p className="text-lg font-bold text-emerald-900">
                                                                        {formatPayment(
                                                                            onChainEscrowData.balance,
                                                                        )}{" "}
                                                                        SOL
                                                                    </p>
                                                                    <p className="text-xs text-emerald-600 mt-1">
                                                                        {onChainEscrowData.balance.toLocaleString()}{" "}
                                                                        lamports
                                                                    </p>
                                                                </div>

                                                                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                    <p className="text-xs text-emerald-600 font-medium mb-1">
                                                                        Locked
                                                                        Amount
                                                                        (Expected)
                                                                    </p>
                                                                    <p className="text-lg font-bold text-emerald-900">
                                                                        {formatPayment(
                                                                            onChainEscrowData.amount.toNumber(),
                                                                        )}{" "}
                                                                        SOL
                                                                    </p>
                                                                </div>

                                                                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                    <p className="text-xs text-emerald-600 font-medium mb-1">
                                                                        Lock
                                                                        Status
                                                                    </p>
                                                                    <div className="flex items-center space-x-2">
                                                                        {onChainEscrowData.isLocked ? (
                                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
                                                                                <Lock className="w-3 h-3 mr-1" />
                                                                                Locked
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
                                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                                Released
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="bg-white bg-opacity-70 rounded-lg p-3">
                                                                    <p className="text-xs text-emerald-600 font-medium mb-1">
                                                                        Created
                                                                        At
                                                                    </p>
                                                                    <p className="text-sm text-emerald-900">
                                                                        {formatTimestamp(
                                                                            onChainEscrowData.createdAt,
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Refresh Button */}
                                                        <button
                                                            onClick={
                                                                fetchOnChainData
                                                            }
                                                            disabled={
                                                                loadingOnChainData
                                                            }
                                                            className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 font-medium"
                                                        >
                                                            {loadingOnChainData ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                    <span>
                                                                        Refreshing
                                                                        Data...
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Database className="w-4 h-4" />
                                                                    <span>
                                                                        Refresh
                                                                        Blockchain
                                                                        Data
                                                                    </span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8">
                                                        <Database className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                                                        <p className="text-sm text-indigo-700 mb-4">
                                                            Load on-chain data
                                                            to view Job PDA and
                                                            Escrow PDA details
                                                        </p>
                                                        <button
                                                            onClick={
                                                                fetchOnChainData
                                                            }
                                                            disabled={
                                                                loadingOnChainData
                                                            }
                                                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium inline-flex items-center space-x-2"
                                                        >
                                                            {loadingOnChainData ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                    <span>
                                                                        Loading...
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Database className="w-4 h-4" />
                                                                    <span>
                                                                        Load
                                                                        Blockchain
                                                                        Data
                                                                    </span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Worker Info (if assigned) */}
                        {job.assignedWorker && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                <div className="flex items-center space-x-2 mb-3">
                                    <UserCheck className="w-5 h-5 text-green-600" />
                                    <h4 className="font-semibold text-green-900">
                                        Assigned Worker
                                    </h4>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                                            <span className="text-green-700 font-semibold">
                                                {job.workerName
                                                    ?.charAt(0)
                                                    .toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-green-900">
                                                {job.workerName}
                                            </p>
                                            <p className="text-xs text-green-600 font-mono">
                                                {job.assignedWorker.slice(0, 8)}
                                                ...
                                                {job.assignedWorker.slice(-8)}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() =>
                                            copyToClipboard(
                                                job.assignedWorker,
                                                "Worker Address",
                                            )
                                        }
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
                                        <p className="text-gray-600">
                                            No applications yet
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Workers will see this job and can
                                            apply
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
                                                                {app.workerName
                                                                    ?.charAt(0)
                                                                    .toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-2 mb-1">
                                                                <h5 className="font-semibold text-gray-900">
                                                                    {
                                                                        app.workerName
                                                                    }
                                                                </h5>
                                                                {app.workerDetails && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                                        <span className="text-sm font-medium text-gray-700">
                                                                            {app.workerDetails.rating?.toFixed(
                                                                                1,
                                                                            ) ||
                                                                                "N/A"}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {app.workerDetails && (
                                                                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                                                    <span>
                                                                        {app
                                                                            .workerDetails
                                                                            .completedJobs ||
                                                                            0}{" "}
                                                                        jobs
                                                                        completed
                                                                    </span>
                                                                    <span className="capitalize">
                                                                        {
                                                                            app
                                                                                .workerDetails
                                                                                .experienceLevel
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {app.coverLetter && (
                                                                <p className="text-sm text-gray-600 mb-2">
                                                                    {
                                                                        app.coverLetter
                                                                    }
                                                                </p>
                                                            )}

                                                            <p className="text-xs text-gray-500">
                                                                Applied on{" "}
                                                                {formatDate(
                                                                    app.appliedAt,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col space-y-2 ml-4">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedWorker(
                                                                    app.workerDetails,
                                                                );
                                                                setShowWorkerDetails(
                                                                    true,
                                                                );
                                                            }}
                                                            className="px-4 py-2 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-1"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            <span>
                                                                View Profile
                                                            </span>
                                                        </button>

                                                        {app.status ===
                                                            "pending" && (
                                                            <button
                                                                onClick={() =>
                                                                    handleApproveWorker(
                                                                        app.workerWallet,
                                                                    )
                                                                }
                                                                disabled={
                                                                    isApproving
                                                                }
                                                                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {isApproving ? (
                                                                    <>
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                        <span>
                                                                            Approving...
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <CheckCircle className="w-4 h-4" />
                                                                        <span>
                                                                            Approve
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}

                                                        {app.status ===
                                                            "approved" && (
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
                                <h3 className="text-xl font-bold text-white">
                                    Worker Profile
                                </h3>
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
                                            {selectedWorker.name
                                                ?.charAt(0)
                                                .toUpperCase()}
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
                                                    star <=
                                                    (selectedWorker.rating || 0)
                                                        ? "fill-yellow-500"
                                                        : ""
                                                }`}
                                            />
                                        ))}
                                        <span className="text-gray-700 font-semibold ml-2">
                                            {selectedWorker.rating?.toFixed(
                                                1,
                                            ) || "N/A"}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    {/* Add rest of worker profile details */}
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
