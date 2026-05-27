// Loads .env from the repo root and exposes the required API keys.
// Throws at import time if any required key is missing, so failures surface early.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env");

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const ALCHEMY_API_KEY = required("ALCHEMY_API_KEY");
export const OPENSEA_API_KEY = required("OPENSEA_API_KEY");
export const PINATA_JWT = required("PINATA_JWT");
export const PINATA_GATEWAY = required("PINATA_GATEWAY");
export const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || null;
