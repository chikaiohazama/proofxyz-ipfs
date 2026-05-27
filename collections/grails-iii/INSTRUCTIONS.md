# Grails III — IPFS migration instructions

## Summary

| Field | Value |
|---|---|
| Collection | Grails III (GRAIL3) |
| Contract | `0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3` |
| Chain | ethereum |
| Total supply | 1000 (tokens 0..999, **0-indexed**) |
| Deployer | `0x1b945Af93d5A27A0041EfEa8FFD84AFbBc478895` |
| Current baseURI sample | `https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/3/0` |
| Current `baseTokenURI()` | `https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/3/` |
| New baseURI | `ipfs://bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q/` |
| Metadata CID (directory pin) | `bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q` |
| Media pins | 424 files, each pinned with its own CID (see `state.json` → `mediaPins` for the full map) |

## The change

Call **`setBaseTokenURI("ipfs://bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q/")`** on contract `0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3`.

After the change, `tokenURI(0)` will return `ipfs://bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q/0` — i.e. it will resolve to:

`https://gateway.pinata.cloud/ipfs/bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q/0`

Each metadata file's `image` (and any other media-shaped field) has been rewritten to `ipfs://<per-file-CID>` — each media file was pinned individually so each has its own content-addressed root CID.

**Caller required:** `owner()` = `0x70c71b539BDcB5b59Edd42a500Fd95bdeC962650`

## Pre-flight checklist

- [ ] Confirm the caller has the required role/ownership on `0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3`.
- [ ] Re-fetch `tokenURI(0)` *now* via Etherscan Read Contract and capture the existing baseURI for a possible revert.
- [ ] Pull this CID through several public gateways and spot-check 3 tokens before sending the tx:
  - `https://gateway.pinata.cloud/ipfs/bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q/0`
  - `https://ipfs.io/ipfs/bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q/0`
  - `https://dweb.link/ipfs/bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q/0`
- [ ] Run the OpenSea metadata refresh on a single token after the tx lands; confirm it picks up the new `ipfs://` image. Then trigger a collection-wide refresh.

## How to call

**Etherscan Write Contract** (connect the owning wallet): https://etherscan.io/address/0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3#writeContract

**Cast / forge:**

```bash
cast send 0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3 "setBaseTokenURI(string)" "ipfs://bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q/" \
  --rpc-url <RPC> --private-key <KEY>
```

**ethers.js v6:**

```js
const c = new ethers.Contract("0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3", [
  "function setBaseTokenURI(string)"
], wallet);
await c.setBaseTokenURI("ipfs://bafybeibywzutnorhrucp5lbhnd54kke5eclta7k5cgl34mhkyh45gl747q/");
```

## Revert plan

If anything is wrong, call the same setter with the **previous** baseURI captured at the time of generation:

```
setBaseTokenURI("https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/3/")
```

The change is fully reversible — no state migration, just a string replacement.

## Read-contract URL (for sanity checks before & after)

https://etherscan.io/address/0x503a3039e9ce236e9a12E4008AECBB1FD8B384A3#readContract

---

_Generated 2026-05-27T22:37:19.624Z by proofxyz-ipfs pipeline. Verification report (sha256 round-trip vs the pin) is in this collection's directory at `verification-report.json`._
