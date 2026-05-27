# proofxyz-ipfs

Mirror Proof Collective art-drop metadata and media to IPFS so each collection's `tokenURI` no longer depends on Proof's centralized hosts (`metadata.proof.xyz`, `media.proof.xyz`, time-limited Google Cloud signed URLs). The pipeline produces, per collection, an `INSTRUCTIONS.md` file telling Proof engineers exactly which on-chain function to call to flip the `baseURI` to IPFS.

## TL;DR for Proof engineers

If you're here to flip a collection's baseURI to the IPFS pin we've prepared, you do **three things**:

1. **Review.** Open the collection's `collections/<slug>/INSTRUCTIONS.md`. It contains the contract, function, exact argument string, and the Etherscan links. Today only `grails-v` is ready — [`collections/grails-v/INSTRUCTIONS.md`](collections/grails-v/INSTRUCTIONS.md).
2. **Dry-run verify.** Click 2–3 of the gateway URLs in the pre-flight checklist (`gateway.pinata.cloud`, `ipfs.io`, `dweb.link`) and confirm the JSON loads and its `image` ipfs CID resolves to the right media. Optional but recommended: run `node scripts/07-verify.js <slug>` yourself — it sha256-compares every pinned file against the local copy and writes a pass/fail report.
3. **Send the tx.** Connect the admin/owner wallet to the Etherscan "Write Contract" page linked in the instructions, paste the `ipfs://...` argument, send. The change is one string and fully reversible by calling the same setter with the old value.

You do **not** need to run any of the data pipeline (steps 01–06) yourself — that's already been done and the resulting CIDs are committed in `collections/<slug>/state.json`. The scripts are documented in case you want to reproduce or audit.

## Why this exists

Proof's metadata server returns JSON whose `image` fields point at signed Google Cloud Storage URLs. The signatures on every URL in Grails V share the same `Expires` value — **all 732 image URLs expire on 2026-08-28**. Once that happens, the NFTs lose their art (the on-chain `tokenURI` returns a URL that 403s).

Pinning each media file to IPFS, rewriting the metadata to point at those CIDs, and pinning the rewritten metadata as a directory eliminates the dependency on Proof's hosts.

## Collections in scope

Art drops deployed (or controlled) by Proof. PFPs, passes, and membership tokens are explicitly out (Moonbirds, Oddities, Mythics, PROOF Pass — those are not "art" in this context).

| # | Collection | Contract | Tokens | Proof-hosted (est.) | Status |
|---|---|---|---:|---:|---|
| 1 | **Grails V** (prototype) | [`0x92a50…349b8`](https://etherscan.io/address/0x92a50fe6ede411bd26e171b97472e24d245349b8) | 785 | ~732 (~93%) | ✅ pinned & verified |
| 2 | Grails IV | [`0x069ee…b8885`](https://etherscan.io/address/0x069eeda3395242bd0d382e3ec5738704569b8885) | 904 | ~750 (~83%) | to do |
| 3 | **Grails III** | [`0x503a3…84A3`](https://etherscan.io/address/0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3) | 1,000 | 1,000 (100%) | to do |
| 4 | Grails II | [`0xd78af…ed96b`](https://etherscan.io/address/0xd78afb925a21f87fa0e35abae2aead3f70ced96b) | 1,178 | 1,178 (100%) | to do |
| 5 | Grails I | [`0xb6329…b2b19`](https://etherscan.io/address/0xb6329bd2741c4e5e91e26c4e653db643e74b2b19) | 1,036 | 1,036 (100%) | to do |
| 6 | Diamond Exhibition | [`0x68d0f…eec2e`](https://etherscan.io/address/0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e) | 5,093 | ~1,170 (~23%) | to do |
| 7 | Archive of Feelings (Mika Tajima) | [`0x24607…13762`](https://etherscan.io/address/0x24607c7602e52ce6b1ab4ae7b5196e9ae4c13762) | 1,152 | 1,152 (100%) | to do |
| 8 | PROOF Curated: Evolving Pixels | [`0x48b17…502b7`](https://etherscan.io/address/0x48b17a2c46007471b3eb72d16268eaecdd1502b7) | 891 | ~360 (~40%) | to do |
| 9 | The Journey | [`0xd5386…1900b`](https://etherscan.io/address/0xd5386794f57697ab4ecb930b049da70fc771900b) | 96 | 96 (100%) | to do |

### How Art Blocks tokens are handled

Several Proof contracts have **mixed per-token routing**: some token ids resolve through `baseTokenURI` to a Proof-hosted JSON (mirrorable), others are routed inside `tokenURI(uint256)` directly to `token.artblocks.io/...` (rendered dynamically by Art Blocks — not pinnable). The two cases visible above:

- **Grails IV** — ~17% of tokens route to Art Blocks.
- **Diamond Exhibition** — ~77% of tokens route to Art Blocks.

The pipeline does **per-token filtering** at fetch time (`scripts/02-fetch-metadata.js`): if `new URL(tokenURI(id)).hostname.endsWith("artblocks.io")`, the id is skipped and recorded in `state.skippedArtblocksIds`. The rest of the pipeline then only sees the Proof-hosted subset, so `ipfs-metadata/` ends up with files for those ids only (e.g., `100`, `877`, `1580` rather than every id).

When Proof flips `baseTokenURI` to `ipfs://<metadataCID>/`, the contract's own per-id routing keeps Art Blocks tokens unaffected — their URLs are derived inside `tokenURI(uint256)`, not from `baseTokenURI`. Only the Proof-hosted ids resolve through the new IPFS pin.

If a contract is detected as **all** Art Blocks (every sampled `tokenURI` resolves to an `artblocks.io` host) it's flagged `skipReason: "artblocks (all sampled tokens)"` and not processed — but mixed contracts are processed normally.

#### How the routing is encoded on-chain

Important detail for the engineers signing the tx: these Proof contracts do **not** expose a per-token writable URI override (no `setTokenURI(uint256, string)` function in the ABI). Routing is hardcoded inside `tokenURI(uint256)` and dispatches on the token's project type. There is no per-token mapping to misconfigure and no way for the baseURI flip to "leak" into an Art Blocks token.

Verified by reading the verified contract source on Sourcify:

**Diamond Exhibition** (`DiamondExhibition.sol`):

```solidity
function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    TokenInfo memory info = _tokenInfo(tokenId);
    if (projectType(info.projectId) == ProjectType.Curated) {
        return string.concat(_baseURI(), Strings.toString(tokenId));   // ← Proof-hosted branch (consults baseURI)
    }
    return flex.tokenURI(artblocksTokenID(_artblocksProjectId(info.projectId), info.edition));
    // ↑ Art Blocks branch — computes the URL via the Flex engine; never reads _baseURI()
}
```

**Grails IV** (`ABProjectPoolSellable.sol`, same base also used by Grails V and Evolving Pixels):

```solidity
function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    TokenInfo memory info = tokenInfo(tokenId);
    if (_isLongformProject(info.projectId)) {
        return flex.tokenURI(artblocksTokenID(_artblocksProjectId(info.projectId), info.edition));
        // ↑ Art Blocks branch — never touches baseURI
    }
    return super.tokenURI(tokenId);   // ← baseURI + tokenId (Proof-hosted branch)
}
```

**Concrete implication for the `setBaseTokenURI(...)` tx:**

| Token type | Where its URL comes from | Effect of the baseURI flip |
|---|---|---|
| Proof-routed (`Curated` / non-`Longform`) | `_baseURI() + tokenId` | Will return `ipfs://<newCID>/<tokenId>` after the flip — our pin |
| Art Blocks-routed (`Longform` / non-`Curated`) | `flex.tokenURI(...)` → `token.artblocks.io/...` | **Unchanged** — the function never reads `_baseURI()` for these |

**Post-flip sanity check** (5 minutes, no risk): on the contract's Etherscan Read Contract page, call `tokenURI(<an_art_blocks_id>)` and confirm it still returns `token.artblocks.io/...`; call `tokenURI(<a_proof_id>)` and confirm it now returns `ipfs://<newCID>/<id>`. Each collection's `INSTRUCTIONS.md` lists the AB-routed ids in `state.json` under `skippedArtblocksIds` so you have known ids to test with.

> **Note on Grails V's `media-proxy.artblocks.io` URLs**: 53 of Grails V's 785 tokens (the "Spire" sub-series) reference `media-proxy.artblocks.io` images. Those are **static** PNG renders that Art Blocks media-proxy serves with no expiry — they are pinnable, and they were pinned in the Grails V run. This is different from the `token.artblocks.io` case above, where the URL is the **metadata** endpoint that triggers dynamic rendering.

## Architecture — how the pin is structured

### Media files: **one CID per file**

Every unique media file (image, video, preview asset, etc.) is pinned **individually** via Pinata's single-file endpoint, getting its own root CID.

```
media/0f8502c09387…7ae8.png   →  ipfs://bafybeihjh6xj2vhrtemr6uygmmbacvim6tblf27quudqsl57kim7lr77ke
media/55b38f09c5ff…cd91.mp4   →  ipfs://bafkreicvwohqtrp7cliasborqg2pkkpa2mi3mcsagk2jkfmjwyv6ogd4n4
…
```

Files are named by `sha256(content).<ext>` so duplicate content (Grails V has heavy edition-sharing — 785 tokens map to only 202 unique files) dedupes automatically on disk and again at the IPFS layer. The full filename → CID map lives in `collections/<slug>/state.json` under `mediaPins`.

### Metadata files: **single directory pin**

After all media CIDs are known, each token's metadata JSON is rewritten so:
- `image`, `animation_url`, `primary_asset_url`, `preview_asset_url` → `ipfs://<that-file's-CID>` (no path suffix; each CID is a single file)
- everything else (`name`, `description`, `attributes`, `collection_name`, …) is preserved unchanged

The rewritten JSON files are named by **token id with no extension** (e.g. `0`, `1`, `2`, …, `784`) so the existing on-chain `tokenURI` formula `baseURI + Strings.toString(tokenId)` works as a drop-in replacement. The whole `ipfs-metadata/` directory is pinned as one upload, producing a single **`metadataCID`** that becomes the new `baseURI`.

## Pipeline

```
scripts/01-discover.js      → resolves slug, contract, setter, supply, token-index base
scripts/02-fetch-metadata   → pulls every token's current metadata JSON
scripts/03-download-media   → downloads each unique media URL; hashes by sha256
scripts/04-pin-media        → pins each media file individually → per-file CIDs
scripts/05-rewrite-metadata → produces ipfs-metadata/ pointing at per-file CIDs
scripts/06-pin-metadata     → pins ipfs-metadata/ as one directory → metadataCID
scripts/07-verify           → sha256 round-trip from public gateways for every file
scripts/08-instructions     → emits collections/<slug>/INSTRUCTIONS.md
```

Each step is idempotent (skips work that's already recorded in `state.json`) so a crash anywhere in the pipeline is recoverable.

## Setup

```bash
cd proofxyz-ipfs
npm install
cp .env.example .env   # then fill in the keys below
```

### Required `.env` keys

Create `proofxyz-ipfs/.env` (gitignored) with these four keys. The pipeline will throw at startup if any of them is missing.

| Key | What for | Where to get it |
|---|---|---|
| `ALCHEMY_API_KEY` | JSON-RPC `eth_call` for `name`/`symbol`/`totalSupply`/`tokenURI` and Alchemy NFT v3 for the contract deployer. | [dashboard.alchemy.com](https://dashboard.alchemy.com) → create an Ethereum Mainnet app → "API Key". |
| `OPENSEA_API_KEY` | Resolve a collection slug (e.g. `grails-v`) → primary contract address. | [docs.opensea.io](https://docs.opensea.io/reference/api-keys) → request an API key. |
| `PINATA_JWT` | Authenticates every Pinata upload (per-file media pins + the metadata directory pin). | [app.pinata.cloud](https://app.pinata.cloud) → API Keys → "New Key" → scoped: `pinFileToIPFS`, `pinJSONToIPFS` (the SDK uses `upload.public.file`/`fileArray` which map to those). Copy the JWT (not the API Key/Secret pair). |
| `PINATA_GATEWAY` | Dedicated gateway subdomain (no protocol, no path) — used to format `gatewayUrl` fields in `state.json` and the upload SDK config. Example: `your-gateway.mypinata.cloud`. | [app.pinata.cloud](https://app.pinata.cloud) → Gateways. If you don't have a dedicated gateway, use `gateway.pinata.cloud` (public, rate-limited). |

### Optional `.env` keys

| Key | What for | Default if missing |
|---|---|---|
| `ETHERSCAN_API_KEY` | Lets `lib/etherscan.js` fetch contract ABIs from Etherscan v2. | Falls back to **Sourcify** (keyless) — works for any verified contract. The pipeline does not require this key today. |

### Example `.env` (gitignored — never commit this)

```
ALCHEMY_API_KEY=...
OPENSEA_API_KEY=...
PINATA_JWT=eyJhbGciOi...
PINATA_GATEWAY=your-gateway.mypinata.cloud
# ETHERSCAN_API_KEY=...   # optional
```

## Run end-to-end for a collection

```bash
npm run discover         -- grails-v
npm run fetch-metadata   -- grails-v
npm run download-media   -- grails-v
npm run pin-media        -- grails-v      # 1 CID per file (slowest step)
npm run rewrite-metadata -- grails-v
npm run pin-metadata     -- grails-v      # 1 directory CID
npm run verify           -- grails-v
npm run instructions     -- grails-v      # writes INSTRUCTIONS.md
```

Output: `collections/grails-v/INSTRUCTIONS.md` plus a full `verification-report.json`.

## Handoff to Proof — the on-chain call

For each collection, the generated `INSTRUCTIONS.md` contains the concrete CIDs. The shape of the call is the same in every case: a single state-changing function that takes a string.

### Grails V — **READY TO SEND**

Pipeline complete: 785/785 metadata + 202/202 media verified end-to-end on `ipfs.io`. Full handoff doc: [`collections/grails-v/INSTRUCTIONS.md`](collections/grails-v/INSTRUCTIONS.md).

| | |
|---|---|
| Contract | [`0x92a50fe6ede411bd26e171b97472e24d245349b8`](https://etherscan.io/address/0x92a50fe6ede411bd26e171b97472e24d245349b8) |
| Function | `setBaseTokenURI(string)` |
| **Argument to pass** | `ipfs://bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/` &nbsp;_(trailing slash required)_ |
| Etherscan: read | [readContract](https://etherscan.io/address/0x92a50fe6ede411bd26e171b97472e24d245349b8#readContract) |
| Etherscan: write | [writeContract](https://etherscan.io/address/0x92a50fe6ede411bd26e171b97472e24d245349b8#writeContract) |
| Caller permission | Contract uses **AccessControl** (no public `owner()`). Verify the required role (typically `DEFAULT_ADMIN_ROLE` or a steering role) before sending. |
| Token indexing | **0-indexed**, tokens `0..784` (totalSupply 785) |

After the call, `tokenURI(0)` will return `ipfs://bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/0`, resolving via any IPFS gateway to the rewritten metadata, whose `image` is the per-file CID for that token's pinned media.

**Sample shell call (cast):**

```bash
cast send 0x92a50fe6ede411bd26e171b97472e24d245349b8 \
  "setBaseTokenURI(string)" \
  "ipfs://bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/" \
  --rpc-url $ETH_RPC --private-key $PROOF_PRIVATE_KEY
```

**Sample call via Etherscan Write Contract** (connect a wallet that holds the right AccessControl role):

1. Open [writeContract](https://etherscan.io/address/0x92a50fe6ede411bd26e171b97472e24d245349b8#writeContract).
2. Click **Connect to Web3** (top of the page) with the authorized wallet.
3. Expand `setBaseTokenURI`.
4. Paste `ipfs://bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/` (trailing slash) into the `_baseTokenURI (string)` field.
5. Click **Write**, sign the tx, wait for confirmation.

**Pre-flight (must do before sending):**

1. Re-confirm the current `baseTokenURI()` value on [Etherscan readContract](https://etherscan.io/address/0x92a50fe6ede411bd26e171b97472e24d245349b8#readContract) — at the time the pin was generated it was `https://metadata.proof.xyz/grails-v/art/` (already recorded for the revert plan below). Worth re-checking in case it's changed.
2. Spot-check the new pin via 2–3 gateways and confirm the JSON loads and the `image` IPFS CID inside it also resolves:
   - https://gateway.pinata.cloud/ipfs/bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/0
   - https://ipfs.io/ipfs/bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/0
   - https://dweb.link/ipfs/bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/0
3. After the tx lands, trigger an OpenSea metadata refresh for one token first to confirm marketplaces pick it up. Then trigger a collection-wide refresh.

**Revert plan:** call the setter with the **previous** value captured at pin time:

```
setBaseTokenURI("https://metadata.proof.xyz/grails-v/art/")
```

It's a one-string state change — fully reversible, no on-chain migration.

**Recommended: re-pin under your own Pinata account.** The pins listed in this repo are hosted on the account that ran the pipeline. For long-term durability under Proof's control, re-pin every CID from your own Pinata account (or any pinning service) before — or shortly after — flipping `baseURI`. Because IPFS is content-addressed, re-pinning the same bytes produces the **exact same CID**: no metadata edit, no on-chain change, nothing in this repo to update. To do it: fetch each CID (the metadata directory plus every entry in `state.json` → `mediaPins`) via any IPFS gateway and re-upload it through Pinata's web UI or API. Once Proof's pin exists, this account's pins can be unpinned without breaking anything.

---

The same procedure applies to the other four contracts once their pipelines finish; their CIDs and any per-contract caveats land in each collection's `INSTRUCTIONS.md`.

## Repo layout

```
proofxyz-ipfs/
├── .env                              # ALCHEMY_API_KEY, OPENSEA_API_KEY, PINATA_JWT
├── collections.json                  # in-scope + skipped list, seed contract addresses
├── lib/                              # env, opensea, alchemy, etherscan(+sourcify), pinata, state, fetchWithRetry, gateways
├── scripts/                          # 01..08 pipeline steps
└── collections/<slug>/
    ├── state.json                    # per-collection state: discovered facts, mediaPins, metadataPin, step log
    ├── original-metadata/{0,1,…}     # raw JSON from current tokenURI
    ├── media/<sha256>.<ext>          # downloaded media, content-addressed
    ├── media-manifest.json           # tokenId → { field: localFilename }
    ├── ipfs-metadata/{0,1,…}         # rewritten JSON with ipfs:// links, named by tokenId
    ├── verification-report.json      # sha256 round-trip results from gateways
    └── INSTRUCTIONS.md               # handoff file for Proof engineers
```

## Glossary

| Term | Means |
|---|---|
| **`baseURI`** | The contract-level string the contract prepends to `Strings.toString(tokenId)` to form `tokenURI(id)`. Setting it to `ipfs://<metadataCID>/` is how we point the contract at the pinned metadata directory. |
| **`tokenURI(id)`** | What marketplaces actually read. For Grails V it's `baseURI + tokenId` (no extension). After the flip it returns `ipfs://<metadataCID>/<id>`. |
| **CID** | Content Identifier — an IPFS hash of the file's bytes. Two files with the same contents always produce the same CID. |
| `bafybei…` CID | CIDv1 wrapping a UnixFS DAG (used by Pinata for larger or chunked files). Resolves the same way as `bafkrei…`. |
| `bafkrei…` CID | CIDv1 wrapping a single raw block (used for small files that fit in one block). Same resolution semantics. |
| **Per-file pin** | Each media file is pinned individually via Pinata's single-file endpoint and gets its own root CID. The metadata's `image` field is `ipfs://<that-file's-CID>` — no path suffix. |
| **Directory pin** | The rewritten metadata folder is pinned once as a UnixFS directory and gets one CID. Files inside resolve at `ipfs://<dirCID>/<filename>`. This is what `baseURI` points at. |
| **Pinata** | The pinning service we use. Account-bound, with a dedicated gateway (`your-gateway.mypinata.cloud`, auth-walled in this account) and a public gateway (`gateway.pinata.cloud`, rate-limited but anyone can use). |
| **Sourcify** | Public, keyless source-and-ABI registry for verified contracts. We use it for ABI lookups when no Etherscan API key is configured. |
| **AccessControl vs Ownable** | Two OpenZeppelin ownership patterns. `Ownable` exposes `owner()` and accepts calls from that address. `AccessControl` uses role hashes (e.g. `DEFAULT_ADMIN_ROLE`) and there is no public `owner()` — you check `hasRole(role, account)`. Grails V uses `AccessControl`, so the Etherscan write call must come from an address with the right admin/steering role, not just any "owner". |
| **Art Blocks Flex Engine** | An Art Blocks contract pattern that renders tokens dynamically from on-chain scripts via Art Blocks infrastructure. A static IPFS pin would freeze the dynamic output, so we skip any collection whose `tokenURI` resolves to an `artblocks.io` host. Grails IV is the one in scope that hits this rule. |

