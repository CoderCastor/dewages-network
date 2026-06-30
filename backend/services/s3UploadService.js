import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME;
const BUCKET_URL =
  process.env.S3_BUCKET_URL ||
  `https://${BUCKET}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com`;

/**
 * Upload a proof photo buffer to S3.
 * Returns the public URL of the uploaded file.
 * @param {Buffer} fileBuffer   - Raw file buffer from multer
 * @param {string} mimeType     - e.g. "image/jpeg"
 * @param {string} jobId        - Used to namespace the S3 key
 * @param {string} walletAddress
 */
/**
 * Upload a company verification document to S3.
 * Returns the public URL of the uploaded file.
 */
export async function uploadWorkerAvatar(fileBuffer, mimeType, walletAddress) {
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || "ap-south-1";
  const baseUrl = (process.env.S3_BUCKET_URL || `https://${bucket}.s3.${region}.amazonaws.com`).replace(/\/$/, "");
  const ext = mimeType?.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const key = `worker-avatars/${walletAddress}.${ext}`;
  await s3.send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: fileBuffer,
    ContentType: mimeType || "image/jpeg", ACL: "public-read",
  }));
  return `${baseUrl}/${key}?t=${Date.now()}`;
}

export async function uploadCompanyDocument(fileBuffer, mimeType, walletAddress, originalName) {
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || "ap-south-1";
  const baseUrl = process.env.S3_BUCKET_URL || `https://${bucket}.s3.${region}.amazonaws.com`;

  const ext = originalName?.split(".").pop()?.toLowerCase() || "pdf";
  const key = `company-documents/${walletAddress}/${uuidv4()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType || "application/octet-stream",
      ACL: "public-read",
    })
  );

  return `${baseUrl}/${key}`;
}

export async function uploadProofPhoto(fileBuffer, mimeType, jobId, walletAddress) {
  // Mobile cameras sometimes send generic mimetypes (application/octet-stream, image/heic).
  // Normalize to image/jpeg so browsers can render the stored photo.
  const normalizedMime = mimeType && mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  const extRaw = normalizedMime.split("/")[1];
  // heic/heif are valid S3 extensions but most browsers can't render them — store as jpg.
  const ext = (extRaw === "heic" || extRaw === "heif") ? "jpg" : (extRaw || "jpg");
  const key = `proof-photos/${jobId}/${walletAddress}-${uuidv4()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: normalizedMime === "image/heic" || normalizedMime === "image/heif"
        ? "image/jpeg"
        : normalizedMime,
      // Makes the object publicly readable — requires bucket ACL enabled
      ACL: "public-read",
    })
  );

  return `${BUCKET_URL}/${key}`;
}
