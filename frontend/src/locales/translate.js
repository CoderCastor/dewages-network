/**
 * translate.js — One-time script to auto-generate hi.json and mr.json from en.json
 *
 * Uses MyMemory API (free, no key required — 1000 words/day limit)
 *
 * Usage:
 *   node src/locales/translate.js
 *
 * Run this whenever you add new keys to en.json. It will:
 *  1. Deep-diff en.json against the target locale file
 *  2. Translate only the new/missing keys
 *  3. Merge and write the output file
 *
 * If you exceed the free limit, wait 24h or use MYMEMORY_EMAIL env var
 * (registering an email raises the limit to 10k words/day).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LANGS = [
  { code: "hi", name: "Hindi",   langpair: "en|hi" },
  { code: "mr", name: "Marathi", langpair: "en|mr" },
];

// Keep these keys in English — technical terms that should not be translated
const SKIP_TRANSLATION_VALUES = /^(OTP|SOL|PDA|GPS|Job PDA:|✓|→|📸|✅)/;

async function translateText(text, langpair) {
  const email = process.env.MYMEMORY_EMAIL || "";
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}${email ? `&de=${email}` : ""}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for "${text}"`);
  const data = await res.json();
  if (data.responseStatus !== 200) throw new Error(`API error ${data.responseStatus}: ${data.responseDetails}`);
  return data.responseData.translatedText;
}

/** Flatten nested object to dot-notation paths */
function flattenObject(obj, prefix = "") {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) {
      Object.assign(result, flattenObject(v, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

/** Set a value at a nested dot-path in an object */
function setNested(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

/** Get value at a nested dot-path (undefined if missing) */
function getNested(obj, path) {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

async function translateLocale(enObj, targetObj, langpair, langName) {
  const flat = flattenObject(enObj);
  const result = JSON.parse(JSON.stringify(targetObj)); // deep clone existing
  const missing = [];

  for (const [dotPath, enValue] of Object.entries(flat)) {
    if (getNested(targetObj, dotPath) === undefined) {
      missing.push(dotPath);
    }
  }

  console.log(`\n[${langName}] ${missing.length} new keys to translate`);
  if (missing.length === 0) return result;

  let done = 0;
  for (const dotPath of missing) {
    const enValue = getNested(enObj, dotPath);
    let translated = enValue;

    if (SKIP_TRANSLATION_VALUES.test(enValue)) {
      console.log(`  [skip]  ${dotPath} = "${enValue}"`);
    } else {
      try {
        translated = await translateText(enValue, langpair);
        console.log(`  [${++done}/${missing.length}] ${dotPath}`);
        console.log(`          EN: ${enValue}`);
        console.log(`          ${langName.slice(0,2).toUpperCase()}: ${translated}`);
        // Rate-limit: 200ms between requests to avoid hammering the free API
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`  [error] ${dotPath}: ${err.message} — keeping English`);
      }
    }

    setNested(result, dotPath, translated);
  }

  return result;
}

async function main() {
  const enPath = path.join(__dirname, "en.json");
  const enObj = JSON.parse(fs.readFileSync(enPath, "utf8"));

  for (const lang of LANGS) {
    const targetPath = path.join(__dirname, `${lang.code}.json`);
    const targetObj = fs.existsSync(targetPath)
      ? JSON.parse(fs.readFileSync(targetPath, "utf8"))
      : {};

    const result = await translateLocale(enObj, targetObj, lang.langpair, lang.name);

    fs.writeFileSync(targetPath, JSON.stringify(result, null, 2) + "\n", "utf8");
    console.log(`\n✅ Written: ${targetPath}`);
  }

  console.log("\nDone. Commit the updated hi.json and mr.json files.");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
