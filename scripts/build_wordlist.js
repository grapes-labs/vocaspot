#!/usr/bin/env node
// Builds data/cefr_wordlist.json from two OLP CSV sources + custom_overrides.json.

import { mkdirSync, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "data", "cefr_wordlist.json");
const OVERRIDES_PATH = resolve(ROOT, "data", "custom_overrides.json");

const URLS = {
  a1b2: "https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-vocabulary-profile-1.5.csv",
  c1c2: "https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/octanove-vocabulary-profile-c1c2-1.0.csv",
};

const CEFR_RANK = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
const VALID_LEVELS = new Set(Object.keys(CEFR_RANK));

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const hwIdx = header.indexOf("headword");
  const cefrIdx = header.indexOf("cefr");

  if (hwIdx === -1 || cefrIdx === -1) {
    throw new Error(`Missing expected columns. Header: ${header.join(", ")}`);
  }

  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Minimal CSV split: handle quoted fields containing commas
    const cols = splitCSVLine(line);
    const headword = cols[hwIdx]?.trim().toLowerCase();
    const level = cols[cefrIdx]?.trim().toUpperCase();

    if (headword && VALID_LEVELS.has(level)) {
      entries.push({ headword, level });
    }
  }
  return entries;
}

// Split a single CSV line respecting double-quoted fields
function splitCSVLine(line) {
  const cols = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cols.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
}

function merge(existing, incoming) {
  for (const { headword, level } of incoming) {
    const current = existing[headword];
    if (!current || CEFR_RANK[level] < CEFR_RANK[current]) {
      existing[headword] = level;
    }
  }
}

// Override entries always win regardless of existing level
function applyOverrides(wordlist, overrides) {
  let applied = 0;
  for (const [key, level] of Object.entries(overrides)) {
    // Skip comment/annotation keys
    if (key.startsWith("//") || key.startsWith("_")) continue;
    if (!VALID_LEVELS.has(level)) continue;
    if (wordlist[key] !== level) applied++;
    wordlist[key] = level;
  }
  return applied;
}

async function main() {
  console.log("Fetching FILE 1 (A1–B2)…");
  const text1 = await fetchText(URLS.a1b2);

  console.log("Fetching FILE 2 (C1–C2)…");
  const text2 = await fetchText(URLS.c1c2);

  console.log("Parsing…");
  const entries1 = parseCSV(text1);
  const entries2 = parseCSV(text2);

  const wordlist = {};
  merge(wordlist, entries1);
  merge(wordlist, entries2);

  console.log("Applying custom overrides…");
  const overrides = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8"));
  const overrideCount = applyOverrides(wordlist, overrides);

  // Sort keys for stable, diffable output
  const sorted = Object.fromEntries(
    Object.entries(wordlist).sort(([a], [b]) => a.localeCompare(b))
  );

  mkdirSync(resolve(ROOT, "data"), { recursive: true });
  await writeFile(OUT, JSON.stringify(sorted, null, 2));

  // Summary
  const counts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
  for (const level of Object.values(sorted)) counts[level]++;
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  console.log("\nCEFR distribution:");
  for (const [level, count] of Object.entries(counts)) {
    console.log(`  ${level}: ${count.toLocaleString()}`);
  }
  console.log(`  ─────────────`);
  console.log(`  Total: ${total.toLocaleString()} words`);
  console.log(`  (${overrideCount} entries added/changed by custom_overrides.json)`);
  console.log(`\nSaved → ${OUT}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
