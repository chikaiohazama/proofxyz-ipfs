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

const ARTBLOCKS_HOSTS = ["artblocks.io", "art-blocks.io", "generator.artblocks.io"];

function isArtblocks(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return ARTBLOCKS_HOSTS.some((h) => u.hostname.endsWith(h));
  } catch {
    return false;
  }
}

async function detectIndexBase(addr) {
  const t0 = await tokenURI(addr, 0);
  if (t0) return { base: 0, sample: t0 };
  const t1 = await tokenURI(addr, 1);
  if (t1) return { base: 1, sample: t1 };
  return { base: null, sample: null };
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

  const skipReason = isArtblocks(indexInfo.sample) ? "artblocks" : null;

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
