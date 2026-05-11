/**
 * ============================================================
 *  DeWages Network — Render Cold Start Prevention
 *  Google Apps Script — Health Ping
 * ============================================================
 *
 * PURPOSE:
 *   Pings the backend /health endpoint every 5 minutes to
 *   keep the Render free-tier instance warm and prevent
 *   cold starts (which cause ~30-60s delays).
 *
 * SETUP INSTRUCTIONS:
 *   1. Go to https://script.google.com and create a new project.
 *   2. Paste this entire script into Code.gs.
 *   3. Replace BACKEND_URL below with your Render URL.
 *   4. Run the `setup()` function once to create the trigger.
 *   5. Authorize the script when prompted.
 *   6. Done! The script will ping every 5 minutes automatically.
 *
 * MONITORING:
 *   - Check Executions tab in Apps Script to see ping logs.
 *   - Check the Google Sheet (optional) for a log of pings.
 *
 * TO STOP:
 *   - Run the `removeTriggers()` function.
 * ============================================================
 */

// ═══════════════════════════════════════════════════
// CONFIGURATION — Update this with your Render URL
// ═══════════════════════════════════════════════════
var BACKEND_URL = "https://your-app-name.onrender.com";

// ═══════════════════════════════════════════════════
// MAIN PING FUNCTION
// ═══════════════════════════════════════════════════
function pingHealth() {
  var url = BACKEND_URL + "/health";
  var startTime = new Date();

  try {
    var response = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true,
      headers: {
        "Content-Type": "application/json",
      },
    });

    var statusCode = response.getResponseCode();
    var body = JSON.parse(response.getContentText());
    var elapsed = new Date() - startTime;

    Logger.log(
      "✅ Health ping OK | Status: " +
        statusCode +
        " | Uptime: " +
        Math.round(body.uptime) +
        "s | Latency: " +
        elapsed +
        "ms | " +
        new Date().toISOString()
    );
  } catch (error) {
    Logger.log(
      "❌ Health ping FAILED | Error: " +
        error.message +
        " | " +
        new Date().toISOString()
    );
  }
}

// ═══════════════════════════════════════════════════
// SETUP — Run this once to create the 5-min trigger
// ═══════════════════════════════════════════════════
function setup() {
  // Remove any existing triggers first
  removeTriggers();

  // Create a new time-driven trigger every 5 minutes
  ScriptApp.newTrigger("pingHealth")
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log("✅ Trigger created: pingHealth will run every 5 minutes.");
  Logger.log("🔗 Backend URL: " + BACKEND_URL + "/health");

  // Run an immediate test ping
  pingHealth();
}

// ═══════════════════════════════════════════════════
// CLEANUP — Run this to remove all triggers
// ═══════════════════════════════════════════════════
function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  Logger.log("🗑️  Removed " + triggers.length + " trigger(s).");
}
