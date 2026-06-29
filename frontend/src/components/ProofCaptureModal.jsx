import { useState, useRef, useEffect } from "react";
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
  PlayCircle,
} from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "@/env-variables";
import { useTranslation } from "react-i18next";

/**
 * ProofCaptureModal
 *
 * mode="before"  (Start OTP)
 *   Step 1 — Take "before" photo (camera → S3)
 *   Step 2 — Confirm GPS
 *   Step 3 — Enter START OTP → fires onComplete({photoUrl, gpsCoordinates, otp})
 *             Parent calls /job/verify-otp (start)
 *
 * mode="after"  (End OTP, default)
 *   Step 1 — Take "after" photo
 *   Step 2 — Confirm GPS
 *   Step 3 — Enter END OTP → fires onComplete({photoUrl, gpsCoordinates, otp})
 *             Parent triggers blockchain submitProofOfWork
 */
export default function ProofCaptureModal({
  isOpen,
  onClose,
  otpValue,
  jobId,
  jobTitle,
  mode = "after",
  onComplete,
}) {
  const { t } = useTranslation();
  const isBefore = mode === "before";

  const [step, setStep] = useState(1);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [otp, setOtp] = useState(otpValue || "");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setPhotoPreview(null);
    setPhotoUrl(null);
    setGpsCoordinates(null);
    setGpsError(null);
    setOtp(otpValue || "");
    setSubmitting(false);
  }, [isOpen]);

  const fetchGPS = () => {
    // Mobile browsers (Chrome/Safari) block geolocation on HTTP (non-localhost).
    const isSecure = window.location.protocol === "https:" || window.location.hostname === "localhost";
    if (!isSecure) {
      setGpsError("Location requires HTTPS. Connect your phone via the HTTPS URL or use a desktop browser.");
      return;
    }
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported by this browser.");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);

    const onSuccess = (pos) => {
      const coords = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
      setGpsCoordinates(coords);
      setGpsLoading(false);
    };

    const onError = (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        setGpsError("Location permission denied. Please allow location access in your browser/phone settings.");
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        // On mobile, try again with lower accuracy as fallback
        navigator.geolocation.getCurrentPosition(onSuccess, () => {
          setGpsError("Location unavailable. Make sure GPS is enabled on your device.");
          setGpsLoading(false);
        }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 });
        return;
      } else {
        setGpsError("Location timed out. Try moving to an open area and tap Retry.");
      }
      setGpsLoading(false);
    };

    // First attempt: high accuracy (good for outdoor/mobile GPS)
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 15000,   // 15s — mobile GPS locks can be slow indoors
      maximumAge: 0,
    });
  };

  const handleOpenCamera = () => {
    fetchGPS();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    await uploadPhotoToS3(file);
  };

  const uploadPhotoToS3 = async (file) => {
    setUploadingPhoto(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobId", jobId);
      formData.append("photoType", isBefore ? "before" : "after");
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
      } else {
        throw new Error(res.data.message || "Upload failed");
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      setPhotoUrl(null);
    } finally {
      setUploadingPhoto(false);
      setStep(2);
    }
  };

  const handleRetakePhoto = () => {
    setPhotoPreview(null);
    setPhotoUrl(null);
    setStep(1);
    fileInputRef.current?.click();
  };

  const handleFinish = () => {
    if (submitting) return;
    setSubmitting(true);
    onComplete({ photoUrl, gpsCoordinates, otp });
  };

  if (!isOpen) return null;

  const headerGrad = isBefore ? "from-green-600 to-emerald-600" : "from-blue-600 to-indigo-600";
  const btnColor = isBefore ? "bg-green-600 hover:bg-green-700" : "bg-indigo-600 hover:bg-indigo-700";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4"
        style={{ zIndex: 9999 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${headerGrad} px-6 py-4`}>
            <h3 className="text-white font-bold text-lg">
              {isBefore ? t("proof.beforeTitle") : t("proof.afterTitle")}
            </h3>
            <p className="text-white/80 text-xs mt-0.5">{jobTitle}</p>
            <div className="flex items-center gap-2 mt-3">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                    s <= step ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-white/70 text-xs">{t("proof.stepPhoto")}</span>
              <span className="text-white/70 text-xs">{t("common.location")}</span>
              <span className="text-white/70 text-xs">{isBefore ? t("proof.stepStartOtp") : t("proof.stepEndOtp")}</span>
            </div>
          </div>

          <div className="p-6">
            {/* STEP 1: Take Photo */}
            {step === 1 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-gray-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  {isBefore ? t("proof.takeBeforePhoto") : t("proof.takeAfterPhoto")}
                </h4>
                <p className="text-gray-500 text-sm mb-6">
                  {isBefore ? t("proof.beforePhotoDesc") : t("proof.afterPhotoDesc")}
                </p>

                {uploadingPhoto ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-sm text-gray-500">{t("proof.uploadingPhoto")}</p>
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
                      onClick={handleOpenCamera}
                      className={`w-full py-3 ${btnColor} text-white rounded-xl font-semibold active:scale-95 transition-all flex items-center justify-center gap-2`}
                    >
                      <Camera className="w-5 h-5" />
                      {t("proof.openCamera")}
                    </button>
                    <p className="text-xs text-gray-400 mt-3">
                      {t("proof.cameraGpsNote")}
                      {gpsLoading && " …"}
                      {gpsCoordinates && " ✓"}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* STEP 2: Confirm GPS + Photo Preview */}
            {step === 2 && (
              <div>
                {photoPreview && (
                  <div className="relative mb-4 rounded-xl overflow-hidden">
                    <img src={photoPreview} alt="Proof" className="w-full h-44 object-cover" />
                    {photoUrl ? (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Saved
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Local only
                      </div>
                    )}
                    {isBefore && (
                      <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                        BEFORE
                      </div>
                    )}
                    {!isBefore && (
                      <div className="absolute bottom-2 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                        AFTER
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin
                      className={`w-5 h-5 flex-shrink-0 ${
                        gpsCoordinates ? "text-green-600" : gpsError ? "text-red-500" : "text-blue-500 animate-pulse"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700">
                        {gpsCoordinates ? t("proof.locationCaptured") : gpsError ? t("proof.locationUnavailable") : t("proof.gettingLocation")}
                      </p>
                      {gpsCoordinates && <p className="text-xs text-gray-500 truncate font-mono">{gpsCoordinates}</p>}
                      {gpsError && <p className="text-xs text-red-500">{gpsError}</p>}
                    </div>
                    {(gpsError || !gpsCoordinates) && !gpsLoading && (
                      <button onClick={fetchGPS} className="text-blue-600 hover:text-blue-800 p-1">
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
                    <RefreshCw className="w-4 h-4" /> {t("proof.retake")}
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className={`flex-1 py-2.5 ${btnColor} text-white rounded-xl text-sm font-semibold transition-colors`}
                  >
                    {t("proof.continue")}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: OTP Entry */}
            {step === 3 && (
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  {isBefore ? (
                    <PlayCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <KeyRound className="w-8 h-8 text-indigo-600" />
                  )}
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  {isBefore ? t("proof.enterStartOtp") : t("proof.enterEndOtp")}
                </h4>
                <p className="text-gray-500 text-sm mb-4">
                  {isBefore ? t("proof.askStartOtp") : t("proof.askEndOtp")}
                </p>

                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={6}
                />

                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-left">
                  <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {isBefore ? t("proof.beforeEvidence") : t("proof.afterEvidence")}
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      {isBefore ? t("proof.beforePhotoLabel") : t("proof.afterPhotoLabel")} {photoUrl ? t("proof.uploadedToCloud") : t("proof.capturedLocally")}
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${gpsCoordinates ? "text-green-700" : "text-gray-500"}`}>
                      {gpsCoordinates ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                      {gpsCoordinates ? t("proof.gpsRecorded") : t("proof.gpsNotAvailable")}
                    </div>
                    {!isBefore && (
                      <div className="flex items-center gap-2 text-xs text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        {t("proof.timestampOnChain")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    {t("common.back")}
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={otp.length !== 6 || submitting}
                    className={`flex-1 py-2.5 ${btnColor} text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> {t("common.loading")}</>
                    ) : isBefore ? (
                      <><PlayCircle className="w-4 h-4" /> {t("proof.startJob")}</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4" /> {t("proof.submitProof")}</>
                    )}
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
