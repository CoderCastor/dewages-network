/**
 * Jest Configuration for DeWages Network Backend Tests
 * =====================================================
 * Configures Jest for ES Module support and MongoDB Memory Server usage.
 */

export default {
  // Use the experimental VM modules for ES module support
  transform: {},
  extensionsToTreatAsEsm: [],

  // Test environment
  testEnvironment: "node",

  // Test file patterns
  testMatch: ["**/*.test.js"],

  // Setup files
  globalSetup: "./setup/globalSetup.js",
  globalTeardown: "./setup/globalTeardown.js",

  // Timeout for tests (MongoDB Memory Server may take time to start)
  testTimeout: 30000,

  // Verbose output for reviewer visibility
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,
};
