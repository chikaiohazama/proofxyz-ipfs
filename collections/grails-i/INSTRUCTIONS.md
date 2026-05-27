# PROOF Collective Grails — IPFS migration instructions

## Summary

| Field | Value |
|---|---|
| Collection | PROOF Collective Grails (GRAIL) |
| Contract | `0xb6329bd2741c4e5e91e26c4e653db643e74b2b19` |
| Chain | ethereum |
| Total supply | 1036 (tokens 0..1035, **0-indexed**) |
| Deployer | `0x6c8984bAf566Db08675310b122BF0be9Ea269ecA` |
| Current baseURI sample | `https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/1/0/0` |
| Current `baseTokenURI()` | `https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/1` |
| New baseURI | `ipfs://bafybeibq6meyaipz76cdm556qxf5zumllxboilad7ydd6oqf2erulbhrba/` |
| Metadata CID (directory pin) | `bafybeibq6meyaipz76cdm556qxf5zumllxboilad7ydd6oqf2erulbhrba` |
| Media pins | 20 files, each pinned with its own CID (see `state.json` → `mediaPins` for the full map) |

## The change

Call **`setBaseTokenURI("ipfs://bafybeibq6meyaipz76cdm556qxf5zumllxboilad7ydd6oqf2erulbhrba/")`** on contract `0xb6329bd2741c4e5e91e26c4e653db643e74b2b19`.

After the change, `tokenURI(0)` will return `ipfs://bafybeibq6meyaipz76cdm556qxf5zumllxboilad7ydd6oqf2erulbhrba/0` — i.e. it will resolve to:

`https://gateway.pinata.cloud/ipfs/bafybeibq6meyaipz76cdm556qxf5zumllxboilad7ydd6oqf2erulbhrba/0`

Each metadata file's `image` (and any other media-shaped field) has been rewritten to `ipfs://<per-file-CID>` — each media file was pinned individually so each has its own content-addressed root CID.

**Caller required:** `owner()` = `0x83895F7508926741CD2147C4AAC65C30a851Cc30`

## Pre-flight checklist

- [ ] Confirm the caller has the required role/ownership on `0xb6329bd2741c4e5e91e26c4e653db643e74b2b19`.
- [ ] Re-fetch `tokenURI(0)` *now* via Etherscan Read Contract and capture the existing baseURI for a possible revert.
- [ ] Pull this CID through several public gateways and spot-check 3 tokens before sending the tx:
  - `https://gateway.pinata.cloud/ipfs/bafybeibq6meyaipz76cdm556qxf5zumllxboilad7ydd6oqf2erulbhrba/0`
  - `https://ipfs.io/ipfs/bafybeibq6meyaipz76cdm556qxf5zumllxboilad7ydd6oqf2erulbhrba/0`
  - `https://dweb.link/ipfs/bafybeibq6meyaipz76cdm556qxf5zumllxboilad7ydd6oqf2erulbhrba/0`
- [ ] Run the OpenSea metadata refresh on a single token after the tx lands; confirm it picks up the new `ipfs://` image. Then trigger a collection-wide refresh.

## How to call

**Etherscan Write Contract** (connect the owning wallet): https://etherscan.io/address/0xb6329bd2741c4e5e91e26c4e653db643e74b2b19#writeContract

**Cast / forge:**

```bash
cast send 0xb6329bd2741c4e5e91e26c4e653db643e74b2b19 "setBaseTokenURI(string)" "ipfs://bafybeibq6meyaipz76cdm556qxf5zumllxboilad7ydd6oqf2erulbhrba/" \
  --rpc-url <RPC> --private-key <KEY>
```

**ethers.js v6:**

```js
const c = new ethers.Contract("0xb6329bd2741c4e5e91e26c4e653db643e74b2b19", [
  "function setBaseTokenURI(string)"
], wallet);
await c.setBaseTokenURI("ipfs://bafybeibq6meyaipz76cdm556qxf5zumllxboilad7ydd6oqf2erulbhrba/");
```

## Revert plan

If anything is wrong, call the same setter with the **previous** baseURI captured at the time of generation:

```
setBaseTokenURI("https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/1")
```

The change is fully reversible — no state migration, just a string replacement.

## Read-contract URL (for sanity checks before & after)

https://etherscan.io/address/0xb6329bd2741c4e5e91e26c4e653db643e74b2b19#readContract

---

_Generated 2026-05-27T16:45:54.816Z by proofxyz-ipfs pipeline. Verification report (sha256 round-trip vs the pin) is in this collection's directory at `verification-report.json`._
