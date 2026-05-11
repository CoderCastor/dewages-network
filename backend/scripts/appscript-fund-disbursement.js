/**
 * ============================================================
 *  DeWages — Automated Fund Disbursement (Google Apps Script)
 * ============================================================
 *
 * This script calls your backend's /cron/disburse-funds endpoint
 * every 30 minutes to automatically release escrowed payments
 * for jobs whose dispute period has expired.
 *
 * HOW IT WORKS:
 *   1. Finds all jobs with expired dispute periods (DB query)
 *   2. Sends release_payment transaction on Solana for each
 *   3. Updates job status + worker earnings in MongoDB
 *   All of this happens on the backend — this script just triggers it.
 *
 * SETUP:
 *   1. Go to https://script.google.com → New Project
 *   2. Paste this script into Code.gs
 *   3. Set BACKEND_URL and CRON_SECRET below
 *   4. Run setup() once → authorize when prompted
 *   5. Done! Runs every 30 minutes automatically.
 *
 * TO STOP:
 *   Run removeTriggers()
 * ============================================================
 */

// ══════════════════════════════════════
// CONFIGURATION — Set these two values
// ══════════════════════════════════════
var BACKEND_URL = "https://your-app-name.onrender.com";
var CRON_SECRET = "your-cron-secret-here"; // Same as CRON_SECRET in your backend .env

// ══════════════════════════════════════
// DISBURSEMENT TRIGGER
// ══════════════════════════════════════
function triggerDisbursement() {
  var url = BACKEND_URL + "/cron/disburse-funds?secret=" + CRON_SECRET;

  try {
    var response = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true,
    });

    var code = response.getResponseCode();
    var body = response.getContentText();

    if (code === 200) {
      var data = JSON.parse(body);
      Logger.log(
        "✅ Disbursement complete | Processed: " + data.processed +
        " | Success: " + data.success +
        " | Failed: " + data.failed +
        " | Time: " + data.elapsed
      );
    } else {
      Logger.log("⚠️ Status " + code + " | " + body);
    }
  } catch (e) {
    Logger.log("❌ Error: " + e.message);
  }
}

// ══════════════════════════════════════
// SETUP — Run once to create trigger
// ══════════════════════════════════════
function setup() {
  removeTriggers();
  ScriptApp.newTrigger("triggerDisbursement").timeBased().everyMinutes(30).create();
  Logger.log("✅ Trigger set: every 30 minutes");
  triggerDisbursement(); // immediate test
}

// ══════════════════════════════════════
// CLEANUP
// ══════════════════════════════════════
function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  Logger.log("Removed " + triggers.length + " trigger(s)");
}
