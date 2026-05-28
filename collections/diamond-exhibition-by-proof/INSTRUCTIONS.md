# Diamond Exhibition — IPFS migration instructions

## Summary

| Field | Value |
|---|---|
| Collection | Diamond Exhibition (DIAMOND) |
| Contract | `0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e` |
| Chain | ethereum |
| Total supply | 5093 (tokens 0..5092, **0-indexed**) |
| Tokens affected by this change | **1407** (the rest are routed inside `tokenURI(uint256)` to `token.artblocks.io` and are unaffected by `baseTokenURI`) |
| Art Blocks-routed ids (unaffected) | 3686 ids (see `state.json` → `skippedArtblocksIds`) |
| Deployer | `0x32220f07DBcd18149f619F28cD09FD911cc0372D` |
| Current baseURI sample | `https://token.artblocks.io/0x1353fd9d3dc70d1a18149c8fb2adb4fb906de4e8/5000000` |
| Current `baseTokenURI()` | `https://metadata.proof.xyz/diamond-exhibition/` |
| New baseURI | `ipfs://bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i/` |
| Metadata CID (directory pin) | `bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i` |
| Media pins | 520 files, each pinned with its own CID (see `state.json` → `mediaPins` for the full map) |

## The change

Call **`setBaseTokenURI("ipfs://bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i/")`** on contract `0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e`.

After the change, `tokenURI(0)` will return `ipfs://bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i/0` — i.e. it will resolve to:

`https://gateway.pinata.cloud/ipfs/bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i/0`

Each metadata file's `image` (and any other media-shaped field) has been rewritten to `ipfs://<per-file-CID>` — each media file was pinned individually so each has its own content-addressed root CID.

**Caller required:** contract uses AccessControl (no public `owner()`). Verify the required role on Etherscan before calling (typically `DEFAULT_ADMIN_ROLE` or a steering/admin role).

## Pre-flight checklist

- [ ] Confirm the caller has the required role/ownership on `0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e`.
- [ ] Re-fetch `tokenURI(0)` *now* via Etherscan Read Contract and capture the existing baseURI for a possible revert.
- [ ] Pull this CID through several public gateways and spot-check 3 tokens before sending the tx:
  - `https://gateway.pinata.cloud/ipfs/bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i/0`
  - `https://ipfs.io/ipfs/bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i/0`
  - `https://dweb.link/ipfs/bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i/0`
- [ ] Run the OpenSea metadata refresh on a single token after the tx lands; confirm it picks up the new `ipfs://` image. Then trigger a collection-wide refresh.

## How to call

**Etherscan Write Contract** (connect the owning wallet): https://etherscan.io/address/0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e#writeContract

**Cast / forge:**

```bash
cast send 0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e "setBaseTokenURI(string)" "ipfs://bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i/" \
  --rpc-url <RPC> --private-key <KEY>
```

**ethers.js v6:**

```js
const c = new ethers.Contract("0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e", [
  "function setBaseTokenURI(string)"
], wallet);
await c.setBaseTokenURI("ipfs://bafybeihutjrictszafrxcqbgj2rfmdmlhmsgbcubhlcl4x2mx4m7zpot6i/");
```

## Revert plan

If anything is wrong, call the same setter with the **previous** baseURI captured at the time of generation:

```
setBaseTokenURI("https://metadata.proof.xyz/diamond-exhibition/")
```

The change is fully reversible — no state migration, just a string replacement.

## Read-contract URL (for sanity checks before & after)

https://etherscan.io/address/0x68d0f6d1d99bb830e17ffaa8adb5bbed9d6eec2e#readContract

---

_Generated 2026-05-28T01:28:59.579Z by proofxyz-ipfs pipeline. Verification report (sha256 round-trip vs the pin) is in this collection's directory at `verification-report.json`._
