/**
 * ============================================================================
 * UNIT TESTS: Zod Validation Schemas
 * ============================================================================
 * Tests the Zod validation schemas defined in /schemas to ensure input
 * validation works correctly for worker profiles, crypto wallets, and
 * related data.
 *
 * Testing Strategy: Unit Testing
 * Validation Techniques: Input validation, constraint boundaries, format checking
 * ============================================================================
 */

import { jest } from "@jest/globals";
import {
  WorkerProfileSchema,
  CreateWorkerProfileSchema,
  UpdateWorkerProfileSchema,
  WorkerSkillSchema,
  WorkerAvailabilitySchema,
  PaginationSchema,
  WorkerProfileFiltersSchema,
  validateWorkerProfile,
  validateWithSchema,
} from "../../schemas/userSchemas.js";
import { walletSchema } from "../../schemas/cryptoSchema.js";

// ============================================================================
// 1. Crypto Schema (Wallet Validation) Tests
// ============================================================================

describe("Crypto Schema - Wallet Validation", () => {
  test("TC-S01: should accept valid Solana public key (Base58)", () => {
    const result = walletSchema.safeParse({
      pubkey: "5h54tPqd4ZbjTLF74SKVTCKmzRrnhP9tFqPcrHjxcfhQ",
    });
    expect(result.success).toBe(true);
  });

  test("TC-S02: should reject public key shorter than 32 characters", () => {
    const result = walletSchema.safeParse({
      pubkey: "short",
    });
    expect(result.success).toBe(false);
  });

  test("TC-S03: should reject public key longer than 88 characters", () => {
    const longKey = "A".repeat(89);
    const result = walletSchema.safeParse({
      pubkey: longKey,
    });
    expect(result.success).toBe(false);
  });

  test("TC-S04: should reject public key with invalid characters (0, O, I, l)", () => {
    // Base58 excludes 0, O, I, l
    const result = walletSchema.safeParse({
      pubkey: "0OIl" + "A".repeat(40),
    });
    expect(result.success).toBe(false);
  });

  test("TC-S05: should reject empty pubkey", () => {
    const result = walletSchema.safeParse({
      pubkey: "",
    });
    expect(result.success).toBe(false);
  });

  test("TC-S06: should reject missing pubkey field", () => {
    const result = walletSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// 2. Worker Profile Schema Tests
// ============================================================================

describe("Worker Profile Schema Validation", () => {
  const validWorkerInput = {
    walletAddress: "7nYB1x2L3ZCfPkM8Q9R4sT5uV6W8xYz1A2B3C4D5E6F7",
    name: "Ramesh Kumar",
    phone: "+919876543210",
    email: "ramesh@example.com",
    bio: "Experienced worker",
    skills: ["masonry", "painting"],
    experienceLevel: "experienced",
    jobCategories: ["construction"],
    emergencyContact: {
      name: "Suresh",
      phone: "+919876543211",
      relation: "Brother",
    },
  };

  test("TC-S07: should validate a complete worker profile successfully", () => {
    const result = CreateWorkerProfileSchema.safeParse(validWorkerInput);
    expect(result.success).toBe(true);
  });

  test("TC-S08: should reject worker profile without required name", () => {
    const input = { ...validWorkerInput };
    delete input.name;

    const result = CreateWorkerProfileSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("TC-S09: should reject name exceeding 100 characters", () => {
    const input = {
      ...validWorkerInput,
      name: "A".repeat(101),
    };

    const result = CreateWorkerProfileSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("TC-S10: should reject bio exceeding 500 characters", () => {
    const input = {
      ...validWorkerInput,
      bio: "B".repeat(501),
    };

    const result = CreateWorkerProfileSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("TC-S11: should reject more than 20 skills", () => {
    const input = {
      ...validWorkerInput,
      skills: Array.from({ length: 21 }, (_, i) => `skill_${i}`),
    };

    const result = CreateWorkerProfileSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("TC-S12: should reject invalid experienceLevel", () => {
    const input = {
      ...validWorkerInput,
      experienceLevel: "master",
    };

    const result = CreateWorkerProfileSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("TC-S13: should accept valid experienceLevel values", () => {
    for (const level of ["beginner", "intermediate", "experienced"]) {
      const input = { ...validWorkerInput, experienceLevel: level };
      const result = CreateWorkerProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  test("TC-S14: should reject more than 5 job categories", () => {
    const input = {
      ...validWorkerInput,
      jobCategories: [
        "construction",
        "delivery",
        "domestic_help",
        "event_staffing",
        "agriculture",
        "cleaning",
      ],
    };

    const result = CreateWorkerProfileSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("TC-S15: should reject invalid jobCategory value", () => {
    const input = {
      ...validWorkerInput,
      jobCategories: ["rocket_science"],
    };

    const result = CreateWorkerProfileSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("TC-S16: should accept valid job category enums", () => {
    const validCategories = [
      "construction",
      "delivery",
      "domestic_help",
      "event_staffing",
      "agriculture",
      "cleaning",
      "security",
      "other",
    ];

    for (const category of validCategories) {
      const input = { ...validWorkerInput, jobCategories: [category] };
      const result = CreateWorkerProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  test("TC-S17: should reject invalid email format", () => {
    const input = {
      ...validWorkerInput,
      email: "not-an-email",
    };

    const result = CreateWorkerProfileSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  test("TC-S18: should lowercase email automatically", () => {
    const input = {
      ...validWorkerInput,
      email: "RAMESH@EXAMPLE.COM",
    };

    const result = CreateWorkerProfileSchema.safeParse(input);
    if (result.success) {
      expect(result.data.email).toBe("ramesh@example.com");
    }
  });
});

// ============================================================================
// 3. Update Worker Profile Schema Tests
// ============================================================================

describe("Update Worker Profile Schema", () => {
  test("TC-S19: should allow partial updates (only name)", () => {
    const result = UpdateWorkerProfileSchema.safeParse({
      name: "New Name",
    });
    expect(result.success).toBe(true);
  });

  test("TC-S20: should allow partial updates (only bio)", () => {
    const result = UpdateWorkerProfileSchema.safeParse({
      bio: "Updated bio information",
    });
    expect(result.success).toBe(true);
  });

  test("TC-S21: should not allow walletAddress in updates (omitted field)", () => {
    const result = UpdateWorkerProfileSchema.safeParse({
      walletAddress: "some-address",
      name: "New Name",
    });

    // walletAddress should be stripped/ignored
    if (result.success) {
      expect(result.data.walletAddress).toBeUndefined();
    }
  });
});

// ============================================================================
// 4. Worker Skill Schema Tests
// ============================================================================

describe("Worker Skill Schema", () => {
  test("TC-S22: should validate a complete worker skill", () => {
    const result = WorkerSkillSchema.safeParse({
      workerWallet: "7nYB1x2L3ZCfPkM8Q9R4sT5uV6W8xYz1A2B3C4D5E6F7",
      skillName: "Masonry",
      category: "construction",
      experienceYears: 5,
      proficiencyLevel: "advanced",
    });
    expect(result.success).toBe(true);
  });

  test("TC-S23: should reject skill name exceeding 50 chars", () => {
    const result = WorkerSkillSchema.safeParse({
      workerWallet: "7nYB1x2L3ZCfPkM8Q9R4sT5uV6W8xYz1A2B3C4D5E6F7",
      skillName: "X".repeat(51),
      category: "construction",
    });
    expect(result.success).toBe(false);
  });

  test("TC-S24: should reject experienceYears greater than 50", () => {
    const result = WorkerSkillSchema.safeParse({
      workerWallet: "7nYB1x2L3ZCfPkM8Q9R4sT5uV6W8xYz1A2B3C4D5E6F7",
      skillName: "Masonry",
      category: "construction",
      experienceYears: 51,
    });
    expect(result.success).toBe(false);
  });

  test("TC-S25: should accept 'technical' as a category (extended enum)", () => {
    const result = WorkerSkillSchema.safeParse({
      workerWallet: "7nYB1x2L3ZCfPkM8Q9R4sT5uV6W8xYz1A2B3C4D5E6F7",
      skillName: "React",
      category: "technical",
    });
    expect(result.success).toBe(true);
  });

  test("TC-S26: should accept all valid proficiency levels", () => {
    for (const level of ["basic", "intermediate", "advanced", "expert"]) {
      const result = WorkerSkillSchema.safeParse({
        workerWallet: "7nYB1x2L3ZCfPkM8Q9R4sT5uV6W8xYz1A2B3C4D5E6F7",
        skillName: "Skill",
        category: "construction",
        proficiencyLevel: level,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================================
// 5. Pagination Schema Tests
// ============================================================================

describe("Pagination Schema", () => {
  test("TC-S27: should set default page=1 and limit=10", () => {
    const result = PaginationSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });

  test("TC-S28: should reject page less than 1", () => {
    const result = PaginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  test("TC-S29: should reject limit greater than 100", () => {
    const result = PaginationSchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  test("TC-S30: should accept valid sortOrder values", () => {
    for (const order of ["asc", "desc"]) {
      const result = PaginationSchema.safeParse({ sortOrder: order });
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================================
// 6. validateWithSchema Utility Tests
// ============================================================================

describe("validateWithSchema Utility", () => {
  test("TC-S31: should return parsed data for valid input", () => {
    const result = validateWithSchema(walletSchema, {
      pubkey: "5h54tPqd4ZbjTLF74SKVTCKmzRrnhP9tFqPcrHjxcfhQ",
    });
    expect(result.pubkey).toBe("5h54tPqd4ZbjTLF74SKVTCKmzRrnhP9tFqPcrHjxcfhQ");
  });

  test("TC-S32: should throw Error for invalid input", () => {
    expect(() => {
      validateWithSchema(walletSchema, { pubkey: "" });
    }).toThrow();
  });
});

// ============================================================================
// 7. Worker Profile Filters Schema Tests
// ============================================================================

describe("Worker Profile Filters Schema", () => {
  test("TC-S33: should accept empty filters", () => {
    const result = WorkerProfileFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test("TC-S34: should validate minRating between 0 and 5", () => {
    const valid = WorkerProfileFiltersSchema.safeParse({ minRating: 3.5 });
    expect(valid.success).toBe(true);

    const invalid = WorkerProfileFiltersSchema.safeParse({ minRating: 6 });
    expect(invalid.success).toBe(false);
  });

  test("TC-S35: should validate maxDistance between 1 and 100", () => {
    const valid = WorkerProfileFiltersSchema.safeParse({ maxDistance: 50 });
    expect(valid.success).toBe(true);

    const tooSmall = WorkerProfileFiltersSchema.safeParse({ maxDistance: 0 });
    expect(tooSmall.success).toBe(false);

    const tooBig = WorkerProfileFiltersSchema.safeParse({ maxDistance: 101 });
    expect(tooBig.success).toBe(false);
  });

  test("TC-S36: should validate location coordinates ranges", () => {
    const valid = WorkerProfileFiltersSchema.safeParse({
      location: { latitude: 19.076, longitude: 72.8777 },
    });
    expect(valid.success).toBe(true);

    const invalidLat = WorkerProfileFiltersSchema.safeParse({
      location: { latitude: 91, longitude: 72.8777 },
    });
    expect(invalidLat.success).toBe(false);

    const invalidLng = WorkerProfileFiltersSchema.safeParse({
      location: { latitude: 19.076, longitude: 181 },
    });
    expect(invalidLng.success).toBe(false);
  });
});
