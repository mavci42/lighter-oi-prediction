import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDB, run, get, all } from "./db.js";
import { startScheduler, closeAndScoreExpiredRounds } from "./cron.js";
import { fetchLighterOI, getCachedOI, warmupOI } from "./llama.js";
import { OICache } from "./cache.js";

const RATE = new Map<string, number>(); // ip -> lastEpochMs

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get("/api/rounds/current", (_req,res)=>{
  const r = get("SELECT * FROM rounds WHERE status='open' ORDER BY id DESC LIMIT 1");
  if(!r) return res.status(404).json({message:"no open round"});
  res.json(r);
});

app.post("/api/predictions", (req,res)=>{
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const last = RATE.get(ip) || 0;
  if (now - last < 30_000) {
    return res.status(429).json({ message: "Too many submissions, try again in a few seconds." });
  }
  RATE.set(ip, now);

  const { user, value } = req.body as { user:string; value:number };
  const r = get("SELECT * FROM rounds WHERE status='open' ORDER BY id DESC LIMIT 1");
  if(!r) return res.status(400).json({message:"no open round"});
  try{
    run("INSERT INTO predictions(round_id,user,value) VALUES(?,?,?)", [r.id, user, value]);
    res.json({ ok:true });
  }catch(e:any){
    if(e.message?.includes('UNIQUE')) return res.status(409).json({message:"already predicted"});
    throw e;
  }
});

app.get("/api/predictions", (_req,res)=>{
  const r = get("SELECT * FROM rounds WHERE status='open' ORDER BY id DESC LIMIT 1");
  if(!r) return res.json({ roundId: null, items: [] });
  const items = all("SELECT user,value,created_at FROM predictions WHERE round_id=?", [r.id]);
  res.json({ roundId: r.id, items });
});

app.get("/api/leaderboard", (_req,res)=>{
  try {
    const scored = get("SELECT * FROM rounds WHERE status='scored' ORDER BY id DESC LIMIT 1");
    if(scored){
      const rows = all("SELECT user,diff,rank FROM scores WHERE round_id=? ORDER BY rank ASC", [scored.id]);
      return res.json({ roundId: scored.id, status:'scored', actual: scored.actual_oi, items: Array.isArray(rows) ? rows : [] });
    }
    const current = get("SELECT * FROM rounds WHERE status='open' ORDER BY id DESC LIMIT 1");
    if(!current) return res.json({ items: [] });
    const preds = all("SELECT user,value FROM predictions WHERE round_id=?", [current.id]);
    return res.json({ roundId: current.id, status:'open', items: Array.isArray(preds) ? preds : [] });
  } catch (err) {
    console.error("[LEADERBOARD] error:", err);
    // On any error, still return 200 with empty array so frontend never breaks
    res.json({ items: [] });
  }
});

app.get("/api/oi", async (_req,res)=>{
  try {
    const oi = await fetchLighterOI({ retries: 1, delayMs: 600 });
    const c = getCachedOI();
    return res.json({ oi, source: "live", host: c.source, updatedAt: c.updatedAt });
  } catch (e:any) {
    const c = getCachedOI();
    if (typeof c.oi === "number") {
      return res.json({ oi: c.oi, source: "cache", host: c.source, updatedAt: c.updatedAt, note: e?.message });
    }
    return res.status(502).json({ message: e?.message || "defillama unavailable and no cache" });
  }
});

app.post("/api/admin/close", async (_req,res)=>{
  await closeAndScoreExpiredRounds();
  res.json({ ok:true });
});

app.get("/api/oi/status", (_req,res)=>{
  const c = getCachedOI();
  res.json(c);
});

app.post("/api/admin/prefetch-oi", async (_req,res)=>{
  try {
    const oi = await fetchLighterOI({ retries: 3, delayMs: 800 });
    return res.json({ ok:true, oi, source:"defillama-live" });
  } catch(e:any) {
    return res.status(502).json({ ok:false, message: e?.message || "prefetch failed" });
  }
});

app.get("/api/test/oi-source", async (_req,res)=>{
  try {
    const oi = await fetchLighterOI({ retries: 1, delayMs: 600 });
    const c = getCachedOI();
    return res.json({ source: "live", oi, host: c.source });
  } catch (e:any) {
    const c = getCachedOI();
    if (typeof c.oi === "number") return res.json({ source:"cache", oi:c.oi, updatedAt:c.updatedAt, host:c.source, error:e?.message });
    res.status(503).json({ message: e?.message || "no live data and no cache", hint:"try POST /api/admin/prefetch-oi" });
  }
});

app.post("/api/admin/set-oi", (req,res)=>{
  const { oi } = req.body as { oi:number };
  if (typeof oi !== "number" || !Number.isFinite(oi)) return res.status(400).json({ message:"invalid oi" });
  const now = new Date().toISOString();
  OICache.lastOi = oi;
  OICache.updatedAt = now;
  OICache.lastSource = "manual";
  res.json({ ok:true, oi, updatedAt: now });
});

await initDB();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API on http://localhost:${PORT}`);
  startScheduler();
  // warm the cache once at boot
  warmupOI();
});
