import multer from "multer";
import { uploadProofPhoto } from "../services/s3UploadService.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

// Store file in memory (buffer) — we stream straight to S3, no disk write
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  },
});

/**
 * POST /v1/upload/proof-photo
 * Authenticated. Accepts multipart/form-data with:
 *   - file:       the photo (required)
 *   - jobId:      MongoDB job _id (required)
 *   - latitude:   GPS lat (optional string)
 *   - longitude:  GPS lng (optional string)
 *
 * Returns: { success, photoUrl, gpsCoordinates }
 */
export async function uploadProofPhotoHandler(req, res) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No photo file provided" });
    }

    const { jobId, latitude, longitude } = req.body;
    const walletAddress = req.user?.walletAddress || "unknown";

    if (!jobId) {
      return res
        .status(400)
        .json({ success: false, message: "jobId is required" });
    }

    const photoUrl = await uploadProofPhoto(
      req.file.buffer,
      req.file.mimetype,
      jobId,
      walletAddress
    );

    const gpsCoordinates =
      latitude && longitude ? `${latitude},${longitude}` : null;

    return res.status(200).json({
      success: true,
      photoUrl,
      gpsCoordinates,
    });
  } catch (err) {
    console.error("Proof photo upload error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to upload photo",
    });
  }
}
