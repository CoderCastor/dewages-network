import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Briefcase,
  DollarSign,
  MapPin,
  Clock,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Lock,
  Info,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import axios from "axios";
import toast from "react-hot-toast";
import { BACKEND_URL, RPC_URL, PROGRAM_ID } from "@/env-variables";
import idl from "@/idl/employment_platform.json" with { type: "json" };

const JOB_CATEGORIES = [
  { value: "construction", label: "Construction" },
  { value: "delivery", label: "Delivery" },
  { value: "domestic_help", label: "Domestic Help" },
  { value: "event_staffing", label: "Event Staffing" },
  { value: "agriculture", label: "Agriculture" },
  { value: "cleaning", label: "Cleaning" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];

const PostJobModal = ({ isOpen, onClose, onJobPosted }) => {
  const { publicKey } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    paymentAmount: "",
    location: {
      address: "",
      city: "",
      state: "",
    },
    durationHours: "",
    requirements: "",
  });

  const [errors, setErrors] = useState({});

  const updateFormData = (field, value) => {
    if (field.includes(".")) {
      const keys = field.split(".");
      setFormData((prev) => {
        const newData = { ...prev };
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return newData;
      });
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim())
      newErrors.description = "Description is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.paymentAmount || parseFloat(formData.paymentAmount) <= 0)
      newErrors.paymentAmount = "Valid payment amount is required";
    if (!formData.location.address.trim())
      newErrors["location.address"] = "Address is required";
    if (!formData.location.city.trim())
      newErrors["location.city"] = "City is required";
    if (!formData.durationHours || parseInt(formData.durationHours) <= 0)
      newErrors.durationHours = "Valid duration is required";
    if (!formData.requirements.trim())
      newErrors.requirements = "Requirements are required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const validateBeforeSubmit = () => {
    if (!publicKey) {
      toast.error("Please connect your wallet first");
      return false;
    }

    if (!window.solana) {
      toast.error("Please install Phantom wallet");
      return false;
    }

    const payment = parseFloat(formData.paymentAmount);
    if (isNaN(payment) || payment <= 0) {
      toast.error("Invalid payment amount");
      return false;
    }

    const duration = parseInt(formData.durationHours);
    if (isNaN(duration) || duration <= 0) {
      toast.error("Invalid duration");
      return false;
    }

    return true;
  };

  const createJobOnChain = async () => {
    try {
      console.log("=== Starting Blockchain Transaction ===");
      console.log("Form Data:", formData);

      const connection = new Connection(RPC_URL, "confirmed");

      if (!window.solana || !window.solana.isConnected) {
        throw new Error(
          "Wallet not connected. Please connect your wallet first."
        );
      }

      const provider = new AnchorProvider(connection, window.solana, {
        commitment: "confirmed",
      });
      console.log("IDL structure check:", {
        hasVersion: !!idl.version,
        hasName: !!idl.name,
        hasInstructions: !!idl.instructions,
        instructionCount: idl.instructions?.length,
        hasAccounts: !!idl.accounts,
        accountCount: idl.accounts?.length,
        programIdType: typeof PROGRAM_ID,
        programIdValue: PROGRAM_ID,
      });
      // Convert string to PublicKey if needed
      const programId =
        typeof PROGRAM_ID === "string" ? new PublicKey(PROGRAM_ID) : PROGRAM_ID;

      console.log("Program ID:", programId.toString());
      const program = new Program(idl, programId, provider);
      console.log("✓ Program initialized");

      const jobAccount = Keypair.generate();
      console.log("✓ Job Account:", jobAccount.publicKey.toString());

      const [escrowPDA, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), jobAccount.publicKey.toBuffer()],
        programId // Use programId here too
      );
      console.log("✓ Escrow PDA:", escrowPDA.toString());
      console.log("✓ Bump:", bump);

      const categoryEnum = (() => {
        switch (formData.category) {
          case "construction":
            return { construction: {} };
          case "delivery":
            return { delivery: {} };
          case "domestic_help":
            return { domesticHelp: {} };
          case "event_staffing":
            return { eventStaffing: {} };
          case "agriculture":
            return { agriculture: {} };
          case "cleaning":
            return { cleaning: {} };
          case "security":
            return { security: {} };
          case "other":
            return { other: {} };
          default:
            throw new Error(`Unknown category: ${formData.category}`);
        }
      })();
      console.log("✓ Category enum:", JSON.stringify(categoryEnum));

      const paymentSOL = parseFloat(formData.paymentAmount);
      if (isNaN(paymentSOL) || paymentSOL <= 0) {
        throw new Error("Invalid payment amount");
      }
      const paymentLamports = new BN(
        Math.floor(paymentSOL * web3.LAMPORTS_PER_SOL)
      );
      console.log(
        "✓ Payment:",
        paymentSOL,
        "SOL =",
        paymentLamports.toString(),
        "lamports"
      );

      const locationString = `${formData.location.address}, ${formData.location.city}`;
      console.log("✓ Location:", locationString);

      const durationHours = parseInt(formData.durationHours);
      if (isNaN(durationHours) || durationHours <= 0) {
        throw new Error("Invalid duration");
      }
      console.log("✓ Duration:", durationHours, "hours");

      const instructionParams = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: categoryEnum,
        paymentAmount: paymentLamports,
        location: locationString,
        durationHours: durationHours,
        requirements: formData.requirements.trim(),
      };
      console.log("✓ Instruction params prepared");

      const balance = await connection.getBalance(publicKey);
      const balanceSOL = balance / web3.LAMPORTS_PER_SOL;
      console.log("✓ Wallet balance:", balanceSOL, "SOL");

      const requiredAmount =
        paymentLamports.toNumber() + 0.02 * web3.LAMPORTS_PER_SOL;
      if (balance < requiredAmount) {
        throw new Error(
          `Insufficient funds. Need ${(
            requiredAmount / web3.LAMPORTS_PER_SOL
          ).toFixed(4)} SOL but have ${balanceSOL.toFixed(4)} SOL`
        );
      }

      console.log("Building transaction...");

      try {
        const tx = await program.methods
          .postJob(
            instructionParams.title,
            instructionParams.description,
            instructionParams.category,
            instructionParams.paymentAmount,
            instructionParams.location,
            instructionParams.durationHours,
            instructionParams.requirements
          )
          .accounts({
            job: jobAccount.publicKey,
            escrow: escrowPDA,
            employer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([jobAccount])
          .rpc();

        console.log("✓ Transaction sent:", tx);

        console.log("Waiting for confirmation...");
        const latestBlockhash = await connection.getLatestBlockhash();

        await connection.confirmTransaction(
          {
            signature: tx,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          },
          "confirmed"
        );

        console.log("✓ Transaction confirmed!");

        return {
          jobPDA: jobAccount.publicKey.toString(),
          escrowPDA: escrowPDA.toString(),
          txSignature: tx,
        };
      } catch (txError) {
        console.error("Transaction error:", txError);

        if (txError.logs) {
          console.error("Program logs:");
          txError.logs.forEach((log, i) => console.error(`  ${i}: ${log}`));
        }

        throw txError;
      }
    } catch (error) {
      console.error("❌ Blockchain error:", error);

      if (error.message?.includes("User rejected")) {
        throw new Error("Transaction cancelled by user");
      } else if (error.message?.includes("Insufficient funds")) {
        throw error;
      } else if (error.message?.includes("0x1")) {
        throw new Error(
          "Insufficient funds. You need approximately " +
            (parseFloat(formData.paymentAmount) + 0.02).toFixed(2) +
            " SOL"
        );
      } else if (error.message?.includes("0x0")) {
        throw new Error("Transaction simulation failed. Check wallet balance.");
      } else if (error.message?.includes("invalid program argument")) {
        throw new Error(
          "Invalid data format. Please regenerate your IDL file by running 'anchor build'."
        );
      } else if (error.logs) {
        console.error("Program logs:", error.logs);
        const errorLog = error.logs.find((log) => log.includes("Error"));
        if (errorLog) {
          throw new Error("Smart contract error: " + errorLog);
        }
        throw new Error("Transaction failed. Check console for details.");
      } else {
        throw new Error(error.message || "Unknown blockchain error");
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateBeforeSubmit()) {
      return;
    }

    setIsSubmitting(true);
    setCurrentStep(3);

    let jobPDA = null;
    let escrowPDA = null;
    let txSignature = null;

    try {
      toast.loading("Creating job on blockchain...", { id: "blockchain-tx" });

      const blockchainResult = await createJobOnChain();
      jobPDA = blockchainResult.jobPDA;
      escrowPDA = blockchainResult.escrowPDA;
      txSignature = blockchainResult.txSignature;

      toast.success("Job created on blockchain!", { id: "blockchain-tx" });
      console.log("✓ Blockchain success:", txSignature);

      toast.loading("Saving job details...", { id: "mongodb-save" });

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BACKEND_URL}/job/create`,
        {
          jobPDA,
          escrowPDA,
          transactionSignature: txSignature,
          companyWallet: publicKey.toString(),
          title: formData.title,
          description: formData.description,
          category: formData.category,
          location: {
            address: formData.location.address,
            city: formData.location.city,
            state: formData.location.state || "",
            coordinates: [0, 0],
          },
          paymentAmount:
            parseFloat(formData.paymentAmount) * web3.LAMPORTS_PER_SOL,
          paymentAmountINR: parseFloat(formData.paymentAmount) * 8000,
          durationHours: parseInt(formData.durationHours),
          requirements: formData.requirements,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("Job saved successfully!", { id: "mongodb-save" });
      console.log("✓ MongoDB save success:", response.data.job?.id);

      toast.success("🎉 Job posted! Workers can now apply.", {
        duration: 4000,
      });

      if (onJobPosted) {
        onJobPosted(response.data.job);
      }

      setTimeout(() => {
        resetForm();
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error posting job:", error);

      if (!txSignature) {
        toast.error(error.message || "Failed to create job on blockchain", {
          id: "blockchain-tx",
          duration: 5000,
        });
      } else {
        toast.error(
          `Job created on blockchain but failed to save. Transaction: ${txSignature.slice(
            0,
            8
          )}...`,
          { id: "mongodb-save", duration: 8000 }
        );

        console.error("RECOVERY INFO:", {
          txSignature,
          jobPDA,
          escrowPDA,
          formData,
        });
      }

      setCurrentStep(2);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      paymentAmount: "",
      location: {
        address: "",
        city: "",
        state: "",
      },
      durationHours: "",
      requirements: "",
    });
    setErrors({});
    setCurrentStep(1);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <motion.div
                initial={{ rotate: -10 }}
                animate={{ rotate: 0 }}
                className="p-2 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm"
              >
                <Briefcase className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-white">Post New Job</h2>
                <p className="text-blue-100 text-sm">
                  Step {currentStep} of 3 • Secure Escrow Payment
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-100 h-2 relative overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full absolute left-0 top-0"
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / 3) * 100}%` }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => updateFormData("title", e.target.value)}
                      placeholder="e.g., Experienced Painter Needed"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.title ? "border-red-500" : "border-gray-300"
                      }`}
                      maxLength={100}
                    />
                    {errors.title && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm mt-1 flex items-center gap-1"
                      >
                        <AlertCircle size={14} /> {errors.title}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        updateFormData("description", e.target.value)
                      }
                      placeholder="Describe the job requirements and responsibilities..."
                      rows="4"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all ${
                        errors.description
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      maxLength={500}
                    />
                    <div className="flex justify-between items-center mt-1">
                      {errors.description && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm flex items-center gap-1"
                        >
                          <AlertCircle size={14} /> {errors.description}
                        </motion.p>
                      )}
                      <p className="text-gray-500 text-sm ml-auto">
                        {formData.description.length}/500
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          updateFormData("category", e.target.value)
                        }
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.category ? "border-red-500" : "border-gray-300"
                        }`}
                      >
                        <option value="">Select category</option>
                        {JOB_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-1 flex items-center gap-1"
                        >
                          <AlertCircle size={14} /> {errors.category}
                        </motion.p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Amount (SOL){" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          value={formData.paymentAmount}
                          onChange={(e) =>
                            updateFormData("paymentAmount", e.target.value)
                          }
                          placeholder="0.5"
                          step="0.01"
                          min="0.1"
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                            errors.paymentAmount
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                        />
                      </div>
                      {errors.paymentAmount && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-1 flex items-center gap-1"
                        >
                          <AlertCircle size={14} /> {errors.paymentAmount}
                        </motion.p>
                      )}
                      {formData.paymentAmount && (
                        <p className="text-gray-500 text-xs mt-1">
                          ≈ ₹
                          {(parseFloat(formData.paymentAmount) * 8000).toFixed(
                            2
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      Location Details
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.location.address}
                        onChange={(e) =>
                          updateFormData("location.address", e.target.value)
                        }
                        placeholder="Street address"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors["location.address"]
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {errors["location.address"] && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-1 flex items-center gap-1"
                        >
                          <AlertCircle size={14} /> {errors["location.address"]}
                        </motion.p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.location.city}
                          onChange={(e) =>
                            updateFormData("location.city", e.target.value)
                          }
                          placeholder="Mumbai"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                            errors["location.city"]
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                        />
                        {errors["location.city"] && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-500 text-sm mt-1 flex items-center gap-1"
                          >
                            <AlertCircle size={14} /> {errors["location.city"]}
                          </motion.p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          value={formData.location.state}
                          onChange={(e) =>
                            updateFormData("location.state", e.target.value)
                          }
                          placeholder="Maharashtra"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Duration & Requirements */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (Hours) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        value={formData.durationHours}
                        onChange={(e) =>
                          updateFormData("durationHours", e.target.value)
                        }
                        placeholder="8"
                        min="1"
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.durationHours
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                    </div>
                    {errors.durationHours && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-sm mt-1 flex items-center gap-1"
                      >
                        <AlertCircle size={14} /> {errors.durationHours}
                      </motion.p>
                    )}
                    {formData.durationHours && (
                      <p className="text-gray-500 text-xs mt-1">
                        ≈ {Math.ceil(parseInt(formData.durationHours) / 8)}{" "}
                        working days
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Requirements <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.requirements}
                      onChange={(e) =>
                        updateFormData("requirements", e.target.value)
                      }
                      placeholder="List specific requirements, skills, or tools needed..."
                      rows="3"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all ${
                        errors.requirements
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      maxLength={300}
                    />
                    <div className="flex justify-between items-center mt-1">
                      {errors.requirements && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm flex items-center gap-1"
                        >
                          <AlertCircle size={14} /> {errors.requirements}
                        </motion.p>
                      )}
                      <p className="text-gray-500 text-sm ml-auto">
                        {formData.requirements.length}/300
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <motion.div
                        animate={{ rotate: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Lock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      </motion.div>
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                          Secure Escrow Payment
                          <Info size={16} className="text-blue-600" />
                        </h4>
                        <p className="text-sm text-blue-700 leading-relaxed">
                          Your payment of{" "}
                          <span className="font-bold text-blue-900">
                            {formData.paymentAmount} SOL
                          </span>{" "}
                          (≈ ₹
                          {(parseFloat(formData.paymentAmount) * 8000).toFixed(
                            2
                          )}
                          ) will be securely locked in an escrow smart contract.
                          The worker receives payment only after:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-blue-700">
                          <li className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-green-600" />
                            Job completion and proof submission
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-green-600" />
                            3-day dispute period expires with no issues
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      Review Job Details
                    </h3>

                    <div className="bg-gray-50 rounded-xl p-5 space-y-4 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            Title
                          </p>
                          <p className="font-semibold text-gray-900">
                            {formData.title}
                          </p>
                        </div>

                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            Category
                          </p>
                          <p className="font-semibold text-gray-900 capitalize">
                            {formData.category.replace("_", " ")}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Description
                        </p>
                        <p className="text-gray-900">{formData.description}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <p className="text-xs text-green-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <DollarSign size={14} />
                            Payment
                          </p>
                          <p className="font-bold text-green-700 text-lg">
                            {formData.paymentAmount} SOL
                          </p>
                          <p className="text-xs text-green-600">
                            ≈ ₹
                            {(
                              parseFloat(formData.paymentAmount) * 8000
                            ).toFixed(2)}
                          </p>
                        </div>

                        <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                          <p className="text-xs text-purple-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <Clock size={14} />
                            Duration
                          </p>
                          <p className="font-bold text-purple-700 text-lg">
                            {formData.durationHours} hours
                          </p>
                          <p className="text-xs text-purple-600">
                            ≈ {Math.ceil(parseInt(formData.durationHours) / 8)}{" "}
                            working days
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <MapPin size={14} />
                          Location
                        </p>
                        <p className="text-gray-900">
                          {formData.location.address}, {formData.location.city}
                          {formData.location.state &&
                            `, ${formData.location.state}`}
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <FileText size={14} />
                          Requirements
                        </p>
                        <p className="text-gray-900">{formData.requirements}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center py-12 space-y-6"
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Loader2 className="w-20 h-20 text-blue-600" />
                      </motion.div>
                      <div className="text-center space-y-3">
                        <h3 className="text-2xl font-bold text-gray-800">
                          Creating Job...
                        </h3>
                        <p className="text-gray-600 max-w-md">
                          Please approve the transaction in your wallet
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3 mt-4">
                          <Lock size={16} />
                          <span>
                            Locking {formData.paymentAmount} SOL in escrow
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 10,
                        }}
                      >
                        <CheckCircle className="w-20 h-20 text-green-600" />
                      </motion.div>
                      <div className="text-center space-y-3">
                        <h3 className="text-2xl font-bold text-gray-800">
                          Job Posted Successfully!
                        </h3>
                        <p className="text-gray-600 max-w-md">
                          Your job has been created on the blockchain and
                          payment is secured in escrow. Workers can now apply!
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3 mt-4">
                          <Lock size={16} />
                          <span>
                            {formData.paymentAmount} SOL locked in escrow
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
            {currentStep === 1 && (
              <>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next Step →
                </button>
              </>
            )}

            {currentStep === 2 && (
              <>
                <button
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Post Job & Lock Payment</span>
                </button>
              </>
            )}

            {currentStep === 3 && !isSubmitting && (
              <button
                onClick={handleClose}
                className="ml-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
              >
                Done ✓
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PostJobModal;
