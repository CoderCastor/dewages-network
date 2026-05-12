/**
 * disputeResolveService.js
 *
 * Two exported functions:
 *
 * 1. createDisputeOnChain({ jobPDA, reason })
 *    Called server-side when a WORKER raises a dispute.
 *    The relayer keypair signs as employer AND we generate a fresh dispute keypair.
 *    Returns { disputePDA, txSignature }
 *
 * 2. resolveDisputeOnChain({ jobPDA, escrowPDA, workerWallet, employerWallet, disputePDA, resolution, resolutionNotes })
 *    Calls the resolveDispute instruction.
 *    disputePDA MUST be the address of an already-initialized dispute account (not derived).
 *    Returns { txSignature }
 *
 * Key IDL facts:
 *   createDispute accounts: job(mut,no-sig) | dispute(mut,SIGNER=new keypair) | employer(mut,SIGNER) | systemProgram
 *   resolveDispute accounts: job | escrow | dispute | worker | employer | employerProfile | workerProfile | admin(SIGNER) | systemProgram
 *   DisputeResolution enum:  FavorWorker=0, FavorEmployer=1, Split=2
 */

import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { sha256 } from "js-sha256";
import fs from "fs";
import { config } from "../config.js";

const PROGRAM_ID = new PublicKey(config.programId);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDiscriminator(name) {
  const hash = sha256(Buffer.from(`global:${name}`));
  return Buffer.from(hash, "hex").slice(0, 8);
}

/** Seeds: ["user_profile", wallet_pubkey] */
function deriveUserProfilePDA(walletAddress) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), new PublicKey(walletAddress).toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

/**
 * Encode a DisputeResolution enum variant as a single u8.
 *   FavorWorker=0, FavorEmployer=1, Split=2
 */
function encodeResolution(resolution) {
  const map = { favor_worker: 0, favor_employer: 1, split: 2 };
  const idx = map[resolution];
  if (idx === undefined) throw new Error(`Unknown resolution: ${resolution}`);
  return Buffer.from([idx]);
}

/** Borsh string: 4-byte LE length prefix + UTF-8 bytes */
function encodeBorshString(str) {
  const bytes = Buffer.from(str, "utf-8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

function loadRelayerKeypair() {
  // Option 1: From env var (Render / production)
  if (process.env.RELAYER_PRIVATE_KEY) {
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(process.env.RELAYER_PRIVATE_KEY))
    );
  }

  // Option 2: From file (local dev)
  const keypairPath = process.env.HOME + "/.config/solana/id.json";
  if (fs.existsSync(keypairPath)) {
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8")))
    );
  }

  throw new Error(
    "Relayer keypair not found. Set RELAYER_PRIVATE_KEY env var or provide ~/.config/solana/id.json"
  );
}

// ─── createDisputeOnChain ─────────────────────────────────────────────────────

/**
 * Called when a WORKER raises a dispute.
 * The relayer acts as employer signer (pays for account rent).
 * A fresh Keypair is generated for the dispute account.
 *
 * @param {{ jobPDA: string, reason: string }} params
 * @returns {{ disputePDA: string, txSignature: string }}
 */
export async function createDisputeOnChain({ jobPDA, reason }) {
  const relayer = loadRelayerKeypair();
  console.log("[CreateDispute] Relayer:", relayer.publicKey.toString());
  console.log("[CreateDispute] JobPDA:", jobPDA);

  // Generate fresh dispute keypair
  const disputeKeypair = Keypair.generate();
  console.log("[CreateDispute] DisputeKeypair:", disputeKeypair.publicKey.toString());

  // Discriminator for createDispute
  const discriminator = getDiscriminator("create_dispute");
  console.log("[CreateDispute] Discriminator:", discriminator.toString("hex"));

  // Encode args: reason (string) + evidence (string)
  const reasonBorsh   = encodeBorshString(reason);
  const evidenceBorsh = encodeBorshString(reason); // evidence = same as reason
  const data = Buffer.concat([discriminator, reasonBorsh, evidenceBorsh]);

  // Accounts in IDL order:
  //   job       – mut, no-signer
  //   dispute   – mut, SIGNER  (fresh keypair)
  //   employer  – mut, SIGNER  (relayer — pays rent & signs)
  //   systemProgram
  const keys = [
    { pubkey: new PublicKey(jobPDA),             isSigner: false, isWritable: true  },
    { pubkey: disputeKeypair.publicKey,           isSigner: true,  isWritable: true  },
    { pubkey: relayer.publicKey,                  isSigner: true,  isWritable: true  },
    { pubkey: SystemProgram.programId,            isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });

  const connection = new Connection(config.rpcUrl, "confirmed");
  const { blockhash } = await connection.getLatestBlockhash();

  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: relayer.publicKey });
  tx.add(instruction);
  // Both relayer AND the fresh disputeKeypair must sign
  tx.sign(relayer, disputeKeypair);

  console.log("[CreateDispute] Sending transaction...");
  const txSignature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(txSignature, "confirmed");

  console.log("[CreateDispute] ✅ Dispute created on-chain:", txSignature);
  console.log("[CreateDispute] Dispute account:", disputeKeypair.publicKey.toString());

  return {
    disputePDA:  disputeKeypair.publicKey.toString(),
    txSignature,
  };
}

// ─── resolveDisputeOnChain ────────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {string} params.jobPDA          - On-chain Job account address
 * @param {string} params.escrowPDA       - On-chain Escrow account address
 * @param {string} params.workerWallet    - Worker's wallet public key
 * @param {string} params.employerWallet  - Company's wallet public key
 * @param {string} params.disputePDA      - On-chain Dispute account address (REQUIRED — must be initialized)
 * @param {string} params.resolution      - "favor_worker" | "favor_employer" | "split"
 * @param {string} params.resolutionNotes
 * @returns {{ txSignature: string }}
 */
export async function resolveDisputeOnChain(params) {
  const {
    jobPDA,
    escrowPDA,
    workerWallet,
    employerWallet,
    disputePDA,
    resolution,
    resolutionNotes,
  } = params;

  if (!disputePDA) {
    throw new Error("disputePDA is required for resolveDispute. The dispute account must be initialized on-chain first.");
  }

  const relayer = loadRelayerKeypair();
  console.log("[ResolveDispute] Relayer:", relayer.publicKey.toString());
  console.log("[ResolveDispute] Resolution:", resolution);
  console.log("[ResolveDispute] JobPDA:", jobPDA);
  console.log("[ResolveDispute] DisputePDA:", disputePDA);

  const employerProfilePDA = deriveUserProfilePDA(employerWallet);
  const workerProfilePDA   = deriveUserProfilePDA(workerWallet);

  // Instruction data: [8-byte discriminator | u8 resolution | borsh string notes]
  const discriminator  = getDiscriminator("resolve_dispute");
  const resolutionByte = encodeResolution(resolution);
  const notesBorsh     = encodeBorshString(resolutionNotes || resolution);
  const data = Buffer.concat([discriminator, resolutionByte, notesBorsh]);

  console.log("[ResolveDispute] Discriminator:", discriminator.toString("hex"));

  // Accounts in IDL order:
  //   job            – mut, no-signer
  //   escrow         – mut, no-signer
  //   dispute        – mut, no-signer  (already initialized)
  //   worker         – mut, no-signer
  //   employer       – mut, no-signer
  //   employerProfile – mut, no-signer
  //   workerProfile  – mut, no-signer
  //   admin          – no-mut, SIGNER
  //   systemProgram
  const keys = [
    { pubkey: new PublicKey(jobPDA),        isSigner: false, isWritable: true  },
    { pubkey: new PublicKey(escrowPDA),     isSigner: false, isWritable: true  },
    { pubkey: new PublicKey(disputePDA),    isSigner: false, isWritable: true  },
    { pubkey: new PublicKey(workerWallet),  isSigner: false, isWritable: true  },
    { pubkey: new PublicKey(employerWallet),isSigner: false, isWritable: true  },
    { pubkey: employerProfilePDA,           isSigner: false, isWritable: true  },
    { pubkey: workerProfilePDA,             isSigner: false, isWritable: true  },
    { pubkey: relayer.publicKey,            isSigner: true,  isWritable: false },
    { pubkey: SystemProgram.programId,      isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });

  const connection = new Connection(config.rpcUrl, "confirmed");
  const { blockhash } = await connection.getLatestBlockhash();

  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: relayer.publicKey });
  tx.add(instruction);
  tx.sign(relayer);

  console.log("[ResolveDispute] Sending transaction...");
  const txSignature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(txSignature, "confirmed");

  console.log("[ResolveDispute] ✅ Dispute resolved on-chain:", txSignature);
  return { txSignature };
}

