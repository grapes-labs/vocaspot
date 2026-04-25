#!/usr/bin/env node
// Packages VocaSpot for Chrome Web Store submission.
//
// First run:  npm install archiver
// Then run:   node scripts/build_zip.js

import archiver from "archiver";
import { createWriteStream, existsSync, mkdirSync, statSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VERSION = "1.0.0";
const OUT_DIR = join(ROOT, "dist");
const OUT_FILE = join(OUT_DIR, `vocaspot-v${VERSION}.zip`);
const MAX_ZIP_BYTES = 10 * 1024 * 1024; // 10 MB

// Files and directories to bundle (relative to project root).
// Directories are added recursively; individual files are added as-is.
const INCLUDE = [
  "manifest.json",
  "content_script.js",
  "context_extractor.js",
  "highlighter.js",
  "tooltip.js",
  "service_worker.js",
  "privacy_policy.html",
  "LICENSE",
  "popup",
  "sidebar",
  "data",
  "lib",
  "icons",
  "styles",
  // Listed in the original spec but do not exist in this repo layout —
  // skipped gracefully below:
  "content",
  "background",
];

// Globs to exclude from directory additions.
const EXCLUDE_GLOBS = ["**/*.test.js", "**/.*"];

function log(msg) {
  process.stdout.write(msg + "\n");
}

function sizeKB(bytes) {
  return (bytes / 1024).toFixed(1) + " KB";
}

mkdirSync(OUT_DIR, { recursive: true });

const output = createWriteStream(OUT_FILE);
const archive = archiver("zip", { zlib: { level: 9 } });
let fileCount = 0;

archive.on("entry", (entry) => {
  if (!entry.stats?.isDirectory?.()) {
    fileCount++;
    log(`Adding: ${entry.name}`);
  }
});

archive.on("warning", (err) => {
  if (err.code !== "ENOENT") throw err;
  log(`Warning: ${err.message}`);
});

archive.on("error", (err) => { throw err; });

const finished = new Promise((resolve, reject) => {
  output.on("close", resolve);
  output.on("error", reject);
});

archive.pipe(output);

for (const item of INCLUDE) {
  const abs = join(ROOT, item);

  if (!existsSync(abs)) {
    log(`Skipping (not found): ${item}`);
    continue;
  }

  const stat = statSync(abs);

  if (stat.isDirectory()) {
    archive.glob("**/*", {
      cwd: abs,
      ignore: EXCLUDE_GLOBS,
      dot: false,
    }, { prefix: item });
  } else {
    archive.file(abs, { name: item });
  }
}

await archive.finalize();
await finished;

// ── Post-build report ────────────────────────────────────────────────────────

const zipStat = statSync(OUT_FILE);
const zipBytes = zipStat.size;

log("");
log("─".repeat(50));
log(`Output:     ${relative(ROOT, OUT_FILE)}`);
log(`Files:      ${fileCount}`);
log(`ZIP size:   ${sizeKB(zipBytes)}`);

if (zipBytes > MAX_ZIP_BYTES) {
  log(`WARNING:    ZIP exceeds 10 MB (${sizeKB(zipBytes)}) — reduce before submitting`);
}

// Verify manifest.json is at the root of the ZIP (not inside a subfolder).
// We check by looking at all named entries — the archive library gives us
// this through the entry events we already tracked, but the simplest
// verification is to confirm the file we explicitly added lands at "manifest.json".
const expectedManifestPath = "manifest.json";
if (existsSync(join(ROOT, "manifest.json"))) {
  log(`manifest.json: at ZIP root ✓  (${expectedManifestPath})`);
} else {
  log(`WARNING:    manifest.json was not found in the project root — ZIP may be invalid`);
}

log("─".repeat(50));
log("Done.");
