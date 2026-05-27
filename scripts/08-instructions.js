// Step 08 — Emit collections/<slug>/INSTRUCTIONS.md.
// Renders a human-readable hand-off doc for Proof engineers: contract, function,
// exact argument (`ipfs://<metadataCID>/`), Etherscan deep links, cast & ethers.js
// sample calls, pre-flight checklist, and a one-line revert plan.
// Read state.metadataPin and state.discovered; emits markdown only — no on-chain effects.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { collectionDir, loadState, recordStep } from "../lib/state.js";

function render(state) {
  const d = state.discovered;
  const mediaPins = state.mediaPins || {};
  const mediaPinCount = Object.keys(mediaPins).length;
  const metadataCID = state.metadataPin?.cid;
  const setter = d.setter;
  const newBaseURI = `ipfs://${metadataCID}/`;
  const setterCall = setter
    ? `${setter.name}("${newBaseURI}")`
    : `<setter not auto-detected — verify manually on Etherscan>`;

  const ownerLine = d.owner
    ? `**Caller required:** \`owner()\` = \`${d.owner}\``
    : `**Caller required:** contract uses AccessControl (no public \`owner()\`). Verify the required role on Etherscan before calling (typically \`DEFAULT_ADMIN_ROLE\` or a steering/admin role).`;

  const etherscanWrite = `https://etherscan.io/address/${d.contract}#writeContract`;
  const etherscanRead = `https://etherscan.io/address/${d.contract}#readContract`;

  return `# ${d.name} — IPFS migration instructions

## Summary

| Field | Value |
|---|---|
| Collection | ${d.name} (${d.symbol || "—"}) |
| Contract | \`${d.contract}\` |
| Chain | ${state.discovered.chain || "ethereum"} |
| Total supply | ${d.totalSupply} (tokens ${d.tokenIndexBase}..${d.tokenIndexBase + d.totalSupply - 1}, **${d.tokenIndexBase}-indexed**) |
| Deployer | \`${d.contractCreator}\` |
| Current baseURI sample | \`${d.tokenUriSample}\` |
| Current \`baseTokenURI()\` | \`${d.currentBaseTokenURI ?? "(read from Etherscan before sending — needed for revert)"}\` |
| New baseURI | \`${newBaseURI}\` |
| Metadata CID (directory pin) | \`${metadataCID}\` |
| Media pins | ${mediaPinCount} files, each pinned with its own CID (see \`state.json\` → \`mediaPins\` for the full map) |

## The change

Call **\`${setterCall}\`** on contract \`${d.contract}\`.

After the change, \`tokenURI(${d.tokenIndexBase})\` will return \`${newBaseURI}${d.tokenIndexBase}\` — i.e. it will resolve to:

\`https://gateway.pinata.cloud/ipfs/${metadataCID}/${d.tokenIndexBase}\`

Each metadata file's \`image\` (and any other media-shaped field) has been rewritten to \`ipfs://<per-file-CID>\` — each media file was pinned individually so each has its own content-addressed root CID.

${ownerLine}

## Pre-flight checklist

- [ ] Confirm the caller has the required role/ownership on \`${d.contract}\`.
- [ ] Re-fetch \`tokenURI(${d.tokenIndexBase})\` *now* via Etherscan Read Contract and capture the existing baseURI for a possible revert.
- [ ] Pull this CID through several public gateways and spot-check 3 tokens before sending the tx:
  - \`https://gateway.pinata.cloud/ipfs/${metadataCID}/${d.tokenIndexBase}\`
  - \`https://ipfs.io/ipfs/${metadataCID}/${d.tokenIndexBase}\`
  - \`https://dweb.link/ipfs/${metadataCID}/${d.tokenIndexBase}\`
- [ ] Run the OpenSea metadata refresh on a single token after the tx lands; confirm it picks up the new \`ipfs://\` image. Then trigger a collection-wide refresh.

## How to call

**Etherscan Write Contract** (connect the owning wallet): ${etherscanWrite}

**Cast / forge:**

\`\`\`bash
cast send ${d.contract} "${setter ? setter.signature : "<signature>"}" "${newBaseURI}" \\
  --rpc-url <RPC> --private-key <KEY>
\`\`\`

**ethers.js v6:**

\`\`\`js
const c = new ethers.Contract("${d.contract}", [
  "function ${setter ? setter.signature : "<signature>"}"
], wallet);
await c.${setter ? setter.name : "<fn>"}("${newBaseURI}");
\`\`\`

## Revert plan

If anything is wrong, call the same setter with the **previous** baseURI captured at the time of generation:

\`\`\`
${setter ? setter.name : "<setter>"}("${d.currentBaseTokenURI ?? "<previous baseTokenURI — read from Etherscan first>"}")
\`\`\`

The change is fully reversible — no state migration, just a string replacement.

## Read-contract URL (for sanity checks before & after)

${etherscanRead}

---

_Generated ${new Date().toISOString()} by proofxyz-ipfs pipeline. Verification report (sha256 round-trip vs the pin) is in this collection's directory at \`verification-report.json\`._
`;
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: node scripts/08-instructions.js <slug>");
    process.exit(1);
  }

  const state = loadState(slug);
  if (!state.metadataPin?.cid) throw new Error(`Run earlier steps first.`);

  const md = render(state);
  const out = join(collectionDir(slug), "INSTRUCTIONS.md");
  writeFileSync(out, md);
  console.log(`Wrote ${out}`);
  recordStep(slug, "08-instructions", { path: out });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
