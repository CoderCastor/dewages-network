import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import {
  Wallet,
  Shield,
  CheckCircle,
  AlertCircle,
  Building,
  ArrowRight,
  CircleOff,
  Loader2,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletInformation } from "@/context/WalletContext";
import axios from "axios";
import { BACKEND_URL } from "@/env-variables";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

const CompanySigninPage = () => {
  const navigate = useNavigate();
  const { setVisible } = useWalletModal();
  const { publicKey, disconnect, connected, signMessage } = useWallet();
  const { setWalletAddress, setIsWalletVerified } = useWalletInformation();
  const { t } = useTranslation();

  const [isVerified, setIsVerified] = useState("not-verified");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [pubkey, setPubkey] = useState("");

  useEffect(() => {
    if (connected && publicKey) {
      const key = publicKey.toBase58();
      setPubkey(key);
      setWalletAddress(key);
      setIsVerified("not-verified");
    } else {
      setPubkey("");
      setWalletAddress("");
      setIsVerified("not-verified");
    }
  }, [connected, publicKey, setWalletAddress]);

  const handleConnectWallet = () => {
    if (connected && publicKey) {
      toast.success("Wallet already connected");
    } else {
      setVisible(true);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setPubkey("");
    setWalletAddress("");
    setIsWalletVerified(false);
    setIsVerified("not-verified");
    toast.success("Wallet disconnected");
  };

  const handleSignIn = async () => {
    if (!pubkey) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsSigningIn(true);
    setIsVerified("not-verified");

    try {
      // Sign message
      const message = new TextEncoder().encode("Signin into Dewages Network");
      const signature = await signMessage?.(message);

      if (!signature) {
        throw new Error("Failed to sign message");
      }

      // Send to backend
      const response = await axios.post(`${BACKEND_URL}/auth/company/signin`, {
        signature: { data: Array.from(signature) },
        publicKey: publicKey.toString(),
      });

      if (response.data.success) {
        // Store token and user info
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userType", "company");
        localStorage.setItem("userId", response.data.user.id);

        setIsWalletVerified(true);
        setIsVerified("verified");

        toast.success("Successfully signed in!");

        // Redirect to company dashboard
        setTimeout(() => {
          navigate("/company/dashboard");
        }, 1000);
        
      } else {
        toast.error(response.data.message || "Sign in failed");
        setIsVerified("failed");
      }
    } catch (error) {
      console.error("Sign in error:", error);

      if (error.response?.status === 404) {
        toast.error("Account not found. Please sign up first.");
      } else if (error.response?.status === 401) {
        toast.error("Invalid signature. Please try again.");
      } else if (error.response?.status === 403) {
        toast.error(
          error.response.data.message ||
            "Account inactive. Contact support."
        );
      } else {
        toast.error("Failed to sign in. Please try again.");
      }

      setIsVerified("failed");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Building className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {t("signin.companyTitle")}
          </h1>
          <p className="text-gray-600">
            {t("signin.companySubtitle")}
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <div className="space-y-6">
            {/* Wallet Address Display */}
            {pubkey && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {t("signin.walletConnected")}
                      </p>
                      <p className="text-xs text-gray-600 font-mono">
                        {pubkey.slice(0, 4)}...{pubkey.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="p-2 hover:bg-red-100 rounded-full transition-colors"
                  >
                    <CircleOff className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Connect Wallet Button */}
            {!pubkey ? (
              <div className="flex justify-center">
                <WalletMultiButton className="!w-full !flex !items-center !justify-center !space-x-3 !px-6 !py-4 !rounded-lg !font-medium !transition-all !duration-200 !bg-blue-600 hover:!bg-blue-700 !text-white hover:!shadow-lg !text-base !h-auto" />
              </div>
            ) : (
              <button
                disabled
                className="w-full flex items-center justify-center space-x-3 px-6 py-4 rounded-lg font-medium bg-green-500 text-white cursor-not-allowed"
              >
                <Wallet className="w-5 h-5" />
                <span>{t("signin.walletConnected")}</span>
              </button>
            )}

            {/* Sign In Button */}
            <button
              onClick={handleSignIn}
              disabled={
                isVerified === "verified" || isSigningIn || !pubkey
              }
              className={`w-full flex items-center justify-center space-x-3 px-6 py-4 rounded-lg font-medium transition-all duration-200 ${
                !pubkey
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : isVerified === "not-verified" && !isSigningIn
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : isVerified === "verified"
                  ? "bg-green-500 text-white cursor-not-allowed"
                  : isVerified === "failed"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-blue-400 text-white cursor-wait"
              }`}
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t("signin.signingIn")}</span>
                </>
              ) : isVerified === "verified" ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>{t("signin.signedInSuccess")}</span>
                </>
              ) : isVerified === "failed" ? (
                <>
                  <AlertCircle className="w-5 h-5" />
                  <span>{t("signin.signInFailed")}</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>{t("signin.signInWithWallet")}</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {t("signin.dontHaveAccount")}
                </span>
              </div>
            </div>

            {/* Sign Up Link */}
            <button
              onClick={() => navigate("/company/signup")}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-all duration-200"
            >
              <span>{t("signin.signUpAsCompany")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Info Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-start space-x-3 text-sm text-gray-600">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p>
                {t("signin.walletSecurityNote")}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-center space-y-2"
        >
          <button
            onClick={() => navigate("/worker/signin")}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {t("signin.signInAsWorker")}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default CompanySigninPage;