// Step 06 — Pin the rewritten metadata directory.
// One Pinata directory upload of collections/<slug>/ipfs-metadata/ → one CID.
// That CID is the new baseURI: `ipfs://<metadataCID>/`.
// Records state.metadataPin = { cid, fileCount, size, ... }.
// IMPORTANT: must saveState() before recordStep() (recordStep reloads from disk).
import { join } from "node:path";
import { existsSync } from "node:fs";
import { uploadDir } from "../lib/pinata.js";
import { collectionDir, loadState, recordStep, saveState } from "../lib/state.js";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: node scripts/06-pin-metadata.js <slug>");
    process.exit(1);
  }

  const state = loadState(slug);
  if (!state.mediaPins || Object.keys(state.mediaPins).length === 0) {
    throw new Error(`Run 04-pin-media.js ${slug} first.`);
  }
  if (state.metadataPin?.cid) {
    console.log(`Already pinned: ${state.metadataPin.cid}`);
    return;
  }

  const dir = join(collectionDir(slug), "ipfs-metadata");
  if (!existsSync(dir)) throw new Error(`Run 05-rewrite-metadata.js ${slug} first.`);

  console.log(`Pinning metadata for ${slug}...`);
  const result = await uploadDir(dir, `${slug}-metadata`);
  console.log(`\nMetadata pinned:`);
  console.log(`  CID: ${result.cid}`);
  console.log(`  Files: ${result.fileCount}`);
  console.log(`  Size: ${(result.size / 1024).toFixed(1)} KB`);
  console.log(`  Gateway: ${result.gatewayUrl}`);

  state.metadataPin = result;
  saveState(slug, state);
  recordStep(slug, "06-pin-metadata", { cid: result.cid, fileCount: result.fileCount });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
