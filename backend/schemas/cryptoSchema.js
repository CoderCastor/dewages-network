import { z } from "zod";

// Public key validation (Base58 for Solana, usually 32 bytes, ~44 chars)
const publicKeySchema = z
  .string()
  .min(32, "Public key too short")
  .max(88, "Public key too long")
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "Invalid public key format");

export const walletSchema = z.object({
  pubkey: publicKeySchema,
});