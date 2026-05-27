// Per-collection state machine. Every script reads & writes
// collections/<slug>/state.json so the pipeline is resumable after any crash:
//   state.discovered  — facts from 01-discover (contract, supply, setter, ...)
//   state.mediaPins   — { filename: { cid, size, pinnedAt } } (one entry per per-file pin)
//   state.metadataPin — { cid, size, fileCount, ... } (the directory pin)
//   state.steps       — completion log
// IMPORTANT: recordStep() reloads from disk, so any in-memory mutations
// to `state` MUST be saved with saveState() *before* calling recordStep().
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");

export function collectionDir(slug) {
  return join(ROOT, "collections", slug);
}

export function statePath(slug) {
  return join(collectionDir(slug), "state.json");
}

export function loadState(slug) {
  const p = statePath(slug);
  if (!existsSync(p)) return { slug, steps: {} };
  return JSON.parse(readFileSync(p, "utf8"));
}

export function saveState(slug, state) {
  const dir = collectionDir(slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(statePath(slug), JSON.stringify(state, null, 2));
}

export function updateState(slug, patch) {
  const cur = loadState(slug);
  const next = { ...cur, ...patch, slug };
  saveState(slug, next);
  return next;
}

export function recordStep(slug, step, payload) {
  const cur = loadState(slug);
  cur.steps = cur.steps || {};
  cur.steps[step] = { ...payload, completedAt: new Date().toISOString() };
  saveState(slug, cur);
  return cur;
}

export function loadCollectionsConfig() {
  return JSON.parse(readFileSync(join(ROOT, "collections.json"), "utf8"));
}

export function getCollectionConfig(slug) {
  const cfg = loadCollectionsConfig();
  const c = cfg.collections.find((x) => x.slug === slug);
  if (!c) {
    const skipped = (cfg.skipped || []).find((x) => x.slug === slug);
    if (skipped) throw new Error(`Collection "${slug}" is marked skipped: ${skipped.reason}`);
    throw new Error(`Unknown collection slug: ${slug}`);
  }
  return c;
}

export { ROOT };
