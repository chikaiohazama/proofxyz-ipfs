// Step 05 — Rewrite metadata to point at ipfs:// CIDs.
// Reads each original metadata JSON, looks up the per-file CIDs from state.mediaPins
// (via media-manifest.json) and replaces image / animation_url / primary_asset_url /
// preview_asset_url with `ipfs://<that-file's-CID>` (NO path suffix — each CID is a file).
// Output JSON files are named by tokenId with no extension (e.g. "0", "1", ..., "784")
// so the contract's existing tokenURI = baseURI + Strings.toString(tokenId) still works
// as a drop-in replacement after baseURI flips to `ipfs://<metadataCID>/`.
// Why generator_url is preserved as-is: it's the Art Blocks live HTML renderer.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { collectionDir, loadState, recordStep } from "../lib/state.js";

const MEDIA_FIELDS = ["image", "animation_url", "primary_asset_url", "preview_asset_url"];

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: node scripts/05-rewrite-metadata.js <slug>");
    process.exit(1);
  }

  const state = loadState(slug);
  if (!state.mediaPins || Object.keys(state.mediaPins).length === 0) {
    throw new Error(`Run 04-pin-media.js ${slug} first (no per-file media pins in state).`);
  }
  const mediaPins = state.mediaPins;

  const cdir = collectionDir(slug);
  const manifest = JSON.parse(readFileSync(join(cdir, "media-manifest.json"), "utf8"));
  const origDir = join(cdir, "original-metadata");
  const outDir = join(cdir, "ipfs-metadata");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const tokens = readdirSync(origDir).sort((a, b) => Number(a) - Number(b));
  let rewritten = 0;
  let unchanged = 0;
  const issues = [];

  for (const t of tokens) {
    const orig = JSON.parse(readFileSync(join(origDir, t), "utf8"));
    const tokenManifest = manifest[t] || {};
    const out = { ...orig };
    let changed = false;
    for (const field of MEDIA_FIELDS) {
      if (out[field] && tokenManifest[field]) {
        const fname = tokenManifest[field];
        const pin = mediaPins[fname];
        if (!pin?.cid) {
          issues.push({ id: t, field, file: fname, reason: "media file not yet pinned" });
          continue;
        }
        out[field] = `ipfs://${pin.cid}`;
        changed = true;
      } else if (out[field] && !tokenManifest[field]) {
        issues.push({ id: t, field, originalUrl: out[field], reason: "no manifest entry" });
      }
    }
    // Pretty-print JSON to a stable format
    writeFileSync(join(outDir, t), JSON.stringify(out, null, 2));
    if (changed) rewritten++;
    else unchanged++;
  }

  console.log(`Rewrote ${rewritten} tokens, ${unchanged} unchanged.`);
  if (issues.length > 0) {
    console.warn(`${issues.length} fields had no manifest entry; see issues file.`);
    writeFileSync(join(cdir, "05-rewrite-issues.json"), JSON.stringify(issues, null, 2));
  }

  // Sanity print
  const sampleId = tokens[Math.floor(tokens.length / 2)];
  const sample = JSON.parse(readFileSync(join(outDir, sampleId), "utf8"));
  console.log(`\nSample rewritten token #${sampleId}:`);
  console.log(`  image: ${sample.image}`);
  if (sample.primary_asset_url) console.log(`  primary_asset_url: ${sample.primary_asset_url}`);

  recordStep(slug, "05-rewrite-metadata", {
    rewritten,
    unchanged,
    issues: issues.length,
    uniqueMediaPins: Object.keys(mediaPins).length,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
