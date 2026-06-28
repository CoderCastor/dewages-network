import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  MapPin,
  KeyRound,
  CheckCircle2,
  Loader2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "@/env-variables";

/**
 * ProofCaptureModal
 * Three-step evidence capture before the blockchain submission:
 *   Step 1 — Take a photo  (browser camera → S3 upload)
 *   Step 2 — GPS location  (captured silently in background during step 1)
 *   Step 3 — Enter OTP     (existing flow)
 *
 * Props:
 *   isOpen       {boolean}
 *   onClose      {() => void}
 *   otpValue     {string}       — the OTP the worker entered
 *   jobId        {string}       — MongoDB job _id
 *   jobTitle     {string}
 *   onComplete   {({photoUrl, gpsCoordinates, otp}) => void}  — fires when all 3 done
 */
export default function ProofCaptureModal({
  isOpen,
  onClose,
  otpValue,
  jobId,
  jobTitle,
  onComplete,
}) {
  const [step, setStep] = useState(1); // 1=photo, 2=gps-confirm, 3=otp
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);         // S3 URL after upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState(null); // "lat,lng"
  const [gpsError, setGpsError] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [otp, setOtp] = useState(otpValue || "");
  const fileInputRef = useRef(null);

  // ── GPS: start fetching as soon as modal opens ────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setPhotoBlob(null);
    setPhotoPreview(null);
    setPhotoUrl(null);
    setGpsCoordinates(null);
    setGpsError(null);
    setOtp(otpValue || "");
    fetchGPS();
  }, [isOpen]);

  const fetchGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported by this browser.");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
        setGpsCoordinates(coords);
        setGpsLoading(false);
      },
      (err) => {
        setGpsError("Could not get location. Please enable location access.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── Photo: file input change handler ─────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    setPhotoBlob(file);

    // Upload to S3 via backend
    await uploadPhotoToS3(file);
  };

  const uploadPhotoToS3 = async (file) => {
    setUploadingPhoto(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobId", jobId);
      if (gpsCoordinates) {
        const [lat, lng] = gpsCoordinates.split(",");
        formData.append("latitude", lat);
        formData.append("longitude", lng);
      }

      const res = await axios.post(`${BACKEND_URL}/upload/proof-photo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        setPhotoUrl(res.data.photoUrl);
        // Move to GPS confirmation step after upload
        setStep(2);
      } else {
        throw new Error(res.data.message || "Upload failed");
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      // Don't block the flow — let user retry or continue without S3 URL
      setPhotoUrl(null);
      setStep(2);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRetakePhoto = () => {
    setPhotoBlob(null);
    setPhotoPreview(null);
    setPhotoUrl(null);
    setStep(1);
    fileInputRef.current?.click();
  };

  const handleFinish = () => {
    onComplete({
      photoUrl,
      gpsCoordinates,
      otp,
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4"
        style={{ zIndex: 9999 }}
        onClick={() => onClose()}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Submit Proof of Work</h3>
            <p className="text-blue-100 text-xs mt-0.5">{jobTitle}</p>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-3">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                    s <= step ? "bg-white" : "bg-blue-400 bg-opacity-40"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-blue-100 text-xs">Photo</span>
              <span className="text-blue-100 text-xs">Location</span>
              <span className="text-blue-100 text-xs">OTP</span>
            </div>
          </div>

          <div className="p-6">
            {/* ── STEP 1: Take Photo ───────────────────────────────────── */}
            {step === 1 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Take a Photo at the Worksite
                </h4>
                <p className="text-gray-500 text-sm mb-6">
                  This photo will be saved as tamper-proof evidence. Take it at
                  the job location.
                </p>

                {uploadingPhoto ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-sm text-gray-500">Uploading photo…</p>
                  </div>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Open Camera
                    </button>
                    <p className="text-xs text-gray-400 mt-3">
                      GPS location is being captured in the background
                      {gpsLoading && " …"}
                      {gpsCoordinates && " ✓"}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* ── STEP 2: Confirm GPS + Photo Preview ─────────────────── */}
            {step === 2 && (
              <div>
                {/* Photo preview */}
                {photoPreview && (
                  <div className="relative mb-4 rounded-xl overflow-hidden">
                    <img
                      src={photoPreview}
                      alt="Proof photo"
                      className="w-full h-44 object-cover"
                    />
                    {photoUrl ? (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Saved
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Local only
                      </div>
                    )}
                  </div>
                )}

                {/* GPS status */}
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin
                      className={`w-5 h-5 flex-shrink-0 ${
                        gpsCoordinates
                          ? "text-green-600"
                          : gpsError
                          ? "text-red-500"
                          : "text-blue-500 animate-pulse"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700">
                        {gpsCoordinates
                          ? "Location Captured"
                          : gpsError
                          ? "Location Unavailable"
                          : "Getting Location…"}
                      </p>
                      {gpsCoordinates && (
                        <p className="text-xs text-gray-500 truncate font-mono">
                          {gpsCoordinates}
                        </p>
                      )}
                      {gpsError && (
                        <p className="text-xs text-red-500">{gpsError}</p>
                      )}
                    </div>
                    {(gpsError || !gpsCoordinates) && !gpsLoading && (
                      <button
                        onClick={fetchGPS}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleRetakePhoto}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" /> Retake
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Enter OTP + Final Submit ────────────────────── */}
            {step === 3 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-indigo-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Enter End OTP</h4>
                <p className="text-gray-500 text-sm mb-4">
                  Ask the employer for the end OTP to confirm job completion.
                </p>

                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={8}
                />

                {/* Evidence summary */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-left">
                  <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Evidence Bundle
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      Photo {photoUrl ? "uploaded to cloud" : "captured locally"}
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${gpsCoordinates ? "text-green-700" : "text-gray-500"}`}>
                      {gpsCoordinates ? (
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      )}
                      GPS {gpsCoordinates ? "recorded" : "not available"}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      Timestamp recorded on Solana blockchain
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={!otp.trim()}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Submit Proof
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
