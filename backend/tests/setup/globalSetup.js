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
  process.env.PROGRAM_ID = "3detc4UfYvz14NqdUdM6698ziVNMEEaSHHVhZiGKM4NJ";
  process.env.RPC_URL = "http://127.0.0.1:8899";

  console.log(`\n✅ MongoDB Memory Server started at: ${uri}\n`);
}
