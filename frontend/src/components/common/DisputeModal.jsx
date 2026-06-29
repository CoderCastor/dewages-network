import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Send, Loader2, X, Shield } from "lucide-react";
import axios from "axios";
import { BACKEND_URL, RPC_URL, PROGRAM_ID } from "../../env-variables";
import toast from "react-hot-toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import idl from "@/idl/employment_platform.json" with { type: "json" };
import { useTranslation } from "react-i18next";

/**
 * DisputeModal
 * Props:
 *  - isOpen: bool
 *  - onClose: fn
 *  - job: job object
 *  - raisedBy: "company" | "worker"
 *  - onDisputeRaised: fn(updatedJob) — callback after success
 */
const DisputeModal = ({ isOpen, onClose, job, raisedBy, onDisputeRaised }) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      toast.error("Please describe the dispute reason (min 10 characters)");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Raising dispute...");

    try {
      let disputePDA = null;
      let txSignature = null;

      // Company must sign on-chain (contract requires employer signer)
      if (raisedBy === "company") {
        if (!wallet.publicKey || !wallet.signTransaction) {
          toast.error("Please connect your wallet", { id: toastId });
          setIsSubmitting(false);
          return;
        }

        toast.loading("Please sign the blockchain transaction...", { id: toastId });

        try {
          const connection = new Connection(RPC_URL, "confirmed");
          const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
          const program = new Program(idl, PROGRAM_ID, provider);

          const jobPDA = new PublicKey(job.jobPDA);
          const disputeKeypair = Keypair.generate();
          disputePDA = disputeKeypair.publicKey.toString();

          txSignature = await program.methods
            .createDispute(reason.trim(), reason.trim())
            .accounts({
              job: jobPDA,
              dispute: disputeKeypair.publicKey,
              employer: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([disputeKeypair])
            .rpc();

          toast.loading("Confirming transaction...", { id: toastId });
          await connection.confirmTransaction(txSignature, "confirmed");
        } catch (blockchainError) {
          console.error("Blockchain error:", blockchainError);
          toast.error("Blockchain transaction failed: " + (blockchainError.message || "Unknown error"), { id: toastId });
          setIsSubmitting(false);
          return;
        }
      }

      // Update DB
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${BACKEND_URL}/job/dispute/raise`,
        {
          jobId: job._id,
          reason: reason.trim(),
          raisedBy,
          disputePDA,
          txSignature,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Dispute raised. Funds are frozen in escrow until resolved by admin.", { id: toastId });
        setReason("");
        onClose();
        if (onDisputeRaised) onDisputeRaised(response.data.dispute);
      } else {
        toast.error(response.data.message || "Failed to raise dispute", { id: toastId });
      }
    } catch (error) {
      console.error("Error raising dispute:", error);
      toast.error(error.response?.data?.message || "Failed to raise dispute", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={() => !isSubmitting && onClose()}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 30 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-red-600 to-red-800 px-6 py-7 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white opacity-10 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white opacity-10 rounded-full" />
          <button
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            className="absolute top-4 right-4 p-1.5 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="relative flex flex-col items-center">
            <div className="w-14 h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-1">{t("dispute.raiseTitle")}</h2>
            <p className="text-red-100 text-sm text-center">
              {t("dispute.fundsNote")}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Info box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start space-x-3">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">{t("dispute.whatHappens")}</p>
              <ul className="space-y-1 text-xs">
                <li>• {t("dispute.point1")}</li>
                <li>• {t("dispute.point2")}</li>
                <li>• {t("dispute.point3")}</li>
              </ul>
            </div>
          </div>

          {/* Job info */}
          <div className="bg-gray-50 rounded-xl p-3 mb-5">
            <p className="text-xs text-gray-500 mb-1">{t("common.job")}</p>
            <p className="font-semibold text-gray-800 text-sm">{job.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {raisedBy === "company" ? `${t("common.worker")}: ${job.workerName || job.assignedWorker?.slice(0, 8)}...` : `${t("common.company")}: ${job.companyName}`}
            </p>
          </div>

          {/* Reason */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t("dispute.reasonLabel")} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("dispute.reasonPlaceholder")}
              disabled={isSubmitting}
              maxLength={500}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all resize-none disabled:bg-gray-50 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/500</p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
              className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || reason.trim().length < 10}
              className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("dispute.raising")}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t("job.raiseDispute")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default DisputeModal;
