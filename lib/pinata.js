// Pinata upload helpers. Two distinct primitives the pipeline relies on:
//   uploadFile(path) — pins a single file; the returned CID resolves to *that file* directly.
//                      Used for every media asset so each gets its own content-addressed root.
//   uploadDir(path)  — pins a directory; the returned CID is the directory root.
//                      Used once per collection for the rewritten metadata (becomes the new baseURI).
// JWT is read from .env at import time; never inline a token in source.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { PinataSDK } from "pinata";
import { PINATA_JWT, PINATA_GATEWAY } from "./env.js";

const pinata = new PinataSDK({ pinataJwt: PINATA_JWT, pinataGateway: PINATA_GATEWAY });

function collectFiles(dir, baseDir = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full, baseDir));
    } else if (entry.isFile() && entry.name !== ".DS_Store") {
      const rel = relative(baseDir, full);
      out.push(new File([readFileSync(full)], rel));
    }
  }
  return out;
}

export async function uploadDir(localPath, name) {
  const stat = statSync(localPath);
  if (!stat.isDirectory()) throw new Error(`Not a directory: ${localPath}`);
  const files = collectFiles(localPath);
  if (files.length === 0) throw new Error(`No files to upload in ${localPath}`);
  const res = await pinata.upload.public.fileArray(files).name(name);
  return {
    cid: res.cid,
    id: res.id,
    size: res.size,
    fileCount: files.length,
    pinnedAt: new Date().toISOString(),
  };
}

export async function uploadFile(localPath, name) {
  const buf = readFileSync(localPath);
  const filename = name || localPath.split("/").pop();
  const file = new File([buf], filename);
  const res = await pinata.upload.public.file(file).name(filename);
  return {
    cid: res.cid,
    id: res.id,
    size: res.size,
    pinnedAt: new Date().toISOString(),
  };
}

export { PINATA_GATEWAY };
