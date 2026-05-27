// Step 01 — Discover.
// Input:  slug + entry in collections.json
// Output: state.discovered = { contract, name, symbol, totalSupply, owner, contractCreator,
//                              tokenIndexBase (0 or 1), tokenUriSample, setter, skipReason }
// Why detect tokenIndexBase at runtime: some Proof contracts are 0-indexed
// (Grails V starts at tokenURI(0)), others are 1-indexed — we don't assume.
// Why setter detection: each contract may use setBaseTokenURI / setBaseURI / setURI / etc.;
// reading the ABI tells us the exact signature to call.
// Why skipReason="artblocks": if tokenURI resolves to an artblocks.io host, the art is
// dynamically rendered and a static pin would freeze it (see README → "Why Grails IV is skipped").
import { getCollection } from "../lib/opensea.js";
import { name, symbol, totalSupply, owner, tokenURI, baseURI, getContractCreator } from "../lib/alchemy.js";
import { getAbi, detectUriSetter } from "../lib/etherscan.js";
import { getCollectionConfig, recordStep, updateState } from "../lib/state.js";

const ARTBLOCKS_HOST_SUFFIXES = ["artblocks.io"]; // matches token.artblocks.io, generator.artblocks.io, media-proxy.artblocks.io

function hostOf(url) {
  if (!url) return null;
  try { return new URL(url).hostname; } catch { return null; }
}

export function isArtblocks(url) {
  const h = hostOf(url);
  return !!h && ARTBLOCKS_HOST_SUFFIXES.some((s) => h.endsWith(s));
}

async function detectIndexBase(addr) {
  const t0 = await tokenURI(addr, 0);
  if (t0) return { base: 0, sample: t0 };
  const t1 = await tokenURI(addr, 1);
  if (t1) return { base: 1, sample: t1 };
  return { base: null, sample: null };
}

// Sample evenly across the id range to detect mixed hosting (e.g., some tokens
// on metadata.proof.xyz, others on token.artblocks.io). Returns a host -> count map.
async function sampleHostDistribution(contract, base, total, samples = 30) {
  const ids = [];
  const N = Math.min(samples, total);
  for (let i = 0; i < N; i++) ids.push(base + Math.floor((i / Math.max(1, N - 1)) * (total - 1)));
  const out = await Promise.all(ids.map((id) => tokenURI(contract, id).then((u) => hostOf(u))));
  const dist = {};
  for (const h of out) dist[h || "(null)"] = (dist[h || "(null)"] || 0) + 1;
  return dist;
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: node scripts/01-discover.js <slug>");
    process.exit(1);
  }

  const cfg = getCollectionConfig(slug);
  console.log(`Discovering ${cfg.name} (${slug})...`);

  let contract = cfg.contract;
  let osData = null;
  if (!contract) {
    console.log(`  resolving contract from OpenSea slug...`);
    osData = await getCollection(slug);
    contract = osData.primaryContract;
    if (!contract) throw new Error(`Could not resolve contract for slug ${slug}`);
  }
  console.log(`  contract: ${contract}`);

  const [collectionName, collectionSymbol, supply, ownerAddr, indexInfo, creator, currentBase] =
    await Promise.all([
      name(contract),
      symbol(contract),
      totalSupply(contract),
      owner(contract),
      detectIndexBase(contract),
      getContractCreator(contract),
      baseURI(contract),
    ]);

  // Per-token mixed-routing detection: sample across the range. We DO NOT skip
  // the whole contract just because tokenURI(0) is artblocks — many Proof contracts
  // are mixed and we want to pin the Proof-hosted subset.
  const hostDistribution = supply
    ? await sampleHostDistribution(contract, indexInfo.base ?? 0, supply)
    : {};
  const sampleSize = Object.values(hostDistribution).reduce((a, b) => a + b, 0);
  const artblocksSamples = Object.entries(hostDistribution)
    .filter(([h]) => ARTBLOCKS_HOST_SUFFIXES.some((s) => h.endsWith(s)))
    .reduce((a, [, n]) => a + n, 0);
  const allArtblocks = sampleSize > 0 && artblocksSamples === sampleSize;
  const skipReason = allArtblocks ? "artblocks (all sampled tokens)" : null;

  let abi = null;
  let setter = null;
  try {
    abi = await getAbi(contract);
    setter = detectUriSetter(abi);
  } catch (e) {
    console.warn(`  WARN: Etherscan ABI fetch failed: ${e.message}`);
  }

  const discovered = {
    slug,
    contract,
    chain: cfg.chain || "ethereum",
    name: collectionName,
    symbol: collectionSymbol,
    totalSupply: supply,
    owner: ownerAddr,
    contractCreator: creator,
    tokenIndexBase: indexInfo.base,
    tokenUriSample: indexInfo.sample,
    currentBaseTokenURI: currentBase,
    hostDistribution,
    artblocksFraction: sampleSize ? artblocksSamples / sampleSize : 0,
    setter,
    skipReason,
    discoveredAt: new Date().toISOString(),
  };

  updateState(slug, { discovered });
  recordStep(slug, "01-discover", { contract, skipReason });

  console.log("\nDiscovered:");
  console.log(JSON.stringify(discovered, null, 2));

  if (skipReason) {
    console.log(`\n[SKIP] ${slug} → reason: ${skipReason}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
