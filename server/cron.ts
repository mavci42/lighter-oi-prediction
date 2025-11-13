import "dotenv/config";
import { run, get, all } from "./db.js";
import { fetchLighterOI } from "./llama.js";
import cron from "node-cron";

const CLOSE_HOUR = Number(process.env.CLOSE_HOUR_UTC ?? 18);

function createTodayRoundIfNeeded() {
  const now = new Date();
  const open = get("SELECT * FROM rounds WHERE status='open' LIMIT 1");
  if (open) return;
  const opensAt = new Date();
  const closesAt = new Date();
  closesAt.setUTCHours(CLOSE_HOUR,0,0,0);
  if (closesAt < now) closesAt.setUTCDate(closesAt.getUTCDate()+1);
  run("INSERT INTO rounds(opens_at,closes_at,status) VALUES(?,?, 'open')",
    [opensAt.toISOString(), closesAt.toISOString()]);
}

export async function closeAndScoreExpiredRounds() {
  const nowISO = new Date().toISOString();
  const expired = all("SELECT * FROM rounds WHERE status='open' AND closes_at < ?", [nowISO]) as any[];
  for (const r of expired) {
    const actual = await fetchLighterOI();
    run("UPDATE rounds SET actual_oi=?, status='closed' WHERE id=?", [actual, r.id]);
    const preds = all("SELECT user,value FROM predictions WHERE round_id=?", [r.id]) as {user:string,value:number}[];
    const scored = preds
      .map(p => ({ user: p.user, diff: Math.abs(p.value - actual) }))
      .sort((a,b)=>a.diff-b.diff)
      .map((p,i)=>({ ...p, rank: i+1 }));
    scored.forEach(s=>run("INSERT INTO scores(round_id,user,diff,rank) VALUES(?,?,?,?)", [r.id, s.user, s.diff, s.rank]));
    run("UPDATE rounds SET status='scored' WHERE id=?", [r.id]);
  }
}

export function startScheduler() {
  createTodayRoundIfNeeded();
  cron.schedule("*/5 * * * *", async () => {
    createTodayRoundIfNeeded();
    await closeAndScoreExpiredRounds();
  });
}
