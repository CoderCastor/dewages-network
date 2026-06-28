import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Key, Loader2, Copy } from "lucide-react";
import axios from "axios";
import { BACKEND_URL, RPC_URL, PROGRAM_ID } from "../../env-variables";
import toast from "react-hot-toast";
import RatingModal from "./RatingModal";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import IDL from "../../idl/employment_platform.json" with { type: "json" };

const CompanyOTPGenerator = ({ job, onOTPGenerated }) => {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ratingDone, setRatingDone] = useState(!!job.workerRating);
  const [localOTP, setLocalOTP] = useState(null);
  const { connection } = useConnection();
  const wallet = useWallet();

  // Stop click from bubbling to parent card (which opens job details modal)
  const stopProp = (e) => e.stopPropagation();

  const handleGenerateClick = (e) => {
    e.stopPropagation();
    if (ratingDone || job.workerRating) {
      generateOTP();
    } else {
      setShowRatingModal(true);
    }
  };

  const handleRatingSubmit = async (rating, review) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error("Please connect your wallet");
      return;
    }

    const loadingToast = toast.loading("Preparing rating transaction...");
    try {
      const provider = new AnchorProvider(
        connection,
        wallet,
        AnchorProvider.defaultOptions()
      );
      const program = new Program(IDL, PROGRAM_ID, provider);

      const userRatingKeypair = Keypair.generate();
      const jobPDA = new PublicKey(job.jobPDA);
      const workerPublicKey = new PublicKey(job.assignedWorker);
      
      const [workerProfilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_profile"), workerPublicKey.toBuffer()],
        program.programId
      );

      toast.loading("Please sign the rating transaction...", { id: loadingToast });

      const tx = await program.methods
        .rateUser(rating, review || "")
        .accounts({
          userRating: userRatingKeypair.publicKey,
          job: jobPDA,
          targetProfile: workerProfilePDA,
          targetUser: workerPublicKey,
          rater: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      // Safe multi-signature flow
      const walletSignedTx = await wallet.signTransaction(tx);
      walletSignedTx.partialSign(userRatingKeypair);
      
      toast.loading("Sending transaction...", { id: loadingToast });
      const txSignature = await connection.sendRawTransaction(walletSignedTx.serialize());
      
      toast.loading("Confirming transaction...", { id: loadingToast });
      await connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, "confirmed");

      toast.loading("Saving rating...", { id: loadingToast });
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BACKEND_URL}/job/rating/company`,
        { jobId: job._id, rating, review, txSignature },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to submit rating");
      }

      toast.success("Rating submitted!", { id: loadingToast });
      setRatingDone(true);
      setShowRatingModal(false);
      await generateOTP();
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error(error.message || "Failed to submit rating", { id: loadingToast });
    }
  };

  const generateOTP = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BACKEND_URL}/job/generate-otp`,
        { jobId: job._id, otpType: "end" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("End Job OTP generated!");
        setLocalOTP(response.data.otp?.code || null);
        if (onOTPGenerated) onOTPGenerated(response.data.otp);
      } else {
        toast.error(response.data.message || "Failed to generate OTP");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate OTP");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyOTP = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    toast.success("OTP copied to clipboard!");
  };

  if (job.status !== "in_progress" || !job.assignedWorker) return null;

  // Show OTP (either freshly generated local state OR from job data)
  const displayOTP = localOTP || job.endJobOTP?.code;
  const otpUsed = job.endJobOTP?.isUsed;

  if (displayOTP && !otpUsed) {
    return (
      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4" onClick={stopProp}>
        <p className="text-sm font-medium text-orange-700 mb-2">End Job OTP</p>
        <div className="flex items-center justify-between">
          <p className="text-3xl font-bold text-orange-900 tracking-wider font-mono">
            {displayOTP}
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => copyOTP(e, displayOTP)}
              className="p-2 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors"
              title="Copy OTP"
            >
              <Copy className="w-5 h-5 text-orange-600" />
            </button>
            <Key className="w-6 h-6 text-orange-400" />
          </div>
        </div>
        <p className="text-xs text-orange-600 mt-2">Share this OTP with the worker to complete the job</p>
      </div>
    );
  }

  if (otpUsed) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4" onClick={stopProp}>
        <p className="text-sm font-medium text-green-700">✓ End OTP has been used — Job completed</p>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleGenerateClick}
        disabled={isGenerating}
        className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating OTP...</span>
          </>
        ) : (
          <>
            <Key className="w-5 h-5" />
            <span>
              {ratingDone || job.workerRating
                ? "Generate End Job OTP"
                : "Rate Worker & Get End OTP"}
            </span>
          </>
        )}
      </button>

      {/* Portal: renders directly into document.body, escaping any CSS transform stacking context */}
      {showRatingModal &&
        createPortal(
          <RatingModal
            isOpen={showRatingModal}
            onClose={() => {}}
            onSubmit={handleRatingSubmit}
            targetName={job.workerName || "the Worker"}
            targetType="worker"
          />,
          document.body
        )}
    </>
  );
};

export default CompanyOTPGenerator;
