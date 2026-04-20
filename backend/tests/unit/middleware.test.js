/**
 * ============================================================================
 * UNIT TESTS: Authentication Middleware
 * ============================================================================
 * Tests the JWT-based authentication middleware (authMiddleware) and
 * admin authentication middleware (adminAuthMiddleware) for token
 * verification, access control, and error handling.
 *
 * Testing Strategy: Unit Testing
 * Validation Techniques: Token verification, role-based access control
 * ============================================================================
 */

import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

// ---- Set env BEFORE importing middleware ----
process.env.JWT_SECRET = "test-jwt-secret-key-for-dewages-network";
process.env.PORT = "8001";
process.env.NODE_ENV = "test";

import { authMiddleware, adminAuthMiddleware } from "../../middleware/authMiddleware.js";
import {
  generateTestToken,
  generateAdminToken,
  generateExpiredToken,
  mockRequest,
  mockResponse,
  mockNext,
} from "../setup/testFixtures.js";

const JWT_SECRET = "test-jwt-secret-key-for-dewages-network";
const ADMIN_WALLET = "5h54tPqd4ZbjTLF74SKVTCKmzRrnhP9tFqPcrHjxcfhQ";

// ============================================================================
// 1. authMiddleware Tests
// ============================================================================

describe("authMiddleware", () => {
  // ---- Happy Path ----

  test("TC-MW01: should pass with valid Bearer token in Authorization header", () => {
    const token = generateTestToken({
      userId: "user123",
      walletAddress: "testWallet123",
      userType: "worker",
    });

    const req = mockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockResponse();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.walletAddress).toBe("testWallet123");
    expect(req.user.userType).toBe("worker");
  });

  test("TC-MW02: should pass with token in x-access-token header", () => {
    const token = generateTestToken({
      userId: "user456",
      walletAddress: "testWallet456",
      userType: "company",
    });

    const req = mockRequest({
      headers: { "x-access-token": token },
    });
    const res = mockResponse();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.walletAddress).toBe("testWallet456");
    expect(req.user.userType).toBe("company");
  });

  test("TC-MW03: should pass with token in request body", () => {
    const token = generateTestToken({
      userId: "user789",
      walletAddress: "testWallet789",
      userType: "worker",
    });

    const req = mockRequest({
      body: { token },
    });
    const res = mockResponse();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.walletAddress).toBe("testWallet789");
  });

  // ---- Error Cases ----

  test("TC-MW04: should return 401 when no token is provided", () => {
    const req = mockRequest({
      headers: {},
    });
    const res = mockResponse();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Access denied. No token provided.",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("TC-MW05: should return 401 for expired token", async () => {
    const expiredToken = generateExpiredToken();

    // Wait a moment for the token to actually expire
    await new Promise((resolve) => setTimeout(resolve, 100));

    const req = mockRequest({
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    const res = mockResponse();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Token expired. Please sign in again.",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("TC-MW06: should return 401 for invalid/malformed token", () => {
    const req = mockRequest({
      headers: { authorization: "Bearer invalid.token.here" },
    });
    const res = mockResponse();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid token.",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("TC-MW07: should return 401 for token signed with wrong secret", () => {
    const wrongToken = jwt.sign(
      { userId: "user", walletAddress: "wallet", userType: "worker" },
      "wrong-secret"
    );

    const req = mockRequest({
      headers: { authorization: `Bearer ${wrongToken}` },
    });
    const res = mockResponse();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // ---- Edge Cases ----

  test("TC-MW08: should handle Authorization header without 'Bearer' prefix", () => {
    const req = mockRequest({
      headers: { authorization: "NotBearer sometoken" },
    });
    const res = mockResponse();
    const next = mockNext();

    authMiddleware(req, res, next);

    // "sometoken" is not a valid JWT, should fail
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ============================================================================
// 2. adminAuthMiddleware Tests
// ============================================================================

describe("adminAuthMiddleware", () => {
  // ---- Happy Path ----

  test("TC-MW09: should pass for valid admin wallet token", () => {
    const token = jwt.sign(
      {
        userId: 12345,
        walletAddress: ADMIN_WALLET,
        userType: "admin",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const req = mockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockResponse();
    const next = mockNext();

    adminAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.isAdmin).toBe(true);
    expect(req.user.walletAddress).toBe(ADMIN_WALLET);
  });

  // ---- Error Cases ----

  test("TC-MW10: should return 403 for non-admin wallet", () => {
    const token = jwt.sign(
      {
        userId: "regularUser",
        walletAddress: "RegularWalletAddress1234567890123",
        userType: "worker",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const req = mockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockResponse();
    const next = mockNext();

    adminAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Access denied. Admin privileges required.",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("TC-MW11: should return 401 when no token is provided", () => {
    const req = mockRequest({ headers: {} });
    const res = mockResponse();
    const next = mockNext();

    adminAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Access denied. No token provided.",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("TC-MW12: should return 401 for expired admin token", async () => {
    const token = jwt.sign(
      {
        userId: 12345,
        walletAddress: ADMIN_WALLET,
        userType: "admin",
      },
      JWT_SECRET,
      { expiresIn: "0s" }
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const req = mockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = mockResponse();
    const next = mockNext();

    adminAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Token expired. Please sign in again.",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("TC-MW13: should return 401 for invalid token in admin route", () => {
    const req = mockRequest({
      headers: { authorization: "Bearer totally.invalid.jwt" },
    });
    const res = mockResponse();
    const next = mockNext();

    adminAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
