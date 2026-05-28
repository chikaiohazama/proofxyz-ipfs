# Proof Collective IPFS Migration (Art)

**TL;DR.** Mirrored Proof Collective's six in-scope art-drop contracts — **Grails V, IV, III, II, I, and Diamond Exhibition** — to IPFS via Pinata. Every token's metadata JSON and the media it references now have content-addressed `ipfs://` references. Each contract is one `setBaseTokenURI(...)` call away from being fully mirrored. Source images expire **2026-08-28** (signed GCS URLs), so Grails IV/V especially are time-bombed.

---

## Quick reference — exact values to send

All six contracts use the same setter: **`setBaseTokenURI(string)`**, called from the wallet that holds owner/admin permission on each contract.

| Collection | Contract (Etherscan Write) | Argument to pass | Caller |
|---|---|---|---|
| **Grails V** | [`0x92a50…349b8`](https://etherscan.io/address/0x92a50fe6ede411bd26e171b97472e24d245349b8#writeContract) | `ipfs://bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/` | AccessControl admin role |
| **Grails IV** | [`0x069ee…b8885`](https://etherscan.io/address/0x069eeda3395242bd0d382e3ec5738704569b8885#writeContract) | `ipfs://bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m/` | AccessControl admin role |
| **Grails III** | [`0x503a3…84A3`](https://etherscan.io/address/0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3#writeContract) | `ipfs://bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q/` | `Ownable.owner()` |
| **Grails II** | [`0xd78af…ed96b`](https://etherscan.io/address/0xd78afb925a21f87fa0e35abae2aead3f70ced96b#writeContract) | `ipfs://bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm/` | `Ownable.owner()` |
| **Grails I** ⚠️ | [`0xb6329…b2b19`](https://etherscan.io/address/0xb6329bd2741c4e5e91e26c4e653db643e74b2b19#writeContract) | `ipfs://bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m` &nbsp;**_(NO trailing slash)_** | `Ownable.owner()` |
| **Diamond Exhibition** | [`0x68d0f…eec2e`](https://etherscan.io/address/0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e#writeContract) | `ipfs://bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i/` | `Ownable.owner()` |

> ⚠️ **Grails I is structurally different from the others.** Its on-chain `tokenURI` is `baseTokenURI + "/" + grailId + "/" + tokenId`, so the IPFS pin is a **nested** `<grailId>/<tokenId>` directory and the argument **must not end with a slash**. Read [`collections/grails-i/INSTRUCTIONS.md`](collections/grails-i/INSTRUCTIONS.md) before sending.

Each collection's full handoff doc (pre-flight checklist, sample call shell + ethers.js, revert string, gateway verification links, findings):

- [Grails V](collections/grails-v/INSTRUCTIONS.md)
- [Grails IV](collections/grails-iv/INSTRUCTIONS.md)
- [Grails III](collections/grails-iii/INSTRUCTIONS.md)
- [Grails II](collections/grails-ii/INSTRUCTIONS.md)
- [Grails I](collections/grails-i/INSTRUCTIONS.md) ⚠️
- [Diamond Exhibition](collections/diamond-exhibition-by-proof/INSTRUCTIONS.md)

### Per-collection stats

| Collection | Total tokens | Affected by flip (Proof-routed) | Unchanged (AB-routed) | Unique media pinned | Notable |
|---|---:|---:|---:|---:|---|
| Grails V | 785 | 732 | 53 | 202 | 53 AB-routed tokens are the "Spire" sub-series — their on-chain `tokenURI` points to `token.artblocks.io` so they're unaffected by the flip; we also pinned their `media-proxy.artblocks.io` static-PNG renders (used by 53 metadata files we did process) for completeness. Source GCS URLs expire **2026-08-28**. |
| Grails IV | 904 | 734 | 170 | 84 | First real test of the per-token AB filter on a mixed contract — 170/170 correctly skipped. Heavy edition dedup (~9 editions per piece). 7 transient HTTP 504s on small JSON files during verify, all cleared on retry. Same time-bomb expiry as Grails V. |
| Grails III | 1,000 | 1,000 | 0 | 424 (8 are 100–285 MB MP4s) | 20 artists (0xDEAFBEEF, Rik Oostenbroek, Mika Tajima, Matt Kane, …). Recovery from the 30-min signed-URL trap via HEAD-MD5 trick saved hours of bandwidth. Mixed source hosts inside metadata: GCS signed + Arweave + pre-existing `ipfs://` for Matt Kane's 100-token *Picture of the Planets* drop. |
| Grails II | 1,178 | 1,178 | 0 | **55** (extreme dedup, ~21 editions/piece) | First time we saw explicit `ipfs.io` HTTP 429s during verify — 35× 429 + 6× 504, all cleared on retry. The 84 MB animated GIF used by 39 tokens was the only file that needed a solo retry pass (couldn't pin during parallel run). |
| **Grails I** ⚠️ | 1,036 | 1,036 | 0 | **20** (most extreme dedup of all) | Unique URI construction: `tokenURI = baseURI + "/" + grailId + "/" + tokenId`. IPFS pin is **nested** as `<grailId>/<tokenId>`. The 20 grailIds (0..19) map 1:1 to the 20 per-artist OpenSea collection pages listed below. Argument **must NOT end with a slash**. |
| Diamond Exhibition | 5,093 | 1,407 | **3,686** | 520 | The largest mixed-routing contract — only ~28% of tokens are affected by the flip; 3,686 remain on Art Blocks unchanged. Heavy edition dedup. The HEAD-MD5 trick avoided ~30 min of redundant downloads (1,217 URLs resolved without re-fetching their bytes). Same time-bomb expiry as Grails V. |

### Revert plan (per collection)

If anything goes wrong post-send, call the same setter with the verbatim previous baseURI:

| Collection | Previous baseURI (revert value) |
|---|---|
| Grails V | `https://metadata.proof.xyz/grails-v/art/` |
| Grails IV | `https://metadata.proof.xyz/grails-iv/art/` |
| Grails III | `https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/3/` |
| Grails II | `https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/2/` |
| Grails I | `https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/1` _(no trailing slash)_ |
| Diamond Exhibition | `https://metadata.proof.xyz/diamond-exhibition/` |

It's a one-string state change — fully reversible, no on-chain migration.

---

## Why this exists

Proof's metadata service hands out JSON whose `image` URLs are **signed Google Cloud Storage URLs with expiry timestamps**. The signatures on every URL in Grails IV and V share the same `Expires` value: **2026-08-28 UTC**. After that date, the URLs 403 and the NFTs visually go dark — even though the metadata server is otherwise healthy. Grails I/II/III metadata is served from a Cloud Run host (`live---grails-metadata-…run.app`) that's similarly centralized and similarly vulnerable to disappearing one day.

Pinning each media file to IPFS, rewriting metadata to point at those CIDs, then pinning the rewritten metadata as a directory removes both dependencies. The contract's existing `tokenURI` math keeps working unchanged after the flip — we just point `baseTokenURI` at the IPFS root.

---

## What we did

Per collection, the pipeline runs eight steps:

```
01-discover         resolve slug → contract; inspect tokenURI/setter/AccessControl; sample
                    host distribution across token ids (per-token mixed-routing detection)
02-fetch-metadata   pull every token's current metadata JSON from its on-chain tokenURI
                    (per-token; Art Blocks-routed ids are skipped automatically)
03-download-media   download each unique http(s) media URL referenced by any metadata field
                    (image, animation_url, primary_asset_url, preview_asset_url)
04-pin-media        upload each media file to Pinata via the single-file endpoint
                    → one root CID per file (NOT a directory pin)
05-rewrite-metadata produce a new metadata JSON per token with every media URL replaced
                    by `ipfs://<that-file's-CID>`. Existing `ipfs://` and `arweave://`
                    fields are preserved.
06-pin-metadata     upload the rewritten metadata directory to Pinata as one batch
                    → one root CID for the directory; this CID becomes the new baseURI
07-verify           round-trip every pinned file through `ipfs.io` and sha256-compare
                    against the local copy
08-instructions     emit collections/<slug>/INSTRUCTIONS.md
```

### Architecture: per-file media pins + one directory pin for metadata

Two distinct pin types per collection:

- **Media (one CID per file)** — every unique media file is pinned with Pinata's single-file endpoint. Each gets its own root CID like `bafkrei…` or `bafybei…`. Files are named locally by `sha256(content)` so duplicate content (Grails I has 1,036 tokens but only 20 unique media files; Grails II has 1,178 → 55) collapses on disk and again at the IPFS layer.
- **Metadata (one directory pin)** — after media CIDs are known, each token's metadata JSON is rewritten with `image: ipfs://<that-file's-CID>` (no path suffix; each CID is a single file). The whole `ipfs-metadata/` directory is pinned in one upload. The directory's root CID is what `setBaseTokenURI(...)` consumes — files inside are named by tokenId with no extension, so the contract's existing `baseURI + Strings.toString(tokenId)` formula works as a drop-in.

### Why this is correct (the chain of reasoning)

The pin structure mimics what the contracts already do, so only one on-chain string changes. Five chained facts:

1. **The contract math is literal.** For Grails II/III/IV/V and Diamond Exhibition's Proof-routed tokens, the Solidity is `string(abi.encodePacked(baseURI, _toString(tokenId)))` — that's `baseURI` concatenated with the decimal token id. No extension, no separator. (Grails I prepends `/grailId/` — special, see below.)
2. **The pinned files are named to match.** `scripts/05-rewrite-metadata.js` writes `ipfs-metadata/<id>` — extension-less file named after the token id. After the flip, `tokenURI(473)` = `"ipfs://<metadataCID>/" + "473"` = `ipfs://<metadataCID>/473` → resolves to that file in the pin.
3. **Media inside the metadata is also content-addressed.** Each `image` (and `animation_url`, etc.) was rewritten to `ipfs://<that-file's-CID>` so once a wallet fetches the metadata JSON via IPFS, the image it references is also on IPFS. No URL touches `metadata.proof.xyz` or `storage.googleapis.com` after the flip.
4. **Sparse id sets are safe for mixed contracts.** For Diamond Exhibition and Grails IV, only the Proof-routed ids end up in `ipfs-metadata/`. The Art Blocks ids — say `5000000` — are absent. This is intentional and safe: the contract's `tokenURI(uint256)` never calls `_baseURI()` for those ids (it dispatches inside the function to `flex.tokenURI(...)` which returns the Art Blocks URL), so it never looks up `ipfs://<CID>/5000000`. See the source snippets below.
5. **End-to-end verified before handoff.** `scripts/07-verify.js` re-fetches every pinned file through `ipfs.io` and sha256-compares against the local copy. Every committed CID has passed this round-trip before being recommended.

### How Art Blocks tokens are handled (Diamond Exhibition + Grails IV)

Several Proof contracts have **mixed per-token routing**: some token ids resolve through `baseTokenURI` to a Proof-hosted JSON (mirrorable), others are routed inside `tokenURI(uint256)` directly to `token.artblocks.io/...` (rendered dynamically by Art Blocks — not pinnable). The pipeline detects this per-token and only fetches Proof-routed ids.

Verified by reading the contract source on Sourcify:

**Diamond Exhibition** (`DiamondExhibition.sol`):

```solidity
function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    TokenInfo memory info = _tokenInfo(tokenId);
    if (projectType(info.projectId) == ProjectType.Curated) {
        return string.concat(_baseURI(), Strings.toString(tokenId));   // ← Proof branch (uses baseURI)
    }
    return flex.tokenURI(artblocksTokenID(_artblocksProjectId(info.projectId), info.edition));
    // ↑ Art Blocks branch — computes URL via the Flex engine; never reads _baseURI()
}
```

**Grails IV** (`ABProjectPoolSellable.sol`, same base used by Grails V + Evolving Pixels):

```solidity
function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    TokenInfo memory info = tokenInfo(tokenId);
    if (_isLongformProject(info.projectId)) {
        return flex.tokenURI(artblocksTokenID(_artblocksProjectId(info.projectId), info.edition));
        // ↑ Art Blocks branch — never touches baseURI
    }
    return super.tokenURI(tokenId);   // ← baseURI + tokenId (Proof branch)
}
```

Concretely for Diamond Exhibition: **only ~1,407 of 5,093 tokens** are affected by the baseURI flip. The other 3,686 ids stay on Art Blocks regardless. The contract has **no `setTokenURI(uint256, string)`** function in its ABI, so the per-token routing is hardcoded in contract logic — there is no per-token writable mapping to misconfigure.

**Post-flip empirical check** (5 min, no risk): on Etherscan readContract, call `tokenURI(<an_AB_id>)` and confirm it still returns `token.artblocks.io/...`; call `tokenURI(<a_proof_id>)` and confirm it now returns `ipfs://<newCID>/<id>`. Each collection's `INSTRUCTIONS.md` lists known AB-routed ids in `state.json` → `skippedArtblocksIds` for testing.

### Why Grails I is structurally different

Reading `Grails.sol` source on Sourcify:

```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    uint256 grailId = uint256(tokenGrails[tokenId]);
    return string(abi.encodePacked(
        baseTokenURI, "/", grailId.toString(), "/", tokenId.toString()
    ));
}
```

The contract inserts `"/" + grailId + "/" + tokenId` *after* `baseTokenURI`, where `grailId = tokenGrails[tokenId]` is per-token storage. So:

- Today: `tokenURI(0)` = `https://live---grails-metadata-…run.app/metadata/1` + `/0/0` = `…/metadata/1/0/0`
- After the flip: `tokenURI(0)` = `ipfs://<CID>` + `/0/0` = `ipfs://<CID>/0/0`

To make those new paths resolve, the IPFS pin for Grails I is a **nested directory**:

```
<CID>/
├── 0/                # grailId 0 (Gary Vaynerchuk — "What do you 'B'")
│   ├── 0, 1, 800, …  # 112 tokens in this grail
├── 1/                # grailId 1
├── 2/
├── …
└── 19/               # 20 grails total
```

There are **20 grails (0..19)** across **1,036 tokens**, matching the 20 per-artist OpenSea collection pages listed below. The exact `grailId` per token was derived by reading the current on-chain `tokenURI(id)` for every id and parsing the URL path.

The `setBaseTokenURI` argument for Grails I therefore has **no trailing slash** — the contract supplies the `"/"` itself. Sending a value with a trailing slash would produce `ipfs://CID//grailId/tokenId` (double slash) which some gateways may fail to resolve.

---

## Issues encountered and how we dealt with them

The pipeline did not run cleanly on the first try for several collections. The interesting failure modes and fixes:

### 1. Per-token Art Blocks routing (initial scope error)

**Symptom.** Early version of `01-discover.js` skipped a contract entirely if `tokenURI(0)` resolved to an `artblocks.io` host. That meant Grails IV (~83% Proof-routed) and Diamond Exhibition (~28% Proof-routed) were being skipped wholesale.

**Fix.** Replaced contract-wide skipping with a 30-sample `hostDistribution` in discovery, and added per-token filtering in `02-fetch-metadata.js` so individual ids that route to Art Blocks are recorded in `state.skippedArtblocksIds` and never fetched. The rest of the pipeline naturally produces a sparse-id pin for those collections. Verified safety from the Solidity source above: the Art Blocks branch never reads `_baseURI()`, so missing-from-pin AB ids never 404 against the new CID.

### 2. Pinata SDK deadlocks on large MP4s

**Symptom.** Grails III contains eight 100–285 MB MP4s. Running `pin-media` at concurrency 4, all four workers stalled at zero CPU for 30+ minutes with 47 idle sockets — Pinata's internal chunked-upload was getting stuck without aborting. No timeout to fall back on.

**Fix.** Wrapped each `uploadFile` call in `04-pin-media.js` in a `Promise.race` with a **15-minute per-attempt deadline**; pairs with the existing exponential-backoff retry. Dropped concurrency from 4 → 1–2 for runs heavy with large files. Added per-file size + elapsed-time logging so deadlocks are detectable at a glance. After this, the same Grails III pin completed cleanly (largest file took ~9 min at ~750 KB/s effective throughput, well under the 15 min cap).

### 3. The 30-minute signed-URL expiry trap (Grails III)

**Symptom.** Grails III's metadata source uses **30-minute-lived** GCS signed URLs (`X-Goog-Expires=1799`). Step 02 fetches all 1,000 metadata JSONs in 30 seconds, but step 03 (download every image) takes hours when interrupted/restarted. By the time step 03 reached the later URLs, the early-fetched signatures had expired. The first run ended with only 221/1,000 tokens having a working manifest entry; the rest pointed at URLs that 403'd before download.

**Fix.** Built a **HEAD-MD5 fast path** for the recovery: re-fetch metadata to get fresh signed URLs, then issue HEAD requests to GCS (no body download), read the `x-goog-hash` header for the object's MD5, and look up an already-on-disk file with that MD5. This resolved 1,217 / 1,407 unmapped Diamond Exhibition URLs in ~10 seconds with zero downloaded bytes. Same trick saved hours on the Grails III recovery; remaining ~50 truly-new files were downloaded conventionally. (Worth integrating into `03-download-media.js` as an optimisation for any re-run flow.)

### 4. Grails I's non-standard `tokenURI` shape

**Symptom.** Step 08 generated an `INSTRUCTIONS.md` for Grails I with a trailing-slash baseURI like the others. But Grails I's `tokenURI` is `baseTokenURI + "/" + grailId + "/" + tokenId`, so the standard flat pin would not resolve — paths like `ipfs://CID/0/0` need the directory to actually have `0/0` as a nested file, not a flat file named `0`.

**Fix.** Read on-chain `tokenURI(id)` for every token, parsed the grailId from the URL path, restructured the rewritten metadata into a **nested `<grailId>/<tokenId>` directory**, re-pinned, re-verified recursively. Hand-wrote a Grails-I-specific `INSTRUCTIONS.md` warning prominently about the no-trailing-slash requirement.

### 5. Transient `ipfs.io` errors during verify

**Symptom.** `07-verify.js` hits `ipfs.io` for every pinned file. Verify against ~1,000+ files at a time triggers transient HTTP 429 (rate limit), 502 (bad gateway), and 504 (timeout) responses; for very large files the 90-second per-fetch timeout occasionally aborts. We saw counts ranging from 2 to 41 transient failures per collection.

**Fix.** Built a retry-with-longer-timeout pass that re-fetches each failed CID with up to 10 minutes per request. Across all six collections, every retry pass cleared every failure to PASS. (Future improvement: bake retry into `07-verify.js` itself.)

### 6. The 84MB animated GIF (Grails II)

**Symptom.** A single shared 84 MB animated GIF (used as the image for 39 different Grails II tokens) failed all 4 retry attempts in `pin-media` while two other pipelines were concurrently competing for Pinata throughput.

**Fix.** Paused the other pipelines; re-ran `04-pin-media.js grails-ii` solo (it's idempotent — skipped the 54 already-pinned files); the same GIF pinned on the first attempt with Pinata's per-account throughput fully available. Confirmed a real throughput ceiling: running >2 pipelines pinning large files concurrently from one Pinata account consistently triggers chunked-upload failures.

### 7. `ipfs.io` cache serving wrong content for a tiny CID

**Symptom.** Grails III's verify reported one media mismatch on a 1,126-byte Arweave HTML wrapper: local content sha256 matched the filename, but `ipfs.io` for that CID returned 1,397 different bytes with a different sha. Three different sizes turned up across three fetches of the same arweave URL — that endpoint is dynamic.

**Diagnosis.** Cross-checked: `gateway.pinata.cloud` returned **the correct 1,126-byte content matching local file**. `ipfs.io` was serving a stale/wrong cache entry for that specific CID. Since CIDs are content-addressed, the pin itself is correct; the gateway is broken for this one CID. Recorded in `verification-report.json` → `notes` field.

### 8. OpenSea slug ≠ on-chain contract

**Symptom.** A user spot-check revealed that OpenSea's slug `proof-grails` resolves to a **Grails II Mint Pass** contract (`0x2c3fc1…f9fd`), not the actual Grails I art contract; and `proof-grails-ii` on OpenSea resolves to a **17-token Polygon edition**, not the Ethereum art contract. I'd named the repo's internal slugs after those OpenSea slugs, creating false signal that the contracts we were processing were mint passes.

**Fix.** Renamed the repo's internal slugs to `grails-i` and `grails-ii` (local directory names, not OpenSea slugs), and added a callout in this README that the on-chain contract addresses (verified via `name()` + sample `tokenURI()` content) are authoritative, not OpenSea's slugs. Also discovered that OpenSea has fragmented Grails I, II, III, *and* IV into per-artist landing pages (e.g. `what-do-you-b-by-gary-vaynerchuk`, `belly-of-the-whale-01-by-tom-sachs`); Grails V is the only season with a single unified OpenSea page (`grails-v`). Full per-artist page list is below for cross-reference.

### 9. Evolving Pixels' broken source ids (descoped)

**Symptom.** Step 02 for Evolving Pixels reproducibly hit HTTP 503 for token ids 875 and 890 — every retry, every fresh attempt after a 30-second wait. Surrounding ids on the same `/evolving-pixels/curated/` path worked fine. Theory: a Proof-side backend issue specific to those two ids.

**Decision.** Pinning then would have permanently baked two `ipfs://<CID>/875` → 404 holes into the mirror; the upstream is fixable in place. Collection was paused, then later **descoped** entirely by user direction. Partial state preserved in `collections/proof-curated-evolving-pixels/` for forensic reference.

### 10. Pinata gateway / dedicated-gateway URLs leaked into committed state

**Symptom.** The Pinata SDK's upload responses include a `gatewayUrl` that references the account's dedicated gateway subdomain. This was being saved into per-collection `state.json` files and would have published an account identifier in the public repo.

**Fix.** Stripped `gatewayUrl` from `lib/pinata.js` return values; manually sanitised the existing `state.json` files. Configurable via `PINATA_GATEWAY` env var if anyone wants to reproduce against a different account.

---

## Architecture details

### Repo layout

```
proofxyz-ipfs/
├── .env                              # ALCHEMY_API_KEY, OPENSEA_API_KEY, PINATA_JWT, PINATA_GATEWAY
├── .env.example                      # template with empty values
├── collections.json                  # in-scope + skipped lists with per-contract notes
├── lib/
│   ├── env.js                        # env loader (Node 20 process.loadEnvFile)
│   ├── alchemy.js                    # JSON-RPC + NFT-API helpers
│   ├── opensea.js                    # collection slug lookup
│   ├── etherscan.js                  # ABI fetch (Sourcify fallback)
│   ├── sourcify.js                   # keyless ABI lookup
│   ├── pinata.js                     # uploadFile (single-CID) + uploadDir (directory pin)
│   ├── fetchWithRetry.js             # exp-backoff fetch + bounded-concurrency gate
│   ├── gateways.js                   # public IPFS gateway list
│   └── state.js                      # per-collection state.json read/write
├── scripts/
│   ├── 01-discover.js                # → state.discovered
│   ├── 02-fetch-metadata.js          # → original-metadata/<id>
│   ├── 03-download-media.js          # → media/<sha256>.<ext> + media-manifest.json
│   ├── 04-pin-media.js               # → state.mediaPins (one CID per file)
│   ├── 05-rewrite-metadata.js        # → ipfs-metadata/<id>
│   ├── 06-pin-metadata.js            # → state.metadataPin (directory CID)
│   ├── 07-verify.js                  # → verification-report.json
│   └── 08-instructions.js            # → INSTRUCTIONS.md
└── collections/<slug>/
    ├── state.json                    # per-collection state machine
    ├── original-metadata/{0,1,…}     # raw JSON from current tokenURI (gitignored)
    ├── media/<sha256>.<ext>          # downloaded media, content-addressed (gitignored)
    ├── media-manifest.json           # tokenId → field → local filename
    ├── ipfs-metadata/                # rewritten JSON, named by tokenId
    │                                 # (Grails I uses nested grailId/tokenId/)
    ├── verification-report.json
    └── INSTRUCTIONS.md
```

### Reproducing or auditing a run

```bash
cd proofxyz-ipfs
npm install
cp .env.example .env   # fill in the four keys

# Run any single step, or all 8 in sequence:
npm run discover         -- grails-v
npm run fetch-metadata   -- grails-v
npm run download-media   -- grails-v
npm run pin-media        -- grails-v
npm run rewrite-metadata -- grails-v
npm run pin-metadata     -- grails-v
npm run verify           -- grails-v
npm run instructions     -- grails-v
```

Each script is idempotent — re-running picks up wherever state.json left off.

### Required `.env` keys

| Key | What for | Where to get it |
|---|---|---|
| `ALCHEMY_API_KEY` | `eth_call` for ERC-721 reads + Alchemy NFT v3 for deployer | [dashboard.alchemy.com](https://dashboard.alchemy.com) |
| `OPENSEA_API_KEY` | slug → contract resolution | [docs.opensea.io](https://docs.opensea.io/reference/api-keys) |
| `PINATA_JWT` | upload auth (scoped: `pinFileToIPFS` + `pinJSONToIPFS`) | [app.pinata.cloud](https://app.pinata.cloud) → API Keys |
| `PINATA_GATEWAY` | dedicated gateway subdomain (no scheme, no path) — e.g. `your-gateway.mypinata.cloud`. Use `gateway.pinata.cloud` if you don't have a dedicated one. | [app.pinata.cloud](https://app.pinata.cloud) → Gateways |
| `ETHERSCAN_API_KEY` *(optional)* | direct Etherscan ABI lookup; falls back to keyless Sourcify if absent | [etherscan.io/myapikey](https://etherscan.io/myapikey) |

---

## OpenSea page map (auto-grouping per season)

OpenSea fragments Grails I–IV into per-artist landing pages; Grails V is the only season with a single unified page. The contract addresses above are the authoritative on-chain references for the migration tx — these OpenSea links are for cross-reference only.

<details>
<summary><b>Grails I</b> — 20 per-artist pages</summary>

| Title | OpenSea |
|---|---|
| What do you "B" — Gary Vaynerchuk | https://opensea.io/collection/what-do-you-b-by-gary-vaynerchuk |
| Renewal — Rachel Ryle | https://opensea.io/collection/renewal-by-rachel-ryle |
| Second Moon — Nicolas Sassoon | https://opensea.io/collection/second-moon-by-nicolas-sassoon |
| How to Start a War — Tim Ferriss | https://opensea.io/collection/how-to-start-a-war-by-tim-ferriss |
| I've got your cat, please follow me — Kiszkiloszki | https://opensea.io/collection/i-ve-got-your-cat-please-follow-me-by-kiszkiloszki |
| ON THE SHOULDERS OF — Alexis Ohanian | https://opensea.io/collection/on-the-shoulders-of-by-alexis-ohanian |
| Dream Loaf — Sarah Zucker | https://opensea.io/collection/dream-loaf-by-sarah-zucker |
| In My Head — Mike Shinoda | https://opensea.io/collection/in-my-head-by-mike-shinoda |
| Iteration 0 — Grelysian | https://opensea.io/collection/iteration-0-by-grelysian |
| Ixian No-Ships — IX Shells | https://opensea.io/collection/ixian-no-ships-by-ix-shells |
| 횡단보도 (Crosswalk) — Dmitri Cherniak | https://opensea.io/collection/hoengdanbodo-by-dmitri-cherniak |
| MIRROR, MIRROR. — Lucrece | https://opensea.io/collection/mirror-mirror-by-lucrece |
| euphoria — Marlo | https://opensea.io/collection/euphoria-by-marlo |
| Wall — Tyler Hobbs | https://opensea.io/collection/wall-by-tyler-hobbs |
| WAGMI — Hackatao | https://opensea.io/collection/wagmi-by-hackatao |
| Protoglyph — Larva Labs | https://opensea.io/collection/protoglyph-by-larva-labs |
| how many times can a heart be broken? — Yosnier | https://opensea.io/collection/how-many-times-can-a-heart-be-broken-by-yosnier |
| c.u.l.t. — Claire Silver | https://opensea.io/collection/c-u-l-t-by-claire-silver |
| Catchem — Gremplin | https://opensea.io/collection/catchem-by-gremplin |
| Choices — What is Real | https://opensea.io/collection/choices-by-what-is-real |
</details>

<details>
<summary><b>Grails II</b> — 25 per-artist pages</summary>

| Title | OpenSea |
|---|---|
| Fixer-upper — Process Grey | https://opensea.io/collection/fixer-upper-by-process-grey |
| Sparrows do not fear the sun. — Linda Dounia | https://opensea.io/collection/sparrows-do-not-fear-the-sun-by-linda-dounia |
| Retinal Plugin — Neurocolor | https://opensea.io/collection/retinal-plugin-by-neurocolor |
| Cognition #0 - Returning Home — Justin Aversano | https://opensea.io/collection/cognition-0-returning-home-by-justin-aversano |
| Latent Floral - A — Refik Anadol | https://opensea.io/collection/latent-floral-a-by-refik-anadol |
| Ambivalence — Luis Ponce | https://opensea.io/collection/ambivalence-by-luis-ponce |
| Eat The Scroll — Nadya Tolokonnikova | https://opensea.io/collection/eat-the-scroll-by-nadya-tolokonnikova |
| Dragon Preliminary Study — James Jean | https://opensea.io/collection/dragon-preliminary-study-by-james-jean |
| Quantum Noise — Pindar Van Arman | https://opensea.io/collection/quantum-noise-by-pindar-van-arman |
| Crude Figures — Kjetil Golid | https://opensea.io/collection/crude-figures-by-kjetil-golid |
| Get Weird — Coldie | https://opensea.io/collection/get-weird-by-coldie |
| Dissociation — Drifter Shoots | https://opensea.io/collection/dissociation-by-drifter-shoots |
| Red Skull — Mr. Doodle | https://opensea.io/collection/red-skull-by-mr-doodle |
| Bookends (Study) — Snowfro | https://opensea.io/collection/bookends-study-by-snowfro |
| Belly of the Whale: 01 — Tom Sachs | https://opensea.io/collection/belly-of-the-whale-01-by-tom-sachs |
| Ball — Jake Fried | https://opensea.io/collection/ball-by-jake-fried |
| IN THE AIR — Osinachi | https://opensea.io/collection/in-the-air-by-osinachi |
| Store — Grant Riven Yun | https://opensea.io/collection/store-by-grant-riven-yun |
| GEIST — Alida Sun | https://opensea.io/collection/geist-by-alida-sun |
| My Mother the Sun — Cachepoor | https://opensea.io/collection/my-mother-the-sun-by-cachepoor |
| Breezy Doozy — Harm van den Dorpel | https://opensea.io/collection/breezy-doozy-by-harm-van-den-dorpel |
| made these for your girl — Alpha Centauri Kid | https://opensea.io/collection/made-these-for-your-girl-by-alpha-centauri-kid |
| The Guardian — William Mapan | https://opensea.io/collection/the-guardian-by-william-mapan |
| Away from Keyboard — Emily Xie | https://opensea.io/collection/away-from-keyboard-by-emily-xie |
| The Fabric of Trees — Zancan | https://opensea.io/collection/the-fabric-of-trees-by-zancan |
</details>

<details>
<summary><b>Grails III</b> — 20 per-artist pages</summary>

| Title | OpenSea |
|---|---|
| Mud Slide — Jon Gray | https://opensea.io/collection/mud-slide-by-jon-gray |
| Man Machine — Killer Acid | https://opensea.io/collection/man-machine-by-killer-acid |
| Shermie — Seneca | https://opensea.io/collection/shermie-by-seneca |
| Proof of Origin - Picture of the Planets — Matt Kane | https://opensea.io/collection/proof-of-origin-picture-of-the-planets-by-matt-kan |
| Shores — Seerlight | https://opensea.io/collection/shores-by-seerlight |
| Bathybius Haeckelii — Mika Tajima | https://opensea.io/collection/bathybius-haeckelii-by-mika-tajima |
| Silver Grail — 0xDEAFBEEF | https://opensea.io/collection/grails-by-0xdeafbeef |
| Reticulum — Harvey Rayner | https://opensea.io/collection/reticulum-by-harvey-rayner |
| Echoes — Rik Oostenbroek | https://opensea.io/collection/echoes-by-rik-oostenbroek |
| Dorze Duressa — Yatreda | https://opensea.io/collection/dorze-duressa-by-yatreda |
| Substance — Iskra Velitchkova | https://opensea.io/collection/substance-by-iskra-velitchkova |
| Realization — mpkoz | https://opensea.io/collection/realization-by-mpkoz |
| Tempelfjord — Reuben Wu | https://opensea.io/collection/tempelfjord-by-reuben-wu |
| Systems — Ryan Koopmans | https://opensea.io/collection/systems-by-ryan-koopmans |
| there goes that kid — Alpha Centauri Kid | https://opensea.io/collection/there-goes-that-kid-by-alpha-centauri-kid |
| Into the blue — Maxim Zhestkov | https://opensea.io/collection/into-the-blue-by-maxim-zhestkov |
| Her — Josie Bellini | https://opensea.io/collection/her-by-josie-bellini |
| Cigarette and heartbreaks — 0xTjo | https://opensea.io/collection/cigarette-and-heartbreaks-by-0xtjo |
| unsynthesized — Sofia Crespo | https://opensea.io/collection/unsynthesized-423-by-sofia-crespo |
| How things fit together — Zach Lieberman | https://opensea.io/collection/how-things-fit-together-by-zach-lieberman |
</details>

<details>
<summary><b>Grails IV</b> — 20 per-artist pages</summary>

| Title | OpenSea |
|---|---|
| Drawing with Code — Yazid | https://opensea.io/collection/drawing-with-code-by-yazid |
| Lines of Division — basiic | https://opensea.io/collection/lines-of-division-25-by-basiic |
| Doomscrolling — Ben Kovach | https://opensea.io/collection/doomscrolling-by-ben-kovach |
| "Epiphany" — Jack Butcher | https://opensea.io/collection/epiphany-by-jack-butcher |
| A Perfect Friday Night — Dangiuz | https://opensea.io/collection/a-perfect-friday-night-by-dangiuz |
| A Woman in the Mist — Ayla El Moussa | https://opensea.io/collection/a-woman-in-the-mist-by-ayla-el-moussa |
| LIGHT — Hans Dehlinger | https://opensea.io/collection/light-by-hans-dehlinger |
| ATOMS — Casey Reas | https://opensea.io/collection/atoms-by-casey-reas |
| Madonna — Goldcat | https://opensea.io/collection/madonna-by-goldcat |
| Open Console — Kim Asendorf | https://opensea.io/collection/open-console-by-kim-asendorf |
| Goodbye Horses — Michael Kutsche | https://opensea.io/collection/goodbye-horses-by-michael-kutsche |
| The Grail — Craig Mullins | https://opensea.io/collection/the-grail-by-craig-mullins |
| Blaatimen — Per Kristian Stoveland | https://opensea.io/collection/blaatimen-by-per-kristian-stoveland |
| Around Again — diewiththemostlikes | https://opensea.io/collection/around-again-by-diewiththemostlikes |
| Time-Lapse — Roope Rainisto | https://opensea.io/collection/time-lapse-by-roope-rainisto |
| Unamused — Operator | https://opensea.io/collection/unamused-by-operator |
| RELICS — Hideki Tsukamoto | https://opensea.io/collection/relics-by-hideki-tsukamoto |
| A SPECTRUM OF BEING. — Shavonne Wong | https://opensea.io/collection/echoes-of-identity-by-shavonne-wong |
| Ethereal Dawn — Inna Modja | https://opensea.io/collection/ethereal-dawn-by-inna-modja |
| Paying Debts — Other World | https://opensea.io/collection/paying-debts-by-other-world |
</details>

<details>
<summary><b>Grails V</b> — single unified page</summary>

OpenSea kept Grails V as a single collection:

- https://opensea.io/collection/grails-v
</details>

---

## Custody and re-pinning

The pins listed here are hosted on the Pinata account that ran the pipeline. For long-term durability under Proof's control, re-pin every CID from your own account (or any pinning service) before — or shortly after — flipping `baseURI`. Because IPFS is content-addressed, **re-pinning the same bytes produces the exact same CID** — no metadata edit, no on-chain change. Once Proof's pin exists, this account's pins can be unpinned without breaking anything.

To do it: fetch each CID (the metadata directory plus every entry in `state.json` → `mediaPins`) via any IPFS gateway and re-upload through Pinata's web UI or API.

---

## Glossary

| Term | Means |
|---|---|
| **`baseURI`** | Contract-level string the contract prepends to `Strings.toString(tokenId)` to form `tokenURI(id)`. |
| **`tokenURI(id)`** | What marketplaces read. For Grails II/III/IV/V + Diamond Exhibition's Proof-routed tokens it's `baseURI + tokenId`. For Grails I it's `baseURI + "/" + grailId + "/" + tokenId`. |
| **CID** | IPFS Content Identifier — hash of the file's bytes. Two files with identical contents always produce the same CID. |
| **`bafybei…`** | CIDv1 wrapping a UnixFS DAG (used by Pinata for chunked or larger files). |
| **`bafkrei…`** | CIDv1 wrapping a single raw block (used for small files that fit in one block). |
| **Per-file pin** | Pinata's single-file endpoint; the returned CID resolves to *that file* directly. Metadata's `image` field is `ipfs://<that-CID>` with no path. |
| **Directory pin** | Pinata's directory upload; the returned CID is the directory root. Files inside resolve at `ipfs://<dirCID>/<filename>`. The metadata pin is one of these per collection. |
| **AccessControl vs Ownable** | Two OpenZeppelin permission patterns. `Ownable` exposes `owner()`; `AccessControl` uses role hashes (no public `owner()` — check `hasRole(role, account)`). Grails IV/V use AccessControl; Grails I/II/III + Diamond Exhibition use Ownable. |
| **Art Blocks Flex Engine** | Art Blocks contract pattern where tokens are rendered dynamically from on-chain scripts. Diamond Exhibition and Grails IV are mixed-routing contracts whose Art Blocks-routed tokens are dispatched inside `tokenURI(uint256)` to `flex.tokenURI(...)`, bypassing `baseURI` entirely. Those tokens are unaffected by the migration. |
