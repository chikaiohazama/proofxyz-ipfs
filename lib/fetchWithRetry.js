// HTTP helpers used by every external fetch in the pipeline:
//   fetchWithRetry — exponential backoff on 5xx/429/network errors; throws on 4xx
//   fetchJson / fetchBuffer — convenience wrappers
//   Concurrency — small bounded-parallelism gate (better than Promise.all + setTimeout games)
const DEFAULT = { retries: 4, baseDelay: 500, maxDelay: 8000, timeout: 30000 };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchWithRetry(url, opts = {}, cfg = {}) {
  const { retries, baseDelay, maxDelay, timeout } = { ...DEFAULT, ...cfg };
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeout);
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      lastErr = new Error(`HTTP ${res.status} for ${url}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt === retries) break;
    const delay = Math.min(maxDelay, baseDelay * 2 ** attempt);
    await sleep(delay);
  }
  throw lastErr;
}

export async function fetchJson(url, opts = {}, cfg = {}) {
  const res = await fetchWithRetry(url, opts, cfg);
  return res.json();
}

export async function fetchBuffer(url, opts = {}, cfg = {}) {
  const res = await fetchWithRetry(url, opts, cfg);
  return Buffer.from(await res.arrayBuffer());
}

export class Concurrency {
  constructor(max) {
    this.max = max;
    this.active = 0;
    this.queue = [];
  }
  run(fn) {
    return new Promise((resolve, reject) => {
      const start = async () => {
        this.active++;
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        } finally {
          this.active--;
          const next = this.queue.shift();
          if (next) next();
        }
      };
      if (this.active < this.max) start();
      else this.queue.push(start);
    });
  }
}
