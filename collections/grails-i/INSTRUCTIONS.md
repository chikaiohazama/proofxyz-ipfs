# Grails I — IPFS migration instructions

> ⚠️ **Grails I uses a non-standard `tokenURI(uint256)` construction** — different from every other Proof contract in this repo. **Read this whole document** before sending the tx. The argument to `setBaseTokenURI(...)` does **NOT** end with a slash, and the IPFS pin uses a **nested directory layout**.

## Summary

| Field | Value |
|---|---|
| Collection | PROOF Collective Grails (GRAIL) |
| Contract | `0xb6329bd2741c4e5e91e26c4e653db643e74b2b19` |
| Chain | ethereum |
| Total supply | 1036 (tokens 0..1035, **0-indexed**) |
| Deployer | `0x6c8984bAf566Db08675310b122BF0be9Ea269ecA` |
| Current baseURI sample | `https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/1/0/0` |
| Current `baseTokenURI()` | `https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/1` &nbsp;_(no trailing slash)_ |
| New baseURI | `ipfs://bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m` &nbsp;_(no trailing slash)_ |
| Metadata CID (directory pin, nested `<grailId>/<tokenId>`) | `bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m` |
| Media pins | 20 files, each pinned with its own CID (see `state.json` → `mediaPins`) |

## How `tokenURI(uint256)` is constructed (and why this collection is special)

From the verified contract source (`Grails.sol`):

```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    uint256 grailId = uint256(tokenGrails[tokenId]);
    return string(abi.encodePacked(
        baseTokenURI, "/", grailId.toString(), "/", tokenId.toString()
    ));
}
```

The contract inserts `"/" + grailId + "/" + tokenId` after `baseTokenURI`. So:

- **Today**: `tokenURI(0)` = `"https://live---grails-metadata-...run.app/metadata/1" + "/0/0"` = `"https://live---grails-metadata-...run.app/metadata/1/0/0"`
- **After this change**: `tokenURI(0)` = `"ipfs://<CID>" + "/0/0"` = `"ipfs://<CID>/0/0"`

To make those new paths resolve, the IPFS pin is structured as a **nested directory**:

```
<CID>/
├── 0/                      # grailId 0 (Gary Vaynerchuk — "What do you 'B'")
│   ├── 0                   # token 0 metadata
│   ├── 1                   # token 1 metadata
│   ├── 800                 # …
│   └── ...                 # 112 files total in this grail
├── 1/                      # grailId 1
├── 2/
├── …
└── 19/                     # 20 grails total
```

There are **20 grails (0..19)** and **1036 tokens** spread across them, matching the 20 per-artist OpenSea collections listed in the README. The exact `grailId` per token comes from the contract's `tokenGrails[tokenId]` mapping; we re-derived it for every token by reading the current on-chain `tokenURI(id)` and parsing the URL path.

## The change

Call **`setBaseTokenURI("ipfs://bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m")`** on contract `0xb6329bd2741c4e5e91e26c4e653db643e74b2b19`.

⚠️ **No trailing slash.** The contract supplies the `"/"` itself. If you pass a value with a trailing slash, every `tokenURI(id)` will return `ipfs://CID//grailId/tokenId` (double slash) and gateways may fail to resolve it.

After the change, `tokenURI(0)` will return `ipfs://bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m/0/0` — a path inside the nested directory pin.

**Caller required:** contract uses `Ownable` (verify with `owner()` on Etherscan); the wallet that holds ownership must sign.

## Pre-flight checklist

- [ ] Confirm the current `baseTokenURI()` value on [Etherscan readContract](https://etherscan.io/address/0xb6329bd2741c4e5e91e26c4e653db643e74b2b19#readContract) — at pin time it was `https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/1` (no trailing slash; **already recorded in the revert plan**).
- [ ] Confirm the new pin resolves through public gateways:
  - https://ipfs.io/ipfs/bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m/0/0
  - https://gateway.pinata.cloud/ipfs/bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m/0/0
  - https://dweb.link/ipfs/bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m/0/0
- [ ] Confirm a few other grails resolve, e.g.: `…/14/100` (Ixian No-Ships, IX Shells) and `…/15/500` (c.u.l.t., Claire Silver).
- [ ] After the tx lands, on Etherscan readContract:
  - call `tokenURI(0)` → should now return `ipfs://bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m/0/0`
  - call `tokenURI(500)` → should now return `ipfs://bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m/15/500`
- [ ] Trigger an OpenSea metadata refresh on one token first; then collection-wide.

## How to call

**Etherscan Write Contract**: https://etherscan.io/address/0xb6329bd2741c4e5e91e26c4e653db643e74b2b19#writeContract — Connect Web3 with the `owner()` wallet, expand `setBaseTokenURI`, paste the value `ipfs://bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m` (no trailing slash), Write.

**Cast / forge:**

```bash
cast send 0xb6329bd2741c4e5e91e26c4e653db643e74b2b19 \
  "setBaseTokenURI(string)" \
  "ipfs://bafybeibvruyaookdhje675isb6xmsmn3tloh7hz5kijfbx4byrm7uxax2m" \
  --rpc-url $ETH_RPC --private-key $PROOF_PRIVATE_KEY
```

## Revert plan

```
setBaseTokenURI("https://live---grails-metadata-5covpqijaa-uc.a.run.app/metadata/1")
```

(Verbatim, no trailing slash. One-string state change — fully reversible, no on-chain migration.)

## Verification

End-to-end verified on `ipfs.io`: **1036/1036 metadata** files (nested path `<grailId>/<tokenId>`) + **20/20 media** files sha256-match. Full report at [`verification-report.json`](verification-report.json).
