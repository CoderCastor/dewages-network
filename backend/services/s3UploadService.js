import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME;

/**
 * Upload a proof photo buffer to S3.
 * Returns a pre-signed GET URL (valid 7 days) so photos remain viewable
 * without requiring the bucket to have public-read ACLs enabled.
 */
export async function uploadProofPhoto(fileBuffer, mimeType, jobId, walletAddress) {
  const normalizedMime = mimeType && mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  const extRaw = normalizedMime.split("/")[1];
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
    })
  );

  // Generate a pre-signed URL valid for 7 days (604800 seconds)
  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 604800 }
  );

  return signedUrl;
}
