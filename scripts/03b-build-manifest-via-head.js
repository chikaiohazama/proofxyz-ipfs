// One-off helper for the Grails III recovery: signed GCS URLs expire in 30 min,
// so re-downloading 715 unique URLs after a fresh metadata fetch is too slow to
// finish in the window. But we already have all 109 unique-content media files
// on disk (sha256-named). This script:
//
//   1. Computes MD5 of every on-disk media file → md5 → sha256-filename map.
//   2. For each unique image/animation/etc. URL in the fresh metadata, issues a
//      HEAD request to GCS. The response includes `x-goog-stored-content-md5`
//      (base64 MD5 of the object's bytes). Look that up → which local file
//      represents this URL's content.
//   3. Writes media-manifest.json mapping tokenId → field → local-filename.
//
// No bytes downloaded (HEAD only), so it finishes in seconds even for thousands
// of URLs. Designed to recover from the "step 03 ran while signed URLs expired"
// scenario; future runs of the pipeline could integrate this as an optimisation
// for redo-from-cache flows.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Concurrency, fetchWithRetry } from "../lib/fetchWithRetry.js";
import { collectionDir } from "../lib/state.js";

const MEDIA_FIELDS = ["image", "animation_url", "primary_asset_url", "preview_asset_url"];
const CONCURRENCY = 16;

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: node scripts/03b-build-manifest-via-head.js <slug>");
    process.exit(1);
  }
  const cdir = collectionDir(slug);
  const mediaDir = join(cdir, "media");
  const metaDir = join(cdir, "original-metadata");

  // Step 1: md5 every local file
  console.log("Computing MD5 for local media files...");
  const localFiles = readdirSync(mediaDir).filter((f) => statSync(join(mediaDir, f)).isFile());
  const md5ToFile = new Map();
  for (const f of localFiles) {
    const buf = readFileSync(join(mediaDir, f));
    const md5b64 = createHash("md5").update(buf).digest("base64");
    md5ToFile.set(md5b64, f);
  }
  console.log("  hashed " + localFiles.length + " files; " + md5ToFile.size + " unique MD5s");

  // Step 2: collect all (token, field, url) tuples; dedup URLs by full string
  const tokens = readdirSync(metaDir).sort((a, b) => Number(a) - Number(b));
  const perToken = {};
  const urlIndex = new Map(); // url -> { ids: Set<tokenId>, fields: Set<field> }
  for (const t of tokens) {
    const m = JSON.parse(readFileSync(join(metaDir, t), "utf8"));
    perToken[t] = {};
    for (const field of MEDIA_FIELDS) {
      const url = m[field];
      if (!url || typeof url !== "string" || !url.startsWith("http")) continue;
      perToken[t][field] = url;
      if (!urlIndex.has(url)) urlIndex.set(url, { ids: new Set([t]), fields: new Set([field]) });
      else {
        urlIndex.get(url).ids.add(t);
        urlIndex.get(url).fields.add(field);
      }
    }
  }
  console.log("Tokens: " + tokens.length + ", unique media URLs: " + urlIndex.size);

  // Step 3: HEAD each URL, extract Content-MD5, map to local file
  console.log("HEAD-fetching to resolve URL → MD5 → local filename...");
  const urlToFile = new Map();
  const errors = [];
  const gate = new Concurrency(CONCURRENCY);
  let done = 0;
  const start = Date.now();

  await Promise.all(
    [...urlIndex.keys()].map((url) =>
      gate.run(async () => {
        try {
          const res = await fetchWithRetry(url, { method: "HEAD" }, { retries: 2, timeout: 20000 });
          const md5 = res.headers.get("x-goog-hash") || res.headers.get("content-md5") || "";
          const m = md5.match(/md5=([A-Za-z0-9+/=]+)/);
          const md5b64 = m ? m[1] : (md5.includes("=") ? md5 : null);
          if (md5b64 && md5ToFile.has(md5b64)) urlToFile.set(url, md5ToFile.get(md5b64));
          else errors.push({ url: url.slice(0, 80), md5: md5b64, reason: md5b64 ? "no local file matches md5" : "no md5 header" });
        } catch (e) {
          errors.push({ url: url.slice(0, 80), reason: e.message });
        }
        done++;
        if (done % 50 === 0) {
          const rate = (done / ((Date.now() - start) / 1000)).toFixed(1);
          console.log("  " + done + "/" + urlIndex.size + " (" + rate + "/s)");
        }
      })
    )
  );

  console.log("Resolved " + urlToFile.size + " URLs; " + errors.length + " errors");

  // Step 4: write manifest
  const manifest = {};
  let mappedFields = 0;
  let unmappedFields = 0;
  for (const [id, fields] of Object.entries(perToken)) {
    manifest[id] = {};
    for (const [field, url] of Object.entries(fields)) {
      const file = urlToFile.get(url);
      if (file) {
        manifest[id][field] = file;
        mappedFields++;
      } else {
        unmappedFields++;
      }
    }
  }
  writeFileSync(join(cdir, "media-manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("Wrote manifest. fields mapped: " + mappedFields + ", unmapped: " + unmappedFields);

  if (errors.length > 0) {
    writeFileSync(join(cdir, "03b-head-errors.json"), JSON.stringify(errors.slice(0, 100), null, 2));
    console.log("First 100 errors written to 03b-head-errors.json");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
