import { useEffect, useState } from "react";
import { groupPredictionsByDayAndRound, formatDate, type LeaderboardPrediction, type DayGroup } from "../utils/roundLeaderboard";
import { fetchOnchainPredictions } from "../onchain/fetchOnchainLeaderboard";
import "./Leaderboard.css";

export default function Leaderboard(){
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const onchain = await fetchOnchainPredictions();
        if (cancelled) return;

        const normalized: LeaderboardPrediction[] = onchain.map((p) => ({
          id: p.txHash,
          address: p.user,
          createdAt: p.createdAt,
          // Şimdilik tüm tahminleri Round 1'e koyuyoruz.
          // İleride marketId / saat / gün içi seans mantığına göre
          // gerçek round logic'i ekleyebiliriz.
          round: 1,
          value: Number(p.strikePrice),
          pnl: undefined,
          score: undefined,
          diff: undefined,
          rank: undefined,
        }));

        const grouped = groupPredictionsByDayAndRound(normalized);
        setGroups(grouped);
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
    const id = window.setInterval(load, 15000); // 15 sn'de bir tazele
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (loading && !groups.length) {
    return <p className="loading-leaderboard">Loading on-chain predictions...</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  if (!groups.length) {
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
      
      {groups.map((day) => (
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
