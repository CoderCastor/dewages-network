import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// ── Nodemailer transporter ────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true,  // port 465 uses SSL directly (587 STARTTLS is blocked on Render)
  family: 4,     // force IPv4
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a 6-digit OTP to the given email address.
 * @param {string} email - Recipient email
 * @param {string} otp   - 6-digit OTP string
 */
export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"DeWages Network" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your Email Verification OTP — DeWages Network",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #4f46e5; margin: 0;">DeWages Network</h2>
          <p style="color: #6b7280; margin-top: 4px;">Email Verification</p>
        </div>

        <div style="background: #ffffff; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
          <p style="color: #374151; margin: 0 0 16px;">Hi there,</p>
          <p style="color: #374151; margin: 0 0 24px;">
            Use the OTP below to verify your email address. It is valid for <strong>10 minutes</strong>.
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <span style="
              display: inline-block;
              font-size: 36px;
              font-weight: 700;
              letter-spacing: 12px;
              color: #4f46e5;
              background: #eef2ff;
              padding: 16px 28px;
              border-radius: 8px;
              border: 2px dashed #a5b4fc;
            ">${otp}</span>
          </div>

          <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
            If you did not request this, please ignore this email.
          </p>
        </div>

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          © ${new Date().getFullYear()} DeWages Network. All rights reserved.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
