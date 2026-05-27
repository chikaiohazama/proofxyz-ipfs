# The Journey — IPFS migration instructions

## Summary

| Field | Value |
|---|---|
| Collection | The Journey (JOURNEY) |
| Contract | `0xd5386794f57697ab4ecb930b049da70fc771900b` |
| Chain | ethereum |
| Total supply | 96 (tokens 0..95, **0-indexed**) |
| Deployer | `0x32220f07DBcd18149f619F28cD09FD911cc0372D` |
| Current baseURI sample | `https://storage.googleapis.com/collection-assets-public/the-journey/json/0` |
| Current `baseTokenURI()` | `https://storage.googleapis.com/collection-assets-public/the-journey/json/` |
| New baseURI | `ipfs://bafybeiagwvykjve4kgvxo7zku5kdivt26vmvkuhxgmjl6jbmc2lfznh6zu/` |
| Metadata CID (directory pin) | `bafybeiagwvykjve4kgvxo7zku5kdivt26vmvkuhxgmjl6jbmc2lfznh6zu` |
| Media pins | 96 files, each pinned with its own CID (see `state.json` → `mediaPins` for the full map) |

## The change

Call **`setBaseTokenURI("ipfs://bafybeiagwvykjve4kgvxo7zku5kdivt26vmvkuhxgmjl6jbmc2lfznh6zu/")`** on contract `0xd5386794f57697ab4ecb930b049da70fc771900b`.

After the change, `tokenURI(0)` will return `ipfs://bafybeiagwvykjve4kgvxo7zku5kdivt26vmvkuhxgmjl6jbmc2lfznh6zu/0` — i.e. it will resolve to:

`https://gateway.pinata.cloud/ipfs/bafybeiagwvykjve4kgvxo7zku5kdivt26vmvkuhxgmjl6jbmc2lfznh6zu/0`

Each metadata file's `image` (and any other media-shaped field) has been rewritten to `ipfs://<per-file-CID>` — each media file was pinned individually so each has its own content-addressed root CID.

**Caller required:** contract uses AccessControl (no public `owner()`). Verify the required role on Etherscan before calling (typically `DEFAULT_ADMIN_ROLE` or a steering/admin role).

## Pre-flight checklist

- [ ] Confirm the caller has the required role/ownership on `0xd5386794f57697ab4ecb930b049da70fc771900b`.
- [ ] Re-fetch `tokenURI(0)` *now* via Etherscan Read Contract and capture the existing baseURI for a possible revert.
- [ ] Pull this CID through several public gateways and spot-check 3 tokens before sending the tx:
  - `https://gateway.pinata.cloud/ipfs/bafybeiagwvykjve4kgvxo7zku5kdivt26vmvkuhxgmjl6jbmc2lfznh6zu/0`
  - `https://ipfs.io/ipfs/bafybeiagwvykjve4kgvxo7zku5kdivt26vmvkuhxgmjl6jbmc2lfznh6zu/0`
  - `https://dweb.link/ipfs/bafybeiagwvykjve4kgvxo7zku5kdivt26vmvkuhxgmjl6jbmc2lfznh6zu/0`
- [ ] Run the OpenSea metadata refresh on a single token after the tx lands; confirm it picks up the new `ipfs://` image. Then trigger a collection-wide refresh.

## How to call

**Etherscan Write Contract** (connect the owning wallet): https://etherscan.io/address/0xd5386794f57697ab4ecb930b049da70fc771900b#writeContract

**Cast / forge:**

```bash
cast send 0xd5386794f57697ab4ecb930b049da70fc771900b "setBaseTokenURI(string)" "ipfs://bafybeiagwvykjve4kgvxo7zku5kdivt26vmvkuhxgmjl6jbmc2lfznh6zu/" \
  --rpc-url <RPC> --private-key <KEY>
```

**ethers.js v6:**

```js
const c = new ethers.Contract("0xd5386794f57697ab4ecb930b049da70fc771900b", [
  "function setBaseTokenURI(string)"
], wallet);
await c.setBaseTokenURI("ipfs://bafybeiagwvykjve4kgvxo7zku5kdivt26vmvkuhxgmjl6jbmc2lfznh6zu/");
```

## Revert plan

If anything is wrong, call the same setter with the **previous** baseURI captured at the time of generation:

```
setBaseTokenURI("https://storage.googleapis.com/collection-assets-public/the-journey/json/")
```

The change is fully reversible — no state migration, just a string replacement.

## Read-contract URL (for sanity checks before & after)

https://etherscan.io/address/0xd5386794f57697ab4ecb930b049da70fc771900b#readContract

---

_Generated 2026-05-27T15:32:55.253Z by proofxyz-ipfs pipeline. Verification report (sha256 round-trip vs the pin) is in this collection's directory at `verification-report.json`._
