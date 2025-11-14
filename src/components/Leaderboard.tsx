import { useEffect, useState, useMemo } from "react";
import { apiGet } from "../lib/api";
import { groupPredictionsByDayAndRound, formatDate, type LeaderboardPrediction } from "../utils/roundLeaderboard";
import "./Leaderboard.css";

export default function Leaderboard(){
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string|null>(null);
  const [allPredictions, setAllPredictions] = useState<LeaderboardPrediction[]>([]);

  useEffect(() => {
    let timer: number | undefined;
    async function load() {
      try {
        const response = await apiGet("/api/leaderboard");
        setData(response);
        setErr(null);
        
        // Normalize data for grouping - ONLY show on-chain predictions
        if (response?.items && Array.isArray(response.items)) {
          const normalized: LeaderboardPrediction[] = response.items
            .filter((p: any) => {
              // Only include predictions with on-chain transaction hash
              const tx =
                p.txHash ||
                p.transactionHash ||
                p.onchainTxHash ||
                p.tx_hash ||
                p.hash;
              return !!tx; // Filter out off-chain/dummy predictions
            })
            .map((p: any, idx: number) => ({
              id: p.id ?? p.txHash ?? p.transactionHash ?? p.onchainTxHash ?? `${p.user}-${p.createdAt ?? idx}`,
              user: {
                username: p.user ?? p.username,
                displayName: p.displayName,
                avatarUrl: p.avatarUrl,
              },
              address: p.address,
              createdAt: p.createdAt ?? new Date().toISOString(),
              round: p.round ?? p.roundNumber ?? p.roundIndex,
              pnl: p.pnl ?? p.profit ?? p.returnPct,
              score: p.score,
              value: p.value,
              diff: p.diff,
              rank: p.rank,
            }));
          setAllPredictions(normalized);
        }
      } catch (e: any) {
        setErr(e?.message || "Failed to load");
      }
    }
    load();
    timer = window.setInterval(load, 15000);
    return () => { if (timer) window.clearInterval(timer); };
  }, []);

  const grouped = useMemo(
    () => groupPredictionsByDayAndRound(allPredictions),
    [allPredictions]
  );

  if (err) return <p className="error-message">{err}</p>;
  if (!data) return <p className="loading-leaderboard">Loading...</p>;

  // If no predictions yet, show empty state
  if (!allPredictions.length) {
    return (
      <div className="leaderboard">
        <h2 className="leaderboard-title">Leaderboard</h2>
        <p className="no-entries">No predictions yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <h2 className="leaderboard-title">Leaderboard</h2>
      
      {grouped.map((day) => (
        <section key={day.date} className="day-section">
          <h3 className="day-title">{formatDate(day.date)}</h3>
          
          <div className="round-grid">
            {day.rounds.map((round) => (
              <article key={round.round} className="round-card">
                <header className="round-header">
                  <div className="round-title">Round {round.round}</div>
                  {round.predictions.length > 0 && (
                    <div className="round-subtitle">
                      Winner:{" "}
                      {round.predictions[0]?.user?.username ??
                        round.predictions[0]?.user?.displayName ??
                        (round.predictions[0]?.address
                          ? `${round.predictions[0].address.slice(0, 6)}...${round.predictions[0].address.slice(-4)}`
                          : "-")}
                    </div>
                  )}
                </header>
                
                <ol className="round-list">
                  {round.predictions.map((p, idx) => (
                    <li
                      key={p.id ?? `${day.date}-${round.round}-${idx}`}
                      className={
                        "round-row" +
                        (idx === 0 ? " round-row--winner" : "") +
                        (idx === 1 ? " round-row--second" : "") +
                        (idx === 2 ? " round-row--third" : "")
                      }
                    >
                      <span className="round-rank">#{idx + 1}</span>
                      <span className="round-user">
                        {p.user?.username ??
                          p.user?.displayName ??
                          (p.address
                            ? `${p.address.slice(0, 6)}...${p.address.slice(-4)}`
                            : "Anon")}
                      </span>
                      {p.value != null && (
                        <span className="round-value">
                          ${(p.value / 1e6).toFixed(2)}M
                        </span>
                      )}
                      <span className="round-score">
                        {p.diff != null
                          ? `Δ ${(Math.abs(p.diff) / 1e6).toFixed(2)}M`
                          : p.pnl != null
                          ? `${p.pnl.toFixed(2)}%`
                          : p.score != null
                          ? p.score.toFixed(2)
                          : "-"}
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
