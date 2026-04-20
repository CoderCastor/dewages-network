/**
 * ============================================================================
 * INTEGRATION TESTS: Admin API Endpoints
 * ============================================================================
 * Tests the admin controller functions (adminLogin, fetchWorkers,
 * fetchCompanies, verifyWorker, verifyCompany) with actual database
 * interactions using MongoDB Memory Server.
 *
 * Testing Strategy: Integration Testing
 * Validation Techniques: API response verification, database state checks
 * ============================================================================
 */

import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// ---- Set env BEFORE imports ----
process.env.JWT_SECRET = "test-jwt-secret-key-for-dewages-network";
process.env.PORT = "8001";
process.env.NODE_ENV = "test";

import {
  adminLogin,
  fetchWorkers,
  fetchWorkerByWallet,
  verifyWorker,
  fetchCompanies,
  fetchCompanyByWallet,
  verifyCompany,
} from "../../controller/adminController.js";
import { WorkerProfile } from "../../model/workerModel.js";
import { CompanyProfile } from "../../model/companyModel.js";
import {
  validWorkerData,
  validCompanyData,
  mockRequest,
  mockResponse,
} from "../setup/testFixtures.js";

let mongod;

// ============================================================================
// Test Lifecycle
// ============================================================================

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ============================================================================
// 1. Admin Login Tests
// ============================================================================

describe("Admin Login", () => {
  test("TC-A01: should return token for valid admin credentials", () => {
    const req = mockRequest({
      body: { username: "codercastor", password: "12345" },
    });
    const res = mockResponse();

    adminLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
      })
    );
  });

  test("TC-A02: should return error for wrong username", () => {
    const req = mockRequest({
      body: { username: "wronguser", password: "12345" },
    });
    const res = mockResponse();

    adminLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "wrong username and password",
      })
    );
  });

  test("TC-A03: should return error for wrong password", () => {
    const req = mockRequest({
      body: { username: "codercastor", password: "wrongpass" },
    });
    const res = mockResponse();

    adminLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "wrong username and password",
      })
    );
  });

  test("TC-A04: should return error for empty credentials", () => {
    const req = mockRequest({
      body: { username: "", password: "" },
    });
    const res = mockResponse();

    adminLogin(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "wrong username and password",
      })
    );
  });
});

// ============================================================================
// 2. Admin Worker Management Tests
// ============================================================================

describe("Admin Worker Management", () => {
  test("TC-A05: fetchWorkers should return all workers", async () => {
    await WorkerProfile.create(validWorkerData);
    await WorkerProfile.create({
      ...validWorkerData,
      walletAddress: "DifferentWallet123456789012345678901234",
      name: "Another Worker",
    });

    const req = mockRequest();
    const res = mockResponse();

    await fetchWorkers(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        workers: expect.arrayContaining([
          expect.objectContaining({ name: validWorkerData.name }),
          expect.objectContaining({ name: "Another Worker" }),
        ]),
      })
    );
  });

  test("TC-A06: fetchWorkers should return empty array when no workers", async () => {
    const req = mockRequest();
    const res = mockResponse();

    await fetchWorkers(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        workers: [],
      })
    );
  });

  test("TC-A07: fetchWorkerByWallet should return worker for valid wallet", async () => {
    await WorkerProfile.create(validWorkerData);

    const req = mockRequest({
      params: { walletAddress: validWorkerData.walletAddress },
    });
    const res = mockResponse();

    await fetchWorkerByWallet(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        worker: expect.objectContaining({
          walletAddress: validWorkerData.walletAddress,
          name: validWorkerData.name,
        }),
      })
    );
  });

  test("TC-A08: fetchWorkerByWallet should return 404 for non-existent wallet", async () => {
    const req = mockRequest({
      params: { walletAddress: "NonExistentWallet123456" },
    });
    const res = mockResponse();

    await fetchWorkerByWallet(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Worker not found",
      })
    );
  });

  test("TC-A09: verifyWorker should update PDA and verification status", async () => {
    await WorkerProfile.create(validWorkerData);

    const req = mockRequest({
      params: { walletAddress: validWorkerData.walletAddress },
      body: {
        PDAAddress: "NewPDAAddress123456789",
        isVerified: true,
      },
    });
    const res = mockResponse();

    await verifyWorker(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        worker: expect.objectContaining({
          PDAAddress: "NewPDAAddress123456789",
          isVerified: true,
        }),
      })
    );

    // Verify in database
    const worker = await WorkerProfile.findOne({
      walletAddress: validWorkerData.walletAddress,
    });
    expect(worker.PDAAddress).toBe("NewPDAAddress123456789");
    expect(worker.isVerified).toBe(true);
  });

  test("TC-A10: verifyWorker should return 404 for non-existent worker", async () => {
    const req = mockRequest({
      params: { walletAddress: "NonExistentWallet999" },
      body: { isVerified: true },
    });
    const res = mockResponse();

    await verifyWorker(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Worker not found" })
    );
  });
});

// ============================================================================
// 3. Admin Company Management Tests
// ============================================================================

describe("Admin Company Management", () => {
  test("TC-A11: fetchCompanies should return all companies", async () => {
    await CompanyProfile.create(validCompanyData);

    const req = mockRequest();
    const res = mockResponse();

    await fetchCompanies(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        companies: expect.arrayContaining([
          expect.objectContaining({
            companyName: validCompanyData.companyName,
          }),
        ]),
      })
    );
  });

  test("TC-A12: fetchCompanyByWallet should return company for valid wallet", async () => {
    await CompanyProfile.create(validCompanyData);

    const req = mockRequest({
      params: { walletAddress: validCompanyData.walletAddress },
    });
    const res = mockResponse();

    await fetchCompanyByWallet(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        company: expect.objectContaining({
          walletAddress: validCompanyData.walletAddress,
          companyName: validCompanyData.companyName,
        }),
      })
    );
  });

  test("TC-A13: fetchCompanyByWallet should return 404 for non-existent company", async () => {
    const req = mockRequest({
      params: { walletAddress: "NonExistentCompanyWallet" },
    });
    const res = mockResponse();

    await fetchCompanyByWallet(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Company not found" })
    );
  });

  test("TC-A14: verifyCompany should update PDA and verification status", async () => {
    await CompanyProfile.create(validCompanyData);

    const req = mockRequest({
      params: { walletAddress: validCompanyData.walletAddress },
      body: {
        PDAAddress: "CompanyPDAAddress123",
        isVerified: true,
      },
    });
    const res = mockResponse();

    await verifyCompany(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        company: expect.objectContaining({
          PDAAddress: "CompanyPDAAddress123",
          isVerified: true,
        }),
      })
    );

    // Verify database state
    const company = await CompanyProfile.findOne({
      walletAddress: validCompanyData.walletAddress,
    });
    expect(company.PDAAddress).toBe("CompanyPDAAddress123");
    expect(company.isVerified).toBe(true);
  });

  test("TC-A15: verifyCompany should return 404 for non-existent company", async () => {
    const req = mockRequest({
      params: { walletAddress: "NonExistentCompany" },
      body: { isVerified: true },
    });
    const res = mockResponse();

    await verifyCompany(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Company not found" })
    );
  });
});
