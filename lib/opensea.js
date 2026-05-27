// OpenSea v2 collection lookup. The pipeline uses this to resolve a human-friendly
// slug (e.g. "grails-v") to the primary on-chain contract address before any RPC calls.
import { OPENSEA_API_KEY } from "./env.js";
import { fetchJson } from "./fetchWithRetry.js";

const BASE = "https://api.opensea.io/api/v2";

export async function getCollection(slug) {
  const data = await fetchJson(`${BASE}/collections/${slug}`, {
    headers: { "x-api-key": OPENSEA_API_KEY, accept: "application/json" },
  });
  const ethContracts = (data.contracts || []).filter((c) => c.chain === "ethereum");
  return {
    slug,
    name: data.name || slug,
    description: data.description || "",
    contracts: data.contracts || [],
    primaryContract: ethContracts[0]?.address?.toLowerCase() || null,
    totalSupply: data.total_supply ?? null,
    raw: data,
  };
}
