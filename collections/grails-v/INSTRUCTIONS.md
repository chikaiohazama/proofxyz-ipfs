# Grails V — IPFS migration instructions

## Summary

| Field | Value |
|---|---|
| Collection | Grails V (GRAILS5) |
| Contract | `0x92a50fe6ede411bd26e171b97472e24d245349b8` |
| Chain | ethereum |
| Total supply | 785 (tokens 0..784, **0-indexed**) |
| Tokens affected by this change | **732** (the rest are routed inside `tokenURI(uint256)` to `token.artblocks.io` and are unaffected by `baseTokenURI`) |
| Art Blocks-routed ids (unaffected) | 53 ids (see `state.json` → `skippedArtblocksIds`) |
| Deployer | `0x32220f07DBcd18149f619F28cD09FD911cc0372D` |
| Current baseURI sample | `https://metadata.proof.xyz/grails-v/art/0` |
| Current `baseTokenURI()` | `https://metadata.proof.xyz/grails-v/art/` |
| New baseURI | `ipfs://bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/` |
| Metadata CID (directory pin) | `bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq` |
| Media pins | 202 files, each pinned with its own CID (see `state.json` → `mediaPins` for the full map) |

## The change

Call **`setBaseTokenURI("ipfs://bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/")`** on contract `0x92a50fe6ede411bd26e171b97472e24d245349b8`.

After the change, `tokenURI(0)` will return `ipfs://bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/0` — i.e. it will resolve to:

`https://gateway.pinata.cloud/ipfs/bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/0`

Each metadata file's `image` (and any other media-shaped field) has been rewritten to `ipfs://<per-file-CID>` — each media file was pinned individually so each has its own content-addressed root CID.

**Caller required:** contract uses AccessControl (no public `owner()`). Verify the required role on Etherscan before calling (typically `DEFAULT_ADMIN_ROLE` or a steering/admin role).

## Pre-flight checklist

- [ ] Confirm the caller has the required role/ownership on `0x92a50fe6ede411bd26e171b97472e24d245349b8`.
- [ ] Re-fetch `tokenURI(0)` *now* via Etherscan Read Contract and capture the existing baseURI for a possible revert.
- [ ] Pull this CID through several public gateways and spot-check 3 tokens before sending the tx:
  - `https://gateway.pinata.cloud/ipfs/bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/0`
  - `https://ipfs.io/ipfs/bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/0`
  - `https://dweb.link/ipfs/bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/0`
- [ ] Run the OpenSea metadata refresh on a single token after the tx lands; confirm it picks up the new `ipfs://` image. Then trigger a collection-wide refresh.

## How to call

**Etherscan Write Contract** (connect the owning wallet): https://etherscan.io/address/0x92a50fe6ede411bd26e171b97472e24d245349b8#writeContract

**Cast / forge:**

```bash
cast send 0x92a50fe6ede411bd26e171b97472e24d245349b8 "setBaseTokenURI(string)" "ipfs://bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/" \
  --rpc-url <RPC> --private-key <KEY>
```

**ethers.js v6:**

```js
const c = new ethers.Contract("0x92a50fe6ede411bd26e171b97472e24d245349b8", [
  "function setBaseTokenURI(string)"
], wallet);
await c.setBaseTokenURI("ipfs://bafybeib7zuh3d5ok3zr2lfnz7gryqlbc2bf7z6qlte5gey6rrqv5au5scq/");
```

## Revert plan

If anything is wrong, call the same setter with the **previous** baseURI captured at the time of generation:

```
setBaseTokenURI("https://metadata.proof.xyz/grails-v/art/")
```

The change is fully reversible — no state migration, just a string replacement.

## Read-contract URL (for sanity checks before & after)

https://etherscan.io/address/0x92a50fe6ede411bd26e171b97472e24d245349b8#readContract

---

_Generated 2026-05-27T05:14:45.130Z by proofxyz-ipfs pipeline. Verification report (sha256 round-trip vs the pin) is in this collection's directory at `verification-report.json`._
