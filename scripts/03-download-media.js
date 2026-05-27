// Step 03 — Download media.
// Parses every original metadata JSON; extracts URLs from image, animation_url,
// primary_asset_url, preview_asset_url; downloads each unique URL exactly once
// into collections/<slug>/media/<sha256>.<ext>.
// Why sha256-named files: content-addressed dedup. Grails V has heavy edition-sharing
// (785 tokens → 202 unique files); naming by content collapses duplicates on disk
// AND again at the IPFS layer (identical bytes always hash to the same CID).
// Why generator_url is excluded: it's the Art Blocks live HTML renderer, not a static asset.
// Writes a manifest at collections/<slug>/media-manifest.json mapping tokenId → field → localFile.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { extname, join } from "node:path";
import { URL } from "node:url";
import { fetchWithRetry, Concurrency } from "../lib/fetchWithRetry.js";
import { collectionDir, loadState, recordStep } from "../lib/state.js";

const HTTP_CONCURRENCY = 8;

// Fields in metadata that we pin. `generator_url` is excluded because it's
// an Art Blocks live HTML renderer, not a static asset.
const MEDIA_FIELDS = ["image", "animation_url", "primary_asset_url", "preview_asset_url"];

function extFromUrl(url, fallback = ".bin") {
  try {
    const path = new URL(url).pathname;
    const e = extname(path).toLowerCase();
    return e || fallback;
  } catch {
    return fallback;
  }
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: node scripts/03-download-media.js <slug>");
    process.exit(1);
  }

  const state = loadState(slug);
  if (!state.discovered) throw new Error(`Run 01-discover.js ${slug} first.`);

  const metaDir = join(collectionDir(slug), "original-metadata");
  const mediaDir = join(collectionDir(slug), "media");
  if (!existsSync(mediaDir)) mkdirSync(mediaDir, { recursive: true });
  const tmpDir = join(mediaDir, ".tmp");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  // Build per-token media map and a deduped URL → role list
  const tokens = readdirSync(metaDir).sort((a, b) => Number(a) - Number(b));
  const perToken = {}; // tokenId -> { field: url, ... }
  const urlIndex = new Map(); // url -> { fields: Set, ids: Set, ext, status: 'pending'|'done' }
  for (const t of tokens) {
    const m = JSON.parse(readFileSync(join(metaDir, t), "utf8"));
    perToken[t] = {};
    for (const field of MEDIA_FIELDS) {
      const url = m[field];
      if (!url || typeof url !== "string" || !url.startsWith("http")) continue;
      perToken[t][field] = url;
      if (!urlIndex.has(url)) {
        urlIndex.set(url, {
          fields: new Set([field]),
          ids: new Set([t]),
          ext: extFromUrl(url),
        });
      } else {
        urlIndex.get(url).fields.add(field);
        urlIndex.get(url).ids.add(t);
      }
    }
  }

  console.log(`Tokens: ${tokens.length}, unique media URLs: ${urlIndex.size}`);

  const gate = new Concurrency(HTTP_CONCURRENCY);
  const urlToHash = {}; // url -> "<sha256>.<ext>"
  const errors = [];
  let downloaded = 0;
  let deduped = 0;

  await Promise.all(
    [...urlIndex.entries()].map(([url, info]) =>
      gate.run(async () => {
        try {
          const res = await fetchWithRetry(url, {}, { timeout: 90000 });
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length === 0) throw new Error("Empty body");
          const hash = sha256(buf);
          const fname = `${hash}${info.ext}`;
          const finalPath = join(mediaDir, fname);
          if (existsSync(finalPath)) {
            deduped++;
          } else {
            const tmp = join(tmpDir, `${hash}${info.ext}`);
            writeFileSync(tmp, buf);
            renameSync(tmp, finalPath);
            downloaded++;
          }
          urlToHash[url] = fname;
          const total = downloaded + deduped;
          if (total % 25 === 0) {
            console.log(`  ${total}/${urlIndex.size} (downloaded ${downloaded}, deduped ${deduped})`);
          }
        } catch (e) {
          errors.push({ url, ids: [...info.ids], error: e.message });
        }
      })
    )
  );

  // Clean up tmp dir
  try {
    for (const f of readdirSync(tmpDir)) unlinkSync(join(tmpDir, f));
  } catch {}

  // Write manifest: per-token → { field: localFilename }
  const manifest = {};
  let missing = 0;
  for (const [id, fields] of Object.entries(perToken)) {
    manifest[id] = {};
    for (const [field, url] of Object.entries(fields)) {
      const local = urlToHash[url];
      if (local) manifest[id][field] = local;
      else missing++;
    }
  }
  const manifestPath = join(collectionDir(slug), "media-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`\nDownloaded ${downloaded}, deduped ${deduped}, missing assignments ${missing}, errors ${errors.length}`);
  if (errors.length > 0) {
    const errFile = join(collectionDir(slug), "03-download-errors.json");
    writeFileSync(errFile, JSON.stringify(errors, null, 2));
    console.error(`Errors written to ${errFile}`);
  }

  recordStep(slug, "03-download-media", {
    uniqueUrls: urlIndex.size,
    downloaded,
    deduped,
    failed: errors.length,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
