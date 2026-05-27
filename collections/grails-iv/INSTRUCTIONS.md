# Grails IV — IPFS migration instructions

## Summary

| Field | Value |
|---|---|
| Collection | Grails IV (GRAILS4) |
| Contract | `0x069eeda3395242bd0d382e3ec5738704569b8885` |
| Chain | ethereum |
| Total supply | 904 (tokens 0..903, **0-indexed**) |
| Tokens affected by this change | **734** (the rest are routed inside `tokenURI(uint256)` to `token.artblocks.io` and are unaffected by `baseTokenURI`) |
| Art Blocks-routed ids (unaffected) | 170 ids (see `state.json` → `skippedArtblocksIds`) |
| Deployer | `0x32220f07DBcd18149f619F28cD09FD911cc0372D` |
| Current baseURI sample | `https://token.artblocks.io/0x294fed5f1d3d30cfa6fe86a937dc3141eec8bc6d/3000000` |
| Current `baseTokenURI()` | `https://metadata.proof.xyz/grails-iv/art/` |
| New baseURI | `ipfs://bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m/` |
| Metadata CID (directory pin) | `bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m` |
| Media pins | 84 files, each pinned with its own CID (see `state.json` → `mediaPins` for the full map) |

## The change

Call **`setBaseTokenURI("ipfs://bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m/")`** on contract `0x069eeda3395242bd0d382e3ec5738704569b8885`.

After the change, `tokenURI(0)` will return `ipfs://bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m/0` — i.e. it will resolve to:

`https://gateway.pinata.cloud/ipfs/bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m/0`

Each metadata file's `image` (and any other media-shaped field) has been rewritten to `ipfs://<per-file-CID>` — each media file was pinned individually so each has its own content-addressed root CID.

**Caller required:** contract uses AccessControl (no public `owner()`). Verify the required role on Etherscan before calling (typically `DEFAULT_ADMIN_ROLE` or a steering/admin role).

## Pre-flight checklist

- [ ] Confirm the caller has the required role/ownership on `0x069eeda3395242bd0d382e3ec5738704569b8885`.
- [ ] Re-fetch `tokenURI(0)` *now* via Etherscan Read Contract and capture the existing baseURI for a possible revert.
- [ ] Pull this CID through several public gateways and spot-check 3 tokens before sending the tx:
  - `https://gateway.pinata.cloud/ipfs/bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m/0`
  - `https://ipfs.io/ipfs/bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m/0`
  - `https://dweb.link/ipfs/bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m/0`
- [ ] Run the OpenSea metadata refresh on a single token after the tx lands; confirm it picks up the new `ipfs://` image. Then trigger a collection-wide refresh.

## How to call

**Etherscan Write Contract** (connect the owning wallet): https://etherscan.io/address/0x069eeda3395242bd0d382e3ec5738704569b8885#writeContract

**Cast / forge:**

```bash
cast send 0x069eeda3395242bd0d382e3ec5738704569b8885 "setBaseTokenURI(string)" "ipfs://bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m/" \
  --rpc-url <RPC> --private-key <KEY>
```

**ethers.js v6:**

```js
const c = new ethers.Contract("0x069eeda3395242bd0d382e3ec5738704569b8885", [
  "function setBaseTokenURI(string)"
], wallet);
await c.setBaseTokenURI("ipfs://bafybeia2hwe5olpvk6eqguva7hb644bj3ccjbu7dszka5luzwtjzhlo66m/");
```

## Revert plan

If anything is wrong, call the same setter with the **previous** baseURI captured at the time of generation:

```
setBaseTokenURI("https://metadata.proof.xyz/grails-iv/art/")
```

The change is fully reversible — no state migration, just a string replacement.

## Read-contract URL (for sanity checks before & after)

https://etherscan.io/address/0x069eeda3395242bd0d382e3ec5738704569b8885#readContract

---

_Generated 2026-05-27T16:14:48.487Z by proofxyz-ipfs pipeline. Verification report (sha256 round-trip vs the pin) is in this collection's directory at `verification-report.json`._
