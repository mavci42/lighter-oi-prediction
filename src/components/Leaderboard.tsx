import { useEffect, useState } from "react";
import {
  groupPredictionsByDayAndRound,
  LeaderboardPrediction,
  DayGroup,
} from "../utils/roundLeaderboard";
import { fetchOnchainPredictions } from "../onchain/fetchOnchainLeaderboard";
import "./Leaderboard.css";

function shortAddress(addr?: string | null): string {
  if (!addr) return "-";
  const a = addr.trim();
  if (a.length <= 10) return a;
  const start = a.slice(0, 3);
  const end = a.slice(-3);
  return `${start}...${end}`;
}

function getNormalizedAddress(p: any): string {
  if (!p) return "";

  // Prediction geldiği yere göre farklı alanlarda olabilir:
  const addr: string | undefined =
    (p.address as string | undefined) ??
    (p.user as string | undefined) ??
    (p.wallet as string | undefined);

  return addr || "";
}

function getDisplayAddress(p: any): string {
  const addr = getNormalizedAddress(p);
  if (!addr) return "Anon";
  return shortAddress(addr);
}

function formatRemaining(endAt: Date, nowMs: number): string {
  const diffMs = endAt.getTime() - nowMs;
  if (diffMs <= 0) return "00:00:00";
  const totalSec = Math.floor(diffMs / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function Leaderboard() {
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const onchain = await fetchOnchainPredictions();
        console.log(
          "[DEBUG] onchain sample:",
          onchain[0],
          onchain[0] && Object.keys(onchain[0])
        );
        if (cancelled) return;

        // On-chain event'leri LeaderboardPrediction formatına normalize et
        const normalized: LeaderboardPrediction[] = onchain.map((p: any) => {
          const strike = Number(p.strikePrice);
          return {
            id: p.txHash,
            address: p.user,
            createdAt: p.createdAt,
            round: 1, // şimdilik hepsi Round 1
            value: Number.isFinite(strike) ? strike : Number(p.value ?? 0),
            pnl: undefined,
            score: undefined,
            diff: undefined,
            rank: undefined,
            // EKRANDA KULLANMAK ÜZERE ORİJİNAL strikePrice'ı da sakla
            ...(Number.isFinite(strike) ? { strikePrice: strike } : {}),
          } as LeaderboardPrediction;
        });

        // Aynı gün + round + address için sadece SON tahmini bırak
        const byKey = new Map<string, LeaderboardPrediction>();
        const countByKey = new Map<string, number>();

        for (const p of normalized) {
          const day = p.createdAt.split("T")[0]; // YYYY-MM-DD
          const address = (p.address || "").toLowerCase();
          const key = `${day}-${p.round}-${address}`;

          countByKey.set(key, (countByKey.get(key) ?? 0) + 1);

          const existing = byKey.get(key);
          if (!existing) {
            byKey.set(key, p);
          } else {
            const existingTs = new Date(existing.createdAt).getTime();
            const currentTs = new Date(p.createdAt).getTime();
            if (currentTs > existingTs) {
              byKey.set(key, p);
            }
          }
        }

        const uniquePredictions: LeaderboardPrediction[] = Array.from(
          byKey.values()
        )
          .map((p) => {
            const day = p.createdAt.split("T")[0];
            const address = (p.address || "").toLowerCase();
            const key = `${day}-${p.round}-${address}`;
            const predictionCount = countByKey.get(key) ?? 1;
            return {
              ...p,
              predictionCount,
            };
          })
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

        // Gün / round gruplama
        const grouped = groupPredictionsByDayAndRound(uniquePredictions);

        const sortedByDateAsc = [...grouped].sort((a, b) =>
          a.date.localeCompare(b.date)
        );
        const dayRoundIndex = new Map<string, number>();
        sortedByDateAsc.forEach((day, idx) => {
          dayRoundIndex.set(day.date, idx + 1);
        });

        const groupedWithRounds = grouped.map((day) => ({
          ...day,
          rounds: day.rounds.map((round) => ({
            ...round,
            round: dayRoundIndex.get(day.date) ?? round.round,
          })),
        }));

        setGroups(groupedWithRounds);
      } catch (e: any) {
        console.error("[LEADERBOARD] on-chain fetch error:", e);
        if (!cancelled) {
          setError(
            e?.message || "On-chain leaderboard verisi alınırken hata oluştu."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    const id = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (loading && !groups.length) {
    return (
      <div className="leaderboard">
        <h2 className="leaderboard-title">Leaderboard</h2>
        <p className="no-entries">Loading on-chain predictions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard">
        <h2 className="leaderboard-title">Leaderboard</h2>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="leaderboard">
        <h2 className="leaderboard-title">Leaderboard</h2>
        <p className="no-entries">No predictions yet. Be the first!</p>
      </div>
    );
  }

  // En son gün + en yüksek round = LIVE olarak kabul et
  const { latestDayKey, latestRoundNumber } = (() => {
    let latest: DayGroup | null = null;
    for (const g of groups) {
      if (!latest || g.date > latest.date) latest = g;
    }
    if (!latest) {
      return { latestDayKey: null as string | null, latestRoundNumber: null as number | null };
    }
    let maxRound = 0;
    for (const r of latest.rounds) {
      if (typeof r.round === "number" && r.round > maxRound) {
        maxRound = r.round;
      }
    }
    return { latestDayKey: latest.date, latestRoundNumber: maxRound };
  })();

  return (
    <div className="leaderboard">
      <h2 className="leaderboard-title">Leaderboard</h2>

      {groups.map((day) => (
        <section key={day.date} className="day-section">
          <h3 className="day-title">{day.date}</h3>

          {day.rounds.map((round) => {
            const isLive =
              latestDayKey === day.date && latestRoundNumber === round.round;
            const isEnded = !isLive;

            const roundCardClassNames = [
              "round-card",
              isLive ? "round-card--active" : "",
              isEnded ? "round-card--ended" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const topPrediction = round.predictions[0] || null;

            // LIVE kartı için kalan süreyi hesapla
            let countdownText: string | null = null;
            if (isLive) {
              // round o günün sonunda bitiyor varsayımı
              const endAt = new Date(`${day.date}T23:59:59Z`);
              countdownText = formatRemaining(endAt, now);
            }

            return (
              <article key={round.round} className={roundCardClassNames}>
                {/* ENDED ribbon */}
                {isEnded && (
                  <span className="round-card__status-ribbon">ENDED</span>
                )}

                {/* LIVE badge */}
                {isLive && (
                  <div className="round-card__status-badge">
                    <span className="round-card__live-dot" />
                    LIVE
                  </div>
                )}

                {/* HEADER */}
                <header className="round-header">
                  <div className="round-title">Round {round.round}</div>

                  {/* LIVE: kalan süre */}
                  {isLive && countdownText && (
                    <div className="mt-1 text-[11px] text-slate-300">
                      remaining time{" "}
                      <span className="font-mono text-slate-50">
                        {countdownText}
                      </span>
                    </div>
                  )}

                  {/* ENDED: winner */}
                  {isEnded && topPrediction && (
                    <div className="mt-1 flex items-center gap-1 text-[11px]">
                      <span className="text-slate-300 font-medium">
                        WINNER:
                      </span>
                      <span className="text-slate-50 font-semibold">
                        {getDisplayAddress(topPrediction)}
                      </span>
                      <span className="text-[11px]">👑</span>
                    </div>
                  )}
                </header>

                {/* PREDICTS BAŞLIĞI */}
                <div className="mt-3 text-[11px] text-slate-300">Predicts</div>

                {/* PREDICTS LİSTESİ */}
                <ol className="round-list mt-1">
                  {round.predictions.map((p, idx) => (
                    <li key={p.id} className="round-row">
                      {/* ENDED: #1, #2; LIVE: sadece adres */}
                      {isEnded && (
                        <span className="round-rank mr-1">#{idx + 1}</span>
                      )}
                      <span className="address-label">
                        {getDisplayAddress(p)}
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
