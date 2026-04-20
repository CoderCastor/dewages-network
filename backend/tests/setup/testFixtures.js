/**
 * Test Fixtures & Helpers
 * ========================
 * Provides reusable test data (fixtures) and helper functions
 * for generating JWT tokens, mock requests, etc.
 */

import jwt from "jsonwebtoken";
import { jest } from "@jest/globals";

// ============================================================================
// Configuration
// ============================================================================

const JWT_SECRET = "test-jwt-secret-key-for-dewages-network";
const ADMIN_WALLET = "5h54tPqd4ZbjTLF74SKVTCKmzRrnhP9tFqPcrHjxcfhQ";

// ============================================================================
// Test Fixtures - Worker Data
// ============================================================================

export const validWorkerData = {
  walletAddress: "7nYB1x2L3ZCfPkM8Q9R4sT5uV6W8xYz1A2B3C4D5E6F7",
  name: "Ramesh Kumar",
  phone: "+919876543210",
  email: "ramesh@example.com",
  bio: "Experienced construction worker with 5 years of expertise.",
  location: {
    address: "123 Main St",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    coordinates: [72.8777, 19.076],
  },
  skills: ["masonry", "painting", "plumbing"],
  experienceLevel: "experienced",
  jobCategories: ["construction", "cleaning"],
  verificationStatus: {
    phone: true,
    email: true,
    identity: false,
  },
  emergencyContact: {
    name: "Suresh Kumar",
    phone: "+919876543211",
    relation: "Brother",
  },
  isActive: true,
  isVerified: false,
  rating: 4.5,
  totalJobs: 25,
  completedJobs: 22,
  totalEarnings: 50000,
};

export const validWorkerData2 = {
  walletAddress: "8mZC2y3M4APgQLN9R1S5tU7vW9xZzA3B4C5D6E7F8G9H",
  name: "Sunil Patel",
  phone: "+919876543220",
  email: "sunil@example.com",
  bio: "Delivery specialist in Mumbai area.",
  location: {
    address: "456 Park Avenue",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
  },
  skills: ["driving", "navigation"],
  experienceLevel: "intermediate",
  jobCategories: ["delivery"],
  isActive: true,
  isVerified: true,
};

// ============================================================================
// Test Fixtures - Company Data
// ============================================================================

export const validCompanyData = {
  walletAddress: "9kAD3z4N5BQhRMO1S2T6uV8wX0yAzB4C5D6E7F8G9H0I",
  companyName: "BuildRight Construction Pvt. Ltd.",
  companyType: "medium_business",
  registrationNumber: "MH-2024-12345",
  taxId: "AAACB1234L",
  phone: "+912234567890",
  email: "info@buildright.com",
  website: "https://buildright.com",
  description: "Leading construction company in Maharashtra providing quality services.",
  location: {
    address: "789 Business Park",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    coordinates: [72.8777, 19.076],
  },
  interestedCategories: ["construction", "cleaning"],
  contactPerson: {
    name: "Vijay Sharma",
    designation: "HR Manager",
    phone: "+912234567891",
    email: "vijay@buildright.com",
  },
  socialProfiles: {
    linkedin: "https://linkedin.com/company/buildright",
  },
  isActive: true,
  isVerified: false,
};

export const validCompanyData2 = {
  walletAddress: "2jBE4a5O6CRiSNP3T4U7vW9xY1zBaC5D6E7F8G9H0I1J",
  companyName: "QuickDeliver Services",
  companyType: "small_business",
  phone: "+912234567800",
  email: "info@quickdeliver.com",
  website: "https://quickdeliver.com",
  description: "Fast and reliable delivery services across India.",
  location: {
    address: "101 Delivery Hub",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    coordinates: [77.209, 28.6139],
  },
  interestedCategories: ["delivery"],
  contactPerson: {
    name: "Anil Gupta",
    designation: "Operations Manager",
    phone: "+912234567801",
    email: "anil@quickdeliver.com",
  },
  isActive: true,
  isVerified: true,
};

// ============================================================================
// Test Fixtures - Job Data
// ============================================================================

export const validJobData = {
  jobPDA: "JobPDA_1234567890abcdef1234567890abcdef12345678",
  escrowPDA: "EscrowPDA_abcdef1234567890abcdef1234567890abcd",
  transactionSignature: "TxSig_1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
  companyWallet: "9kAD3z4N5BQhRMO1S2T6uV8wX0yAzB4C5D6E7F8G9H0I",
  companyName: "BuildRight Construction Pvt. Ltd.",
  title: "Construction Worker Needed",
  description: "Need experienced construction worker for building renovation project in Andheri, Mumbai.",
  category: "construction",
  location: {
    address: "Andheri West",
    city: "Mumbai",
    state: "Maharashtra",
    coordinates: [72.8364, 19.1197],
  },
  paymentAmount: 500000000, // 0.5 SOL in lamports
  paymentAmountINR: 4000,
  durationHours: 8,
  requirements: "Must have experience with masonry and painting. Safety equipment required.",
  status: "open",
};

export const validJobData2 = {
  jobPDA: "JobPDA_2345678901bcdef2345678901bcdef23456789",
  escrowPDA: "EscrowPDA_bcdef2345678901bcdef2345678901bcde",
  transactionSignature: "TxSig_2345678901bcdef2345678901bcdef2345678901bcdef2345678901bc",
  companyWallet: "2jBE4a5O6CRiSNP3T4U7vW9xY1zBaC5D6E7F8G9H0I1J",
  companyName: "QuickDeliver Services",
  title: "Delivery Driver Required",
  description: "Need a delivery driver for daily parcel delivery across South Delhi area.",
  category: "delivery",
  location: {
    address: "Nehru Place",
    city: "Delhi",
    state: "Delhi",
    coordinates: [77.2507, 28.5489],
  },
  paymentAmount: 300000000, // 0.3 SOL in lamports
  paymentAmountINR: 2400,
  durationHours: 6,
  requirements: "Must have own vehicle and valid driving license.",
  status: "open",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a valid JWT token for testing authenticated routes.
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID
 * @param {string} payload.walletAddress - Wallet address
 * @param {string} payload.userType - "worker" or "company"
 * @returns {string} JWT token
 */
export const generateTestToken = ({ userId, walletAddress, userType }) => {
  return jwt.sign(
    { userId, walletAddress, userType },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
};

/**
 * Generate an admin JWT token for testing admin routes.
 * @returns {string} JWT token
 */
export const generateAdminToken = () => {
  return jwt.sign(
    { userId: 12345, walletAddress: ADMIN_WALLET, role: "admin" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
};

/**
 * Generate an expired JWT token for testing token expiration.
 * @returns {string} Expired JWT token
 */
export const generateExpiredToken = () => {
  return jwt.sign(
    { userId: "expired-user", walletAddress: "test-wallet", userType: "worker" },
    JWT_SECRET,
    { expiresIn: "0s" }
  );
};

/**
 * Create a mock Express request object.
 */
export const mockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  ...overrides,
});

/**
 * Create a mock Express response object with spy functions.
 */
export const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Helper to create a mock next function.
 */
export const mockNext = () => jest.fn();
