/**
 * Global Teardown for Test Suite
 * ================================
 * Stops the MongoDB Memory Server after all tests complete.
 */

export default async function globalTeardown() {
  if (globalThis.__MONGOD__) {
    await globalThis.__MONGOD__.stop();
    console.log("\n✅ MongoDB Memory Server stopped.\n");
  }
}
