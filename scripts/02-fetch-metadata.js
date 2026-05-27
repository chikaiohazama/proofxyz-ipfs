// Step 02 — Fetch original metadata.
// For each token id in [base, base+totalSupply), call tokenURI(id) on-chain and
// fetch the resulting URL into collections/<slug>/original-metadata/<id> (no extension).
// Why call tokenURI per token (not template the URL): some contracts have per-token
// overrides; reading per-id is correct and only 1 RPC per token.
// Idempotent: skips ids whose file is already on disk.
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tokenURI } from "../lib/alchemy.js";
import { fetchWithRetry, Concurrency } from "../lib/fetchWithRetry.js";
import { collectionDir, loadState, recordStep, saveState } from "../lib/state.js";

const ARTBLOCKS_HOST_SUFFIX = "artblocks.io";

function isArtblocksUrl(url) {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith(ARTBLOCKS_HOST_SUFFIX);
  } catch {
    return false;
  }
}

const RPC_CONCURRENCY = 8;
const HTTP_CONCURRENCY = 12;

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: node scripts/02-fetch-metadata.js <slug>");
    process.exit(1);
  }

  const state = loadState(slug);
  const d = state.discovered;
  if (!d) throw new Error(`Run 01-discover.js ${slug} first.`);
  if (d.skipReason) {
    console.log(`Skipping ${slug}: ${d.skipReason}`);
    return;
  }
  if (d.totalSupply == null || d.tokenIndexBase == null) {
    throw new Error(`Missing totalSupply or tokenIndexBase in state for ${slug}.`);
  }

  const outDir = join(collectionDir(slug), "original-metadata");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const base = d.tokenIndexBase;
  const end = base + d.totalSupply;
  const ids = [];
  for (let i = base; i < end; i++) ids.push(i);

  console.log(`Fetching metadata for ${ids.length} tokens (ids ${base}..${end - 1})`);

  const rpcGate = new Concurrency(RPC_CONCURRENCY);
  const httpGate = new Concurrency(HTTP_CONCURRENCY);
  const errors = [];
  let done = 0;
  let skippedExisting = 0;
  const skippedArtblocksIds = [];

  await Promise.all(
    ids.map((id) =>
      (async () => {
        const outPath = join(outDir, String(id));
        if (existsSync(outPath)) {
          skippedExisting++;
          done++;
          return;
        }
        try {
          const uri = await rpcGate.run(() => tokenURI(d.contract, id));
          if (!uri) throw new Error(`tokenURI(${id}) returned null`);
          // Per-token Art Blocks skip: contract-level routing sends some ids to
          // token.artblocks.io which renders dynamically — we cannot pin those.
          // The rest of the pipeline naturally handles a sparse id set.
          if (isArtblocksUrl(uri)) {
            skippedArtblocksIds.push(id);
            done++;
            if (done % 50 === 0) console.log(`  ${done}/${ids.length} (existing ${skippedExisting}, artblocks-skipped ${skippedArtblocksIds.length})`);
            return;
          }
          const res = await httpGate.run(() =>
            fetchWithRetry(uri, { headers: { accept: "application/json" } })
          );
          const buf = Buffer.from(await res.arrayBuffer());
          writeFileSync(outPath, buf);
          done++;
          if (done % 50 === 0) console.log(`  ${done}/${ids.length} (existing ${skippedExisting}, artblocks-skipped ${skippedArtblocksIds.length})`);
        } catch (e) {
          errors.push({ id, error: e.message });
        }
      })()
    )
  );

  console.log(`\nFetched ${done - skippedExisting - skippedArtblocksIds.length} new, ${skippedExisting} existing, ${skippedArtblocksIds.length} artblocks-skipped, ${errors.length} failed.`);

  // Persist the artblocks-skipped id list so downstream steps and the eventual
  // INSTRUCTIONS.md can mention exactly which token ids are unaffected by the
  // baseURI flip (contract logic keeps routing them to token.artblocks.io).
  state.skippedArtblocksIds = skippedArtblocksIds.sort((a, b) => a - b);
  saveState(slug, state);

  if (errors.length > 0) {
    const errFile = join(collectionDir(slug), "02-fetch-errors.json");
    writeFileSync(errFile, JSON.stringify(errors, null, 2));
    console.error(`Errors written to ${errFile}`);
  }

  // sanity: parse one file as JSON to confirm it's valid
  const sampleId = ids[Math.floor(ids.length / 2)];
  const samplePath = join(outDir, String(sampleId));
  if (existsSync(samplePath)) {
    const sample = JSON.parse(readFileSync(samplePath, "utf8"));
    console.log(`\nSample token #${sampleId}:`);
    console.log(`  name: ${sample.name}`);
    console.log(`  image: ${sample.image}`);
    if (sample.animation_url) console.log(`  animation_url: ${sample.animation_url}`);
  }

  recordStep(slug, "02-fetch-metadata", {
    fetched: done - skippedExisting - skippedArtblocksIds.length,
    skippedExisting,
    skippedArtblocks: skippedArtblocksIds.length,
    failed: errors.length,
    totalRequested: ids.length,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
