// ABI fetcher with two backends:
//   1) Etherscan v2 if ETHERSCAN_API_KEY is set (Etherscan v2 requires a key for everything since 2024).
//   2) Sourcify (keyless) as a fallback — works for any verified contract.
// detectUriSetter scans an ABI for the conventional URI-mutating function names
// Proof's contracts use (setBaseTokenURI / setBaseURI / setURI / setTokenURI / updateBaseURI / setContractURI).
import { ETHERSCAN_API_KEY } from "./env.js";
import { fetchJson } from "./fetchWithRetry.js";
import { getAbi as sourcifyGetAbi } from "./sourcify.js";

const BASE = "https://api.etherscan.io/v2/api";

export async function getAbi(contract, { chainid = 1 } = {}) {
  if (ETHERSCAN_API_KEY) {
    const params = new URLSearchParams({
      chainid: String(chainid),
      module: "contract",
      action: "getabi",
      address: contract,
      apikey: ETHERSCAN_API_KEY,
    });
    const data = await fetchJson(`${BASE}?${params}`);
    if (data.status === "1") {
      try {
        return JSON.parse(data.result);
      } catch {
        /* fall through */
      }
    }
  }
  return sourcifyGetAbi(contract, { chainid });
}

const SETTER_CANDIDATES = [
  "setBaseTokenURI",
  "setBaseURI",
  "setURI",
  "setTokenURI",
  "updateBaseURI",
  "setContractURI",
];

export function detectUriSetter(abi) {
  if (!abi) return null;
  const fns = abi.filter((e) => e.type === "function" && e.stateMutability !== "view");
  for (const candidate of SETTER_CANDIDATES) {
    const match = fns.find((f) => f.name === candidate);
    if (match) {
      return {
        name: match.name,
        inputs: match.inputs.map((i) => i.type),
        signature: `${match.name}(${match.inputs.map((i) => i.type).join(",")})`,
      };
    }
  }
  return null;
}
