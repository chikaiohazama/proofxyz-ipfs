# PROOF Grails II — IPFS migration instructions

## Summary

| Field | Value |
|---|---|
| Collection | PROOF Grails II (GRAIL2) |
| Contract | `0xd78afb925a21f87fa0e35abae2aead3f70ced96b` |
| Chain | ethereum |
| Total supply | 1178 (tokens 0..1177, **0-indexed**) |
| Deployer | `0x1b945Af93d5A27A0041EfEa8FFD84AFbBc478895` |
| Current baseURI sample | `https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/2/0` |
| Current `baseTokenURI()` | `https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/2/` |
| New baseURI | `ipfs://bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm/` |
| Metadata CID (directory pin) | `bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm` |
| Media pins | 55 files, each pinned with its own CID (see `state.json` → `mediaPins` for the full map) |

## The change

Call **`setBaseTokenURI("ipfs://bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm/")`** on contract `0xd78afb925a21f87fa0e35abae2aead3f70ced96b`.

After the change, `tokenURI(0)` will return `ipfs://bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm/0` — i.e. it will resolve to:

`https://gateway.pinata.cloud/ipfs/bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm/0`

Each metadata file's `image` (and any other media-shaped field) has been rewritten to `ipfs://<per-file-CID>` — each media file was pinned individually so each has its own content-addressed root CID.

**Caller required:** `owner()` = `0x70c71b539BDcB5b59Edd42a500Fd95bdeC962650`

## Pre-flight checklist

- [ ] Confirm the caller has the required role/ownership on `0xd78afb925a21f87fa0e35abae2aead3f70ced96b`.
- [ ] Re-fetch `tokenURI(0)` *now* via Etherscan Read Contract and capture the existing baseURI for a possible revert.
- [ ] Pull this CID through several public gateways and spot-check 3 tokens before sending the tx:
  - `https://gateway.pinata.cloud/ipfs/bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm/0`
  - `https://ipfs.io/ipfs/bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm/0`
  - `https://dweb.link/ipfs/bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm/0`
- [ ] Run the OpenSea metadata refresh on a single token after the tx lands; confirm it picks up the new `ipfs://` image. Then trigger a collection-wide refresh.

## How to call

**Etherscan Write Contract** (connect the owning wallet): https://etherscan.io/address/0xd78afb925a21f87fa0e35abae2aead3f70ced96b#writeContract

**Cast / forge:**

```bash
cast send 0xd78afb925a21f87fa0e35abae2aead3f70ced96b "setBaseTokenURI(string)" "ipfs://bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm/" \
  --rpc-url <RPC> --private-key <KEY>
```

**ethers.js v6:**

```js
const c = new ethers.Contract("0xd78afb925a21f87fa0e35abae2aead3f70ced96b", [
  "function setBaseTokenURI(string)"
], wallet);
await c.setBaseTokenURI("ipfs://bafybeibmssdlwuorheuay6apc7vghpzhbj4y2q6knshkgmtb2y57w3lvrm/");
```

## Revert plan

If anything is wrong, call the same setter with the **previous** baseURI captured at the time of generation:

```
setBaseTokenURI("https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/2/")
```

The change is fully reversible — no state migration, just a string replacement.

## Read-contract URL (for sanity checks before & after)

https://etherscan.io/address/0xd78afb925a21f87fa0e35abae2aead3f70ced96b#readContract

---

_Generated 2026-05-27T17:50:02.796Z by proofxyz-ipfs pipeline. Verification report (sha256 round-trip vs the pin) is in this collection's directory at `verification-report.json`._
