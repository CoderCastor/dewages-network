import { sendOTPEmail } from "../services/emailService.js";

// ── In-memory OTP store: email → { otp, expiresAt } ─────────────────────────
// NOTE: For a production multi-instance setup, replace with Redis.
const otpStore = new Map();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Generate a random 6-digit OTP string */
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ── POST /send-otp ────────────────────────────────────────────────────────────
export const sendOTP = async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  const otp = generateOTP();
  otpStore.set(email.toLowerCase(), {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  try {
    await sendOTPEmail(email, otp);
    return res.status(200).json({
      success: true,
      message: "OTP sent to your email. Valid for 10 minutes.",
    });
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    // Remove the stored OTP so user can retry
    otpStore.delete(email.toLowerCase());
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please check your email address and try again.",
    });
  }
};

// ── POST /verify-otp ──────────────────────────────────────────────────────────
export const verifyOTP = (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required" });
  }

  const record = otpStore.get(email.toLowerCase());

  if (!record) {
    return res.status(400).json({
      success: false,
      message: "No OTP found for this email. Please request a new one.",
    });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({
      success: false,
      message: "OTP has expired. Please request a new one.",
    });
  }

  if (record.otp !== otp.toString().trim()) {
    return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
  }

  // ✅ Correct OTP — clear from store
  otpStore.delete(email.toLowerCase());

  return res.status(200).json({ success: true, message: "Email verified successfully!" });
};
