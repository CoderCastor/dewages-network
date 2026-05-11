import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Shield, Wallet, LogIn, CheckCircle, AlertCircle, Loader2, Copy } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { BACKEND_URL } from "@/env-variables";

const ADMIN_WALLET = "5h54tPqd4ZbjTLF74SKVTCKmzRrnhP9tFqPcrHjxcfhQ";

export default function AdminLogin() {
  const navigate  = useNavigate();
  const { publicKey, signMessage, connected, connecting } = useWallet();

  const [step,    setStep]    = useState("connect");  // "connect" | "sign" | "done"
  const [loading, setLoading] = useState(false);
  const [nonce,   setNonce]   = useState(null);

  const walletStr = publicKey?.toString();
  const isAdmin   = walletStr === ADMIN_WALLET;

  // Auto-advance step once wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      if (!isAdmin) {
        toast.error("This wallet is not authorized as admin.");
        setStep("connect");
      } else {
        setStep("sign");
      }
    } else {
      setStep("connect");
    }
  }, [connected, publicKey]);

  // Already logged in?
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) navigate("/admin/dashboard");
  }, []);

  const handleSignIn = async () => {
    if (!connected || !publicKey || !signMessage) {
      toast.error("Please connect your wallet first");
      return;
    }
    if (!isAdmin) {
      toast.error("Unauthorized wallet");
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch nonce
      const nonceRes = await fetch(`${BACKEND_URL}/admin/nonce`);
      const nonceData = await nonceRes.json();
      if (!nonceData.success) throw new Error("Failed to get nonce");
      const currentNonce = nonceData.nonce;
      setNonce(currentNonce);

      // 2. Sign nonce with wallet
      const messageBytes = new TextEncoder().encode(currentNonce);
      let signature;
      try {
        signature = await signMessage(messageBytes);
      } catch (signErr) {
        toast.error("Signing cancelled or failed");
        setLoading(false);
        return;
      }

      // 3. Send walletAddress + signature to backend
      const loginRes = await fetch(`${BACKEND_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: walletStr,
          signature: Array.from(signature),
        }),
      });
      const loginData = await loginRes.json();

      if (loginData.success && loginData.token) {
        localStorage.setItem("adminToken", loginData.token);
        localStorage.setItem("adminInfo", JSON.stringify({ walletAddress: walletStr, username: "Admin" }));
        setStep("done");
        toast.success("Welcome, Admin!");
        setTimeout(() => navigate("/admin/dashboard"), 800);
      } else {
        toast.error(loginData.message || "Login failed");
      }
    } catch (err) {
      console.error("[AdminLogin]", err);
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const shortKey = walletStr
    ? `${walletStr.slice(0, 6)}…${walletStr.slice(-6)}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated blobs */}
      <motion.div
        className="absolute -top-1/2 -left-1/2 w-full h-full bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        animate={{ x: [0, -100, 0], y: [0, -50, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full mb-4"
            >
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
            <p className="text-purple-200 text-sm">Sign in with your admin wallet</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[
              { id: "connect", label: "Connect" },
              { id: "sign",    label: "Verify"  },
              { id: "done",    label: "Done"    },
            ].map((s, i, arr) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex items-center gap-1.5 flex-1 ${i === 0 ? "" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.id
                      ? "bg-purple-500 text-white ring-2 ring-purple-300"
                      : (["sign","done"].includes(step) && i === 0) || (step === "done" && i === 1)
                        ? "bg-green-500 text-white"
                        : "bg-white/20 text-white/60"
                  }`}>
                    {(["sign","done"].includes(step) && i === 0) || (step === "done" && i === 1)
                      ? <CheckCircle className="w-4 h-4" />
                      : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${step === s.id ? "text-white" : "text-white/50"}`}>{s.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className={`h-px flex-1 mx-2 transition-all ${
                    (step === "sign" && i === 0) || step === "done" ? "bg-green-400" : "bg-white/20"
                  }`} />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: Connect wallet */}
            {step === "connect" && (
              <motion.div key="connect" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p className="text-purple-100 text-sm text-center mb-5">
                  Connect the admin wallet to proceed
                </p>

                {/* Admin wallet hint */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5">
                  <p className="text-xs text-purple-300 font-medium mb-2 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> Required admin wallet
                  </p>
                  <code className="text-xs text-white/80 font-mono break-all">{ADMIN_WALLET}</code>
                </div>

                <div className="flex justify-center">
                  <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-indigo-600 !rounded-xl !font-semibold !text-sm !py-3 !px-6 hover:!from-purple-600 hover:!to-indigo-700 !transition-all !shadow-lg" />
                </div>

                {connecting && (
                  <p className="text-center text-purple-300 text-sm mt-4 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Connecting…
                  </p>
                )}
              </motion.div>
            )}

            {/* STEP 2: Sign */}
            {step === "sign" && (
              <motion.div key="sign" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* Connected wallet badge */}
                <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-4 mb-5 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-green-300 font-medium">Wallet connected</p>
                    <p className="text-white text-sm font-mono truncate">{shortKey}</p>
                  </div>
                </div>

                <p className="text-purple-100 text-sm text-center mb-5">
                  Sign a message to verify you control this wallet. No transaction fee.
                </p>

                <motion.button
                  onClick={handleSignIn}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Signing…</>
                  ) : (
                    <><LogIn className="w-5 h-5" /> Sign & Login</>
                  )}
                </motion.button>

                <button
                  onClick={() => setStep("connect")}
                  className="w-full mt-3 text-purple-300 hover:text-white text-sm text-center transition-colors"
                >
                  ← Use a different wallet
                </button>
              </motion.div>
            )}

            {/* STEP 3: Done */}
            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </motion.div>
                <p className="text-white text-lg font-bold">Authenticated!</p>
                <p className="text-purple-200 text-sm mt-1">Redirecting to dashboard…</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wrong wallet warning */}
          {connected && !isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-red-500/20 border border-red-400/30 rounded-xl p-4 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-sm font-semibold">Wrong wallet connected</p>
                <p className="text-red-200/70 text-xs mt-0.5">
                  Connected: <span className="font-mono">{shortKey}</span><br />
                  Please connect the admin wallet.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-center text-purple-300/60 text-xs mt-6"
        >
          Secure admin access · Wallet authentication only
        </motion.p>
      </motion.div>
    </div>
  );
}
