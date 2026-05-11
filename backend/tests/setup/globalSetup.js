/**
 * Global Setup for Test Suite
 * ============================
 * Starts a MongoDB Memory Server instance before all tests.
 * This provides an isolated, in-memory MongoDB for testing
 * without affecting the production database.
 */

import { MongoMemoryServer } from "mongodb-memory-server";

export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Store the URI and instance reference for tests to use
  globalThis.__MONGOD__ = mongod;
  process.env.MONGO_CONNECTION_STRING = uri;
  process.env.JWT_SECRET = "test-jwt-secret-key-for-dewages-network";
  process.env.PORT = "8001";
  process.env.NODE_ENV = "test";
  process.env.PROGRAM_ID = "4f9fP5Aoz7Tcu7Z5J7WWhTRUa757QnK91JvpM1Zyg7BM";
  process.env.RPC_URL = "https://devnet.helius-rpc.com/?api-key=2ac5b659-b819-400e-990c-628e1b2582e9";

  console.log(`\n✅ MongoDB Memory Server started at: ${uri}\n`);
}
