// Step 07 — End-to-end verification.
// For each rewritten metadata file: fetch via ipfs.io, sha256-compare against the local file.
// For each per-file media pin: fetch via ipfs.io by its CID, sha256-compare against the local file.
// Writes collections/<slug>/verification-report.json with pass/fail + any mismatches.
// Why ipfs.io (not Pinata's gateways): the dedicated Pinata gateway is auth-walled,
// the public Pinata gateway 429-throttles us aggressively after the pin step; ipfs.io is
// public, no auth, no aggressive rate limiting on our usage pattern.
// CONCURRENCY = 6, TIMEOUT = 30s (metadata) / 90s (media — videos can be 70-150MB).
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Concurrency } from "../lib/fetchWithRetry.js";
const PUBLIC_GATEWAY = "ipfs.io";
import { collectionDir, loadState, recordStep } from "../lib/state.js";

const CONCURRENCY = 6;
const TIMEOUT = 30000;

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

async function fetchOnce(url, timeout = TIMEOUT) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(t);
  }
}

async function verifyDirPin({ cid, localDir, label, logEvery = 50 }) {
  const files = readdirSync(localDir).filter((f) => f !== ".DS_Store");
  const gate = new Concurrency(CONCURRENCY);
  const mismatches = [];
  const failures = [];
  let ok = 0;
  let count = 0;
  const start = Date.now();

  await Promise.all(
    files.map((f) =>
      gate.run(async () => {
        const url = `https://${PUBLIC_GATEWAY}/ipfs/${cid}/${f}`;
        try {
          const local = readFileSync(join(localDir, f));
          const remote = await fetchOnce(url);
          if (sha256(local) === sha256(remote)) ok++;
          else mismatches.push({ file: f, localBytes: local.length, remoteBytes: remote.length });
        } catch (e) {
          failures.push({ file: f, error: e.message });
        }
        count++;
        if (count % logEvery === 0) {
          const rate = (count / ((Date.now() - start) / 1000)).toFixed(1);
          console.log(`  ${label}: ${count}/${files.length} (${rate}/s)`);
        }
      })
    )
  );
  return { total: files.length, ok, mismatches, failures };
}

async function verifyPerFilePins({ pins, localDir, label, logEvery = 25 }) {
  const entries = Object.entries(pins);
  const gate = new Concurrency(CONCURRENCY);
  const mismatches = [];
  const failures = [];
  let ok = 0;
  let count = 0;
  const start = Date.now();

  await Promise.all(
    entries.map(([file, info]) =>
      gate.run(async () => {
        const url = `https://${PUBLIC_GATEWAY}/ipfs/${info.cid}`;
        try {
          const local = readFileSync(join(localDir, file));
          const remote = await fetchOnce(url, 90000);
          if (sha256(local) === sha256(remote)) ok++;
          else mismatches.push({ file, cid: info.cid, localBytes: local.length, remoteBytes: remote.length });
        } catch (e) {
          failures.push({ file, cid: info.cid, error: e.message });
        }
        count++;
        if (count % logEvery === 0) {
          const rate = (count / ((Date.now() - start) / 1000)).toFixed(1);
          console.log(`  ${label}: ${count}/${entries.length} (${rate}/s)`);
        }
      })
    )
  );
  return { total: entries.length, ok, mismatches, failures };
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: node scripts/07-verify.js <slug>");
    process.exit(1);
  }

  const state = loadState(slug);
  if (!state.mediaPins || !state.metadataPin?.cid) {
    throw new Error(`Run 04-pin-media and 06-pin-metadata first.`);
  }
  const cdir = collectionDir(slug);

  console.log(`Verifying metadata pin (${state.metadataPin.cid}) via ${PUBLIC_GATEWAY}...`);
  const metaReport = await verifyDirPin({
    cid: state.metadataPin.cid,
    localDir: join(cdir, "ipfs-metadata"),
    label: "metadata",
  });
  console.log(`  metadata: ${metaReport.ok}/${metaReport.total} ok, ${metaReport.mismatches.length} mismatch, ${metaReport.failures.length} fail`);

  console.log(`\nVerifying ${Object.keys(state.mediaPins).length} per-file media pins...`);
  const mediaReport = await verifyPerFilePins({
    pins: state.mediaPins,
    localDir: join(cdir, "media"),
    label: "media",
  });
  console.log(`  media: ${mediaReport.ok}/${mediaReport.total} ok, ${mediaReport.mismatches.length} mismatch, ${mediaReport.failures.length} fail`);

  const report = {
    slug,
    metadataCID: state.metadataPin.cid,
    metadata: metaReport,
    media: mediaReport,
    verifiedAt: new Date().toISOString(),
    pass:
      metaReport.mismatches.length === 0 &&
      metaReport.failures.length === 0 &&
      mediaReport.mismatches.length === 0 &&
      mediaReport.failures.length === 0,
  };
  writeFileSync(join(cdir, "verification-report.json"), JSON.stringify(report, null, 2));
  recordStep(slug, "07-verify", { pass: report.pass, metadataOk: metaReport.ok, mediaOk: mediaReport.ok });

  console.log(`\n${report.pass ? "PASS" : "FAIL"} — full report at collections/${slug}/verification-report.json`);
  if (!report.pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
