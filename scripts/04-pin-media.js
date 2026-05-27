// Step 04 — Pin each media file individually.
// Walks collections/<slug>/media/ and uploads every file via Pinata's single-file
// endpoint, recording { filename: { cid, ... } } in state.mediaPins. Each file gets
// its own root CID — NOT a directory pin.
// Why per-file (not one big directory pin): each media file is independently addressable,
// dedupes automatically at the IPFS layer, and a single bad file doesn't taint the batch.
// Idempotent: rerunning skips files already present in state.mediaPins.
// Retry: each upload retries up to 4 times with exponential backoff (network resets are
// common on 70-150MB MP4s).
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { uploadFile } from "../lib/pinata.js";
import { Concurrency } from "../lib/fetchWithRetry.js";
import { collectionDir, loadState, recordStep, saveState } from "../lib/state.js";

const CONCURRENCY = 2;

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: node scripts/04-pin-media.js <slug>");
    process.exit(1);
  }

  const state = loadState(slug);
  if (!state.discovered) throw new Error(`Run 01-discover.js ${slug} first.`);

  const mediaDir = join(collectionDir(slug), "media");
  if (!existsSync(mediaDir)) throw new Error(`Run 03-download-media.js ${slug} first.`);

  const mediaPins = state.mediaPins || {};
  state.mediaPins = mediaPins;

  const files = readdirSync(mediaDir)
    .filter((f) => f !== ".DS_Store" && statSync(join(mediaDir, f)).isFile())
    .sort();

  const toPin = files.filter((f) => !mediaPins[f]?.cid);
  console.log(`Found ${files.length} media files; ${files.length - toPin.length} already pinned, ${toPin.length} to pin.`);

  if (toPin.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const gate = new Concurrency(CONCURRENCY);
  const errors = [];
  let done = 0;
  const start = Date.now();

  // Persist state every N files so a crash doesn't lose progress.
  let pendingFlush = 0;
  const flushEvery = 1;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Per-upload timeout. Pinata's SDK doesn't expose one and large files (>100MB)
  // can hang the request indefinitely under back-pressure; wrap each attempt in
  // a Promise.race with a hard deadline so a hung upload aborts instead of
  // blocking the whole script forever.
  const UPLOAD_TIMEOUT_MS = 15 * 60 * 1000; // 15 min — generous for 300MB uploads
  async function uploadWithTimeout(localPath, name) {
    return Promise.race([
      uploadFile(localPath, name),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`upload timeout after ${UPLOAD_TIMEOUT_MS / 1000}s`)), UPLOAD_TIMEOUT_MS)
      ),
    ]);
  }

  async function pinWithRetry(f, maxAttempts = 4) {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await uploadWithTimeout(join(mediaDir, f), f);
      } catch (e) {
        lastErr = e;
        if (attempt < maxAttempts) {
          const delay = 2000 * attempt;
          console.log(`  retry ${attempt}/${maxAttempts - 1} for ${f.slice(0, 12)}... in ${delay / 1000}s (${e.message})`);
          await sleep(delay);
        }
      }
    }
    throw lastErr;
  }

  function fmtBytes(n) {
    if (n >= 1024 * 1024 * 1024) return (n / 1024 / 1024 / 1024).toFixed(2) + " GB";
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + " MB";
    if (n >= 1024) return (n / 1024).toFixed(1) + " KB";
    return n + " B";
  }

  await Promise.all(
    toPin.map((f) =>
      gate.run(async () => {
        try {
          const fileSize = statSync(join(mediaDir, f)).size;
          const t0 = Date.now();
          console.log(`  [${done + 1}/${toPin.length}] starting ${f.slice(0, 12)}... (${fmtBytes(fileSize)})`);
          const res = await pinWithRetry(f);
          const elapsed = (Date.now() - t0) / 1000;
          const mbps = (fileSize / 1024 / 1024) / elapsed;
          mediaPins[f] = { cid: res.cid, size: res.size, pinnedAt: res.pinnedAt };
          done++;
          pendingFlush++;
          if (pendingFlush >= flushEvery) {
            saveState(slug, state);
            pendingFlush = 0;
          }
          console.log(`  [${done}/${toPin.length}] DONE  ${f.slice(0, 12)}... (${fmtBytes(fileSize)}) in ${elapsed.toFixed(1)}s = ${mbps.toFixed(1)} MB/s → ${res.cid}`);
        } catch (e) {
          errors.push({ file: f, error: e.message });
          console.log(`  [FAIL] ${f.slice(0, 12)}... — ${e.message}`);
        }
      })
    )
  );

  saveState(slug, state);

  console.log(`\nPinned ${done}/${toPin.length}; errors: ${errors.length}`);
  if (errors.length > 0) {
    writeFileSync(join(collectionDir(slug), "04-pin-errors.json"), JSON.stringify(errors, null, 2));
    console.error(`Errors written to 04-pin-errors.json`);
    process.exit(1);
  }

  recordStep(slug, "04-pin-media", {
    totalFiles: files.length,
    newlyPinned: done,
    errors: errors.length,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
