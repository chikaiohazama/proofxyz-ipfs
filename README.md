# proofxyz-ipfs

Mirror Proof Collective art-drop metadata and media to IPFS so each collection's `tokenURI` no longer depends on Proof's centralized hosts (`metadata.proof.xyz`, `media.proof.xyz`, time-limited Google Cloud signed URLs). The pipeline produces, per collection, an `INSTRUCTIONS.md` file telling Proof engineers exactly which on-chain function to call to flip the `baseURI` to IPFS.

## TL;DR for Proof engineers

If you're here to flip a collection's baseURI to the IPFS pin we've prepared, you do **three things**:

1. **Review.** Open the collection's `collections/<slug>/INSTRUCTIONS.md`. It contains the contract, function, exact argument string, and the Etherscan links. Six collections are ready: [Grails V](collections/grails-v/INSTRUCTIONS.md), [Grails IV](collections/grails-iv/INSTRUCTIONS.md), [Grails III](collections/grails-iii/INSTRUCTIONS.md), [Grails II](collections/grails-ii/INSTRUCTIONS.md), [Grails I](collections/grails-i/INSTRUCTIONS.md) ⚠️ *different URI shape*, [Diamond Exhibition](collections/diamond-exhibition-by-proof/INSTRUCTIONS.md).
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
| 2 | **Grails IV** | [`0x069ee…b8885`](https://etherscan.io/address/0x069eeda3395242bd0d382e3ec5738704569b8885) | 904 | 734 (~81%) | ✅ pinned & verified |
| 3 | **Grails III** | [`0x503a3…84A3`](https://etherscan.io/address/0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3) | 1,000 | 1,000 (100%) | ✅ pinned & verified |
| 4 | **Grails II** | [`0xd78af…ed96b`](https://etherscan.io/address/0xd78afb925a21f87fa0e35abae2aead3f70ced96b) | 1,178 | 1,178 (100%) | ✅ pinned & verified |
| 5 | **Grails I** ⚠️ special URI shape | [`0xb6329…b2b19`](https://etherscan.io/address/0xb6329bd2741c4e5e91e26c4e653db643e74b2b19) | 1,036 | 1,036 (100%) | ✅ pinned & verified — nested layout |
| 6 | **Diamond Exhibition** | [`0x68d0f…eec2e`](https://etherscan.io/address/0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e) | 5,093 | 1,407 (~28%) | ✅ pinned & verified |

**Removed from scope by user (after initial inclusion):** Archive of Feelings (Mika Tajima), The Journey, and PROOF Curated: Evolving Pixels. See `collections.json` → `skipped` for the per-contract note. The Journey's pin still exists on Pinata under CID `bafybeiagwvykjve4kgvxo7zku5kdivt26vmvkuhxgmjl6jbmc2lfznh6zu` (no longer recommended for migration); the other two never completed pinning.

**A note on OpenSea slugs vs on-chain contracts.** OpenSea has fragmented Grails I, II, III, *and* IV into per-artist landing pages — there is **no single "Grails I" / "II" / "III" / "IV" OpenSea page**. Grails V is the only season with a unified OpenSea collection (`grails-v`). And the slugs **`proof-grails`** and **`proof-grails-ii`** on OpenSea point at *unrelated* assets (Grails II Mint Pass contract `0x2c3fc1…f9fd`, and a 17-token Polygon edition contract, respectively). The contract addresses in the scope table above are the verified on-chain art contracts (via `name()` + sample `tokenURI()` content). **The repo's internal slugs (`grails-i`, `grails-ii`, …) are local directory names, *not* OpenSea slugs** — don't conflate them.

#### OpenSea collection pages per Grails season

Auto-grouped by OpenSea into one collection-per-Grail (artist). Each one points at a slice of the same on-chain contract; the contract address is what Proof will call `setBaseTokenURI(...)` on, regardless of how OpenSea slices the listing.

<details>
<summary><b>Grails I</b> — 20 per-artist pages (contract <code>0xb6329bd2741c4e5e91e26c4e653db643e74b2b19</code>)</summary>

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
<summary><b>Grails II</b> — 25 per-artist pages (contract <code>0xd78afb925a21f87fa0e35abae2aead3f70ced96b</code>)</summary>

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
<summary><b>Grails III</b> — 20 per-artist pages (contract <code>0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3</code>)</summary>

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
<summary><b>Grails IV</b> — 20 per-artist pages (contract <code>0x069eeda3395242bd0d382e3ec5738704569b8885</code>)</summary>

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
<summary><b>Grails V</b> — single unified page (contract <code>0x92a50fe6ede411bd26e171b97472e24d245349b8</code>)</summary>

OpenSea kept Grails V as a single collection (no auto-grouping by artist):

- https://opensea.io/collection/grails-v
</details>

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

## Why this migration is correct

The pin structure is designed to exactly mimic what the contracts already do, so the only thing that changes on-chain is one string. Five chained facts make it work end-to-end:

**1. The contracts' math.** For Proof-routed tokens, the Solidity is literally:

```solidity
return string.concat(_baseURI(), Strings.toString(tokenId));   // Diamond Exhibition
// or, via super.tokenURI() in the OZ ERC721A base:
return string(abi.encodePacked(baseURI, _toString(tokenId)));   // Grails IV / V / Evolving Pixels
```

So `tokenURI(id)` is precisely `baseTokenURI + decimal(id)`. No extension, no separator, no surprises.

**2. Our files are named to match the math.** `scripts/05-rewrite-metadata.js` writes each rewritten JSON to `ipfs-metadata/<id>` — token id as a bare string, no `.json` suffix. The directory is then pinned as a single Pinata directory upload (`scripts/06-pin-metadata.js`). After the flip:

```
baseTokenURI()  =  "ipfs://<metadataCID>/"
tokenURI(id)    =  baseTokenURI() + Strings.toString(id)
                =  "ipfs://<metadataCID>/" + "473"
                =  "ipfs://<metadataCID>/473"   ← resolves to ipfs-metadata/473 in the pin
```

The trailing slash on the baseURI is load-bearing. The pre-flight checklist in each collection's `INSTRUCTIONS.md` includes it explicitly.

**3. Media is also content-addressed.** Each unique media file was pinned individually with `pinata.upload.public.file()` (one CID per file). `scripts/05-rewrite-metadata.js` then replaces `image`, `animation_url`, `primary_asset_url`, and `preview_asset_url` inside every metadata JSON with `ipfs://<that-file's-CID>` (no path suffix — each CID is a single file). So once a wallet or marketplace fetches the metadata JSON via IPFS, the image/animation it references is also on IPFS. No URL touches `metadata.proof.xyz` or `storage.googleapis.com` after the flip.

**4. Sparse id sets work for mixed contracts.** For Diamond Exhibition, Grails IV, and Evolving Pixels, only the Proof-routed ids land in `ipfs-metadata/`. The Art Blocks-routed ids — say `5000000`, `6000000`, etc. — are absent from the directory. **This is intentional and safe:** the contract logic for those ids never calls `_baseURI()`, so it never tries to look up `ipfs://<CID>/5000000` (which would 404). Cross-reference the source snippets above — the Art Blocks branch returns `flex.tokenURI(...)` unconditionally.

**5. End-to-end verified before the tx.** `scripts/07-verify.js` re-fetches every pinned file through the public `ipfs.io` gateway and sha256-compares against the local copy. So we know, before handing over the CID, that:
- the directory CID resolves
- each child file at `ipfs://<CID>/<id>` is byte-identical to what we intended
- each `image` CID inside a metadata JSON resolves to a file of the right hash and size

For Grails V the verifier ran 785 metadata round-trips + 202 media round-trips and passed all 987 — see `collections/grails-v/verification-report.json`.

### Reversibility and portability

The on-chain change is a single string replacement and is fully reversible — see each collection's "Revert plan" section, which contains the verbatim previous `baseTokenURI()` string to pass back to the same setter.

Because IPFS is content-addressed, **the CIDs do not depend on which account pinned the bytes.** If Proof re-pins the exact same metadata and media from their own Pinata account (or any pinning service), they get the same CIDs — nothing on-chain needs to change. This means Proof can take long-term custody of the pins without any extra migration: re-pin from your account, then this account's pins can be released. See the "Recommended: re-pin under your own Pinata account" note in each `INSTRUCTIONS.md`.

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

### Diamond Exhibition — **READY TO SEND**

Pipeline complete: 1407/1407 metadata + 520/520 media verified end-to-end. Full handoff doc: [`collections/diamond-exhibition-by-proof/INSTRUCTIONS.md`](collections/diamond-exhibition-by-proof/INSTRUCTIONS.md).

| | |
|---|---|
| Contract | [`0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e`](https://etherscan.io/address/0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e) |
| Function | `setBaseTokenURI(string)` |
| **Argument to pass** | `ipfs://bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i/` &nbsp;_(trailing slash required)_ |
| Etherscan: read | [readContract](https://etherscan.io/address/0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e#readContract) |
| Etherscan: write | [writeContract](https://etherscan.io/address/0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e#writeContract) |
| Caller permission | Standard ERC721A + Ownable; sign from `owner()`. |
| Token indexing | **0-indexed**, tokens `0..5092` (totalSupply 5093) |
| Mixed routing | **1,407 Proof-routed** (affected) + **3,686 Art Blocks-routed** (unaffected — full id list in `collections/diamond-exhibition-by-proof/state.json` → `skippedArtblocksIds`) |

**Pre-flight verification links:**
- https://ipfs.io/ipfs/bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i/100 (Proof-routed)
- https://ipfs.io/ipfs/bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i/11 (404 expected — AB-routed; contract keeps returning Art Blocks URL after flip)

**Post-flip sanity check:** on [Etherscan readContract](https://etherscan.io/address/0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e#readContract), call `tokenURI(100)` → should return `ipfs://<newCID>/100`; call `tokenURI(11)` → should still return `https://token.artblocks.io/...` (unchanged, Art Blocks-routed).

**Revert plan:** `setBaseTokenURI("https://metadata.proof.xyz/diamond-exhibition/")`

**Findings worth noting:**

- The biggest mixed-routing contract: **only 1,407 of 5,093 tokens** are affected by the baseURI flip. The other 3,686 are dispatched inside `tokenURI(uint256)` to Art Blocks and remain on `token.artblocks.io` (unchanged behavior).
- Per-token AB filter exercised at its largest scale here. 3,686 AB-routed ids correctly skipped during step 02 fetch.
- 1,407 tokens → **520 unique media files** (significant edition dedup; many curated drops share images across editions).
- Source images are signed GCS URLs with the same far-future expiry as Grails V (`Expires=1787875200` ≈ 2026-08-28). Months of headroom — no time-bomb urgency.
- Used the **HEAD-MD5 manifest trick** developed for Grails III to skip 1,217 redundant downloads (URLs that resolved to already-on-disk content), saving ~30 min of bandwidth; only 190 truly-new files needed downloading.
- 2 verify round-trips initially failed (`HTTP 502` + `terminated`); both passed on retry.

---

### Grails III — **READY TO SEND**

Pipeline complete: 1000/1000 metadata + 424/424 media verified end-to-end. Full handoff doc: [`collections/grails-iii/INSTRUCTIONS.md`](collections/grails-iii/INSTRUCTIONS.md).

| | |
|---|---|
| Contract | [`0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3`](https://etherscan.io/address/0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3) |
| Function | `setBaseTokenURI(string)` |
| **Argument to pass** | `ipfs://bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q/` &nbsp;_(trailing slash required)_ |
| Etherscan: read | [readContract](https://etherscan.io/address/0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3#readContract) |
| Etherscan: write | [writeContract](https://etherscan.io/address/0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3#writeContract) |
| Caller permission | Standard ERC721A + Ownable; sign from `owner()`. |
| Token indexing | **0-indexed**, tokens `0..999` (totalSupply 1000) |

**Pre-flight verification links:**
- https://ipfs.io/ipfs/bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q/0
- https://dweb.link/ipfs/bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q/500

**Revert plan:** `setBaseTokenURI("https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/3/")`

**Findings worth noting:**

- 1,000 tokens across **20 artists** (0xDEAFBEEF, Rik Oostenbroek, Mika Tajima, Matt Kane, …); the contract uses a single `metadata/3/<id>` baseURI (no nested grailId path like Grails I).
- Mixed source hosts inside the metadata:
  - **GCS signed URLs** (most images) — expire 30 min after issue. Pipeline race-condition hazard.
  - **Arweave** (60 fields across the "there goes that kid" series — Alpha Centauri Kid) — permanent storage; the 1.1 KB animation URL is an HTML wrapper rather than the image itself.
  - **Pre-existing `ipfs://`** URLs (100 fields, all on Matt Kane's *Picture of the Planets*) — these were already content-addressed before the migration; the rewrite step correctly leaves them untouched.
- **Recovery from expired-signature trap:** the first run of step 03 left only 221/1000 tokens with a working image entry because the 30-minute GCS signatures expired during the download window. Recovery: re-fetched fresh metadata, used HEAD-only `x-goog-hash` MD5 lookups to map fresh signed URLs to the **423 sha256-named files already on disk** (no re-downloading bytes for content we already have), downloaded only the 42 new GCS objects + 2 Arweave URLs that had no local match, and re-built the manifest. **The HEAD-MD5-map trick is the right way to handle expiring-signed-URL re-runs** — saved hours of bandwidth.
- Heavy media dedup: 1,000 tokens → **424 unique media files** (8 of those are 100–285 MB MP4s; the rest are small images).
- 1 verify mismatch ended up being an `ipfs.io` gateway cache bug: it returns 1397 bytes for a CID whose content is genuinely 1126 bytes (verified directly via `gateway.pinata.cloud` and by re-fetching from Pinata). The pin itself is correct; the report's `notes` field documents the gateway issue.
- **Per-upload timeout added** (`scripts/04-pin-media.js`): pin-media now wraps each upload in a 15-min `Promise.race` deadline because the Pinata SDK was hard-hanging on some large MP4s without aborting; previously this had to be killed manually.

---

### Grails II — **READY TO SEND**

Pipeline complete: 1178/1178 metadata + 55/55 media verified end-to-end on `ipfs.io`. Full handoff doc: [`collections/grails-ii/INSTRUCTIONS.md`](collections/grails-ii/INSTRUCTIONS.md).

| | |
|---|---|
| Contract | [`0xd78afb925a21f87fa0e35abae2aead3f70ced96b`](https://etherscan.io/address/0xd78afb925a21f87fa0e35abae2aead3f70ced96b) |
| Function | `setBaseTokenURI(string)` |
| **Argument to pass** | `ipfs://bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm/` &nbsp;_(trailing slash required)_ |
| Etherscan: read | [readContract](https://etherscan.io/address/0xd78afb925a21f87fa0e35abae2aead3f70ced96b#readContract) |
| Etherscan: write | [writeContract](https://etherscan.io/address/0xd78afb925a21f87fa0e35abae2aead3f70ced96b#writeContract) |
| Caller permission | Standard ERC721A + Ownable; sign from `owner()`. |
| Token indexing | **0-indexed**, tokens `0..1177` (totalSupply 1178) |

**Pre-flight verification links:**
- https://ipfs.io/ipfs/bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm/0
- https://dweb.link/ipfs/bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm/500

**Revert plan:** `setBaseTokenURI("https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/2/")`

**Findings worth noting:**

- Standard ERC721A + BaseTokenURI override pattern (`baseURI + Strings.toString(tokenId)`) — verified in `Grails2.sol` / `ERC721A.sol` on Sourcify. No nested-pin trickery like Grails I.
- Extreme media dedup: 1,178 tokens → only **55 unique media files** (~21 editions per piece on average).
- One file is a large 84 MB animated GIF (`9b2a01cc…gif`, used by 39 tokens). During the parallel run with 2 other pipelines hitting Pinata, this file timed out through all 4 retries and pin-media exited 54/55. After pausing the other pipelines, the same file pinned cleanly on the first attempt running solo — clear evidence of Pinata's per-account throughput ceiling under concurrent uploads.
- 41 verify round-trips initially failed (35 × HTTP 429 + 6 × HTTP 504 from `ipfs.io`); all succeeded on retry. **Note for future runs: ipfs.io applies rate-limit windows — verify-time errors are largely benign and self-recover with a small backoff.**

---

### Grails I — **READY TO SEND** ⚠️ different URI shape from every other contract

⚠️ Read [`collections/grails-i/INSTRUCTIONS.md`](collections/grails-i/INSTRUCTIONS.md) **carefully** before sending. Grails I's contract constructs `tokenURI` as `baseTokenURI + "/" + grailId + "/" + tokenId` — different from every other Proof contract in this repo, which all use `baseURI + tokenId`. The IPFS pin is a **nested directory** (`<grailId>/<tokenId>`), and the argument to `setBaseTokenURI(...)` **must NOT end with a slash**.

| | |
|---|---|
| Contract | [`0xb6329bd2741c4e5e91e26c4e653db643e74b2b19`](https://etherscan.io/address/0xb6329bd2741c4e5e91e26c4e653db643e74b2b19) |
| Function | `setBaseTokenURI(string)` |
| **Argument to pass** | `ipfs://bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m` &nbsp;**_(no trailing slash — the contract supplies it)_** |
| Etherscan: read | [readContract](https://etherscan.io/address/0xb6329bd2741c4e5e91e26c4e653db643e74b2b19#readContract) |
| Etherscan: write | [writeContract](https://etherscan.io/address/0xb6329bd2741c4e5e91e26c4e653db643e74b2b19#writeContract) |
| Caller permission | `Ownable` — sign from `owner()` |
| Token indexing | **0-indexed**, tokens `0..1035` (totalSupply 1036), **nested across 20 grailIds (0..19)** |

After the change: `tokenURI(0)` returns `ipfs://<CID>/0/0` (Gary Vaynerchuk — *What do you "B"*), `tokenURI(500)` returns `ipfs://<CID>/15/500` (Claire Silver — *c.u.l.t.*), etc.

**Pre-flight verification links** (nested paths):
- https://ipfs.io/ipfs/bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m/0/0 (token 0)
- https://ipfs.io/ipfs/bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m/14/100 (token 100, Ixian No-Ships)
- https://ipfs.io/ipfs/bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m/15/500 (token 500, c.u.l.t.)

**Revert plan:** `setBaseTokenURI("https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/1")` (no trailing slash).

**Findings worth noting:**
- Unique URI shape — required pinning a **nested directory** (`<grailId>/<tokenId>`) instead of flat. Same end-to-end content (rewritten JSON with `ipfs://` image fields), different on-chain wrapper.
- Extreme media dedup: 1036 tokens → only **20 unique media files** (one per grail/artist). Pin step was very fast.
- 20 grails maps 1:1 to the 20 per-artist OpenSea collection pages listed earlier in this README.
- 6 verification round-trips initially failed with HTTP 504 from `ipfs.io` on the first verify pass; all succeeded on retry.

---

### Grails IV — **READY TO SEND**

Pipeline complete: 728/728 metadata + 84/84 media verified end-to-end on `ipfs.io`. Full handoff doc: [`collections/grails-iv/INSTRUCTIONS.md`](collections/grails-iv/INSTRUCTIONS.md).

| | |
|---|---|
| Contract | [`0x069eeda3395242bd0d382e3ec5738704569b8885`](https://etherscan.io/address/0x069eeda3395242bd0d382e3ec5738704569b8885) |
| Function | `setBaseTokenURI(string)` |
| **Argument to pass** | `ipfs://bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m/` &nbsp;_(trailing slash required)_ |
| Etherscan: read | [readContract](https://etherscan.io/address/0x069eeda3395242bd0d382e3ec5738704569b8885#readContract) |
| Etherscan: write | [writeContract](https://etherscan.io/address/0x069eeda3395242bd0d382e3ec5738704569b8885#writeContract) |
| Caller permission | Contract uses **AccessControl** (no public `owner()`). Verify the required role before sending. |
| Token indexing | **0-indexed**, tokens `0..903` (totalSupply 904) |
| Mixed routing | **734 Proof-routed** (affected) + **170 Art Blocks-routed** (unaffected — full id list in `collections/grails-iv/state.json` → `skippedArtblocksIds`) |

**Pre-flight verification links:**
- https://ipfs.io/ipfs/bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m/0
- https://dweb.link/ipfs/bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m/0

**Revert plan:** `setBaseTokenURI("https://metadata.proof.xyz/grails-iv/art/")`

**Findings worth noting:**

- Mixed-routing contract — only 734 of 904 tokens read `baseTokenURI`; the 170 Art Blocks ids are dispatched inside `tokenURI(uint256)` and unaffected by the setter (see "How Art Blocks tokens are handled" above for the verified source).
- Per-token AB filter exercised cleanly for the first time on a real mixed contract — 170/170 correctly skipped, 734/734 fetched and pinned.
- Heavy edition-sharing: 734 Proof-routed tokens → only **84 unique media files** (~9 editions each on average).
- Source images use **expiring GCS signed URLs** (`Expires=1787875200` = 2026-08-28) — same time-bomb as Grails V. Migration urgency is high.
- 7 verification round-trips initially failed with HTTP 504 from `ipfs.io` (transient gateway overload on small JSON files); all succeeded on retry.

---

The same procedure applies to the other contracts once their pipelines finish; their CIDs and any per-contract caveats land in each collection's `INSTRUCTIONS.md`. As each one completes, a "READY TO SEND" subsection is added here.

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

