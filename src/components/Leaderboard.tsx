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

  // We want something like: 0x7...fc7
  // take the first 3 chars and last 3 chars
  const start = a.slice(0, 3);   // e.g. "0x7"
  const end = a.slice(-3);      // e.g. "fc7"
  return `${start}...${end}`;
}

// Add the formatFullPrediction function
const formatFullPrediction = (value: number) => {
  return (
    "$" +
    new Intl.NumberFormat("tr-TR", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      useGrouping: true,
    }).format(Math.round(value))
  );
};

// Add the formatFullPredictionUsd function
const formatFullPredictionUsd = (value: number) => {
  return (
    "$" +
    new Intl.NumberFormat("tr-TR", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      useGrouping: true,
    }).format(Math.round(value))
  );
};

export default function Leaderboard() {
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const onchain = await fetchOnchainPredictions();
        if (cancelled) return;

        // 1) On-chain event'leri LeaderboardPrediction formatına çevir
        const normalized: LeaderboardPrediction[] = onchain.map((p) => ({
          id: p.txHash,
          address: p.user,
          createdAt: p.createdAt,
          round: 1, // şimdilik hepsi Round 1
          value: Number(p.strikePrice),
          pnl: undefined,
          score: undefined,
          diff: undefined,
          rank: undefined,
        }));

        // 1) Count how many predictions each address made per day+round
        const byKey = new Map<string, LeaderboardPrediction>();
        const countByKey = new Map<string, number>();

        for (const p of normalized) {
          const day = p.createdAt.split("T")[0]; // YYYY-MM-DD
          const address = (p.address || "").toLowerCase();
          const key = `${day}-${p.round}-${address}`;

          // increase count for this (day, round, address)
          countByKey.set(key, (countByKey.get(key) ?? 0) + 1);

          const existing = byKey.get(key);
          if (!existing) {
            byKey.set(key, p);
          } else {
            // keep the latest prediction in time
            const existingTs = new Date(existing.createdAt).getTime();
            const currentTs = new Date(p.createdAt).getTime();
            if (currentTs > existingTs) {
              byKey.set(key, p);
            }
          }
        }

        // 2) Create unique predictions list with predictionCount attached
        const uniquePredictions: LeaderboardPrediction[] = Array.from(byKey.values())
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

        // 3) Then use uniquePredictions in groupPredictionsByDayAndRound(...)
        const grouped = groupPredictionsByDayAndRound(uniquePredictions);

        // Günler için global round numarası ata:
        // En eski gün = Round 1, sonra 2, 3...
        const sortedByDateAsc = [...grouped].sort((a, b) =>
          a.date.localeCompare(b.date)
        );
        const dayRoundIndex = new Map<string, number>();
        sortedByDateAsc.forEach((day, idx) => {
          dayRoundIndex.set(day.date, idx + 1);
        });

        // Her günün içindeki round'ların round numarasını
        // o güne atanmış global round ile değiştir
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

  // Compute the ACTIVE round robustly (max date and max round number)
  const { latestDayKey, latestRoundNumber } = (() => {
    if (!groups || groups.length === 0) {
      return { latestDayKey: null as string | null, latestRoundNumber: null as number | null };
    }

    // Find the latest date string
    let latest = groups[0];
    for (const g of groups) {
      if (g.date > latest.date) {
        latest = g;
      }
    }

    // Within that day, find the highest round number
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
            const isActiveRound =
              latestDayKey === day.date && latestRoundNumber === round.round;
            const isEndedRound = !isActiveRound;

            const roundCardClassNames = [
              "round-card",
              isActiveRound ? "round-card--active" : "",
              isEndedRound ? "round-card--ended" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <article key={round.round} className={roundCardClassNames}>
                {isEndedRound && (
                  <span className="round-card__status-ribbon">ENDED</span>
                )}
                {isActiveRound && (
                  <div className="round-card__status-badge">
                    <span className="round-card__live-dot" />
                    LIVE
                  </div>
                )}
                <header className="round-header">
                  <div className="round-title">Round {round.round}</div>
                  {round.predictions.length > 0 && (
                    <div className="mt-3 rounded-xl bg-gradient-to-r from-yellow-500/10 via-yellow-400/15 to-yellow-500/10 px-3 py-2 flex items-center justify-between border border-yellow-500/40">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-yellow-100 bg-yellow-500/30 px-2 py-0.5 rounded-full">
                          #1
                        </span>
                        <span className="text-[12px] font-medium text-slate-50 tracking-tight">
                          {shortAddress(round.predictions[0].address)}
                        </span>
                      </div>
                      <span
                        className="text-[11px] font-mono text-slate-100"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {formatFullPredictionUsd(Number(round.predictions[0].value || 0))}
                      </span>
                    </div>
                  )}
                </header>
                <ol className="round-list">
                  {round.predictions.map((p, idx) => (
                    <li
                      key={p.id}
                      className={
                        "round-row" +
                        (idx === 0 ? " round-row--winner" : "") +
                        (idx === 1 ? " round-row--second" : "") +
                        (idx === 2 ? " round-row--third" : "")
                      }
                    >
                      <span className="round-rank">#{idx + 1}</span>
                      
                      <div className="leaderboard-row-main">
                        <span className="address-label">
                          {p.address
                            ? shortAddress(p.address)
                            : "Anon"}
                        </span>

                        {(() => {
                          // Prefer entry.value as the numeric prediction, fallback to strikePrice if present
                          const rawPrediction =
                            typeof p.value === "number"
                              ? p.value
                              : (p as any).strikePrice;

                          if (rawPrediction == null || !Number.isFinite(Number(rawPrediction))) {
                            return null;
                          }

                          return (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#CBD5E1",
                                fontFamily: "monospace",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {formatFullPrediction(Number(rawPrediction))}
                            </div>
                          );
                        })()}
                      </div>

                      {p.value != null && (
                        <span className="round-value">
                          ${(p.value / 1e6).toFixed(2)}M
                        </span>
                      )}
                      {p.diff != null ? (
                        <span className="round-score">
                          {p.diff != null
                            ? `Δ ${(Math.abs(p.diff) / 1e6).toFixed(2)}M`
                            : p.pnl != null
                            ? `${p.pnl.toFixed(2)}%`
                            : p.score != null
                            ? p.score.toFixed(2)
                            : ""}
                        </span>
                      ) : null}
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