// Sourcify ABI lookup. Used as the keyless fallback in lib/etherscan.js because
// Etherscan v2 requires an API key for ABI fetches and we don't ship one.
// Sourcify returns the contract's compiler metadata; `output.abi` is the ABI array.
import { getAddress } from "ethers";
import { fetchJson } from "./fetchWithRetry.js";

const REPO = "https://repo.sourcify.dev/contracts";

export async function getAbi(contract, { chainid = 1 } = {}) {
  const addr = getAddress(contract);
  for (const matchKind of ["full_match", "partial_match"]) {
    const url = `${REPO}/${matchKind}/${chainid}/${addr}/metadata.json`;
    try {
      const meta = await fetchJson(url);
      if (meta?.output?.abi) return meta.output.abi;
    } catch {
      // try next match kind
    }
  }
  return null;
}
