// Read-only on-chain helpers via Alchemy.
// JSON-RPC for ERC-721 metadata reads (name/symbol/totalSupply/owner/tokenURI).
// Alchemy NFT v3 REST endpoint for getContractMetadata (which returns the deployer).
// `tryCall` swallows revert/missing-function errors so a contract that doesn't
// expose `owner()` (e.g. AccessControl-only) returns null instead of crashing the script.
import { Interface, getAddress } from "ethers";
import { ALCHEMY_API_KEY } from "./env.js";
import { fetchJson } from "./fetchWithRetry.js";

const RPC = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const NFT_API = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

const ABI = new Interface([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function owner() view returns (address)",
  "function tokenURI(uint256) view returns (string)",
  "function uri(uint256) view returns (string)",
  "function baseURI() view returns (string)",
  "function baseTokenURI() view returns (string)",
]);

async function rpc(method, params) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  const data = await fetchJson(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  if (data.error) throw new Error(`Alchemy ${method}: ${data.error.message}`);
  return data.result;
}

async function call(to, fnName, args = []) {
  const data = ABI.encodeFunctionData(fnName, args);
  const result = await rpc("eth_call", [{ to, data }, "latest"]);
  return ABI.decodeFunctionResult(fnName, result)[0];
}

async function tryCall(to, fnName, args = []) {
  try {
    return await call(to, fnName, args);
  } catch {
    return null;
  }
}

export async function name(addr) {
  return tryCall(getAddress(addr), "name");
}

export async function symbol(addr) {
  return tryCall(getAddress(addr), "symbol");
}

export async function totalSupply(addr) {
  const v = await tryCall(getAddress(addr), "totalSupply");
  return v == null ? null : Number(v);
}

export async function owner(addr) {
  return tryCall(getAddress(addr), "owner");
}

export async function tokenURI(addr, id) {
  return tryCall(getAddress(addr), "tokenURI", [BigInt(id)]);
}

export async function uri1155(addr, id) {
  return tryCall(getAddress(addr), "uri", [BigInt(id)]);
}

export async function baseURI(addr) {
  const v = await tryCall(getAddress(addr), "baseURI");
  if (v) return v;
  return tryCall(getAddress(addr), "baseTokenURI");
}

export async function getContractMetadata(addr) {
  const url = `${NFT_API}/getContractMetadata?contractAddress=${getAddress(addr)}`;
  const data = await fetchJson(url);
  return data || null;
}

export async function getContractCreator(addr) {
  const meta = await getContractMetadata(addr);
  return meta?.contractDeployer || null;
}
