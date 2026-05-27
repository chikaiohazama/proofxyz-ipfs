// Public IPFS gateway list used by 07-verify for round-trip integrity checks.
// Note: the dedicated Pinata gateway in this list is auth-walled for our account,
// so 07-verify currently uses ipfs.io directly. This list is here for future
// per-gateway availability checks if we add them.
import { PINATA_GATEWAY } from "./pinata.js";

export const GATEWAYS = [
  `https://${PINATA_GATEWAY}`,
  "https://gateway.pinata.cloud",
  "https://ipfs.io",
  "https://cloudflare-ipfs.com",
  "https://dweb.link",
];

export function gatewayUrls(cid, path = "") {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return GATEWAYS.map((g) => `${g}/ipfs/${cid}${path ? suffix : ""}`);
}
