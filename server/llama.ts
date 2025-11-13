import { OICache } from "./cache.js";

const ENDPOINTS = [
  "https://api.llama.fi/overview/perps",
  "https://cache.llama.fi/overview/perps",
  "https://yields.llama.fi/overview/perps"
];

let lastError: string | null = null;

async function fetchWithTimeout(url: string, ms = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": "Lighter-OI-Prediction/1.0 (+server)" }
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchLighterOI(opts?: { retries?: number; delayMs?: number }): Promise<number> {
  const retries = opts?.retries ?? 1;
  const delayMs = opts?.delayMs ?? 700;
  lastError = null;

  for (const host of ENDPOINTS) {
    for (let i = 0; i <= retries; i++) {
      try {
        console.log(`[LLAMA] GET ${host} (try ${i+1}/${retries+1})`);
        const res = await fetchWithTimeout(host, 8000);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json() as any;
        const lighter = data?.protocols?.find((p:any)=>p?.name && typeof p.name==="string" && p.name.toLowerCase().includes("lighter"));
        if (!lighter || typeof lighter.openInterest !== "number") throw new Error("lighter.openInterest missing");
        const oi = Number(lighter.openInterest);
        OICache.lastOi = oi;
        OICache.updatedAt = new Date().toISOString();
        OICache.lastSource = host;
        console.log("[LLAMA] SUCCESS oi =", oi, "from", host);
        return oi;
      } catch (e:any) {
        lastError = `host=${host} err=${e?.message||e}`;
        console.warn("[LLAMA] FAIL", lastError);
        if (i < retries) await new Promise(r=>setTimeout(r, delayMs * Math.pow(2,i)));
      }
    }
  }
  throw new Error(lastError || "all llama hosts failed");
}

export function getCachedOI() {
  return {
    oi: OICache.lastOi,
    updatedAt: OICache.updatedAt,
    source: OICache.lastSource || null,
    lastError
  };
}

export async function warmupOI() {
  try {
    await fetchLighterOI({ retries: 1, delayMs: 600 });
    console.log("[LLAMA] warmup complete");
  } catch (e:any) {
    console.warn("[LLAMA] warmup failed:", e?.message || e);
  }
}
