import { useEffect, useState } from "react";
import {
  groupPredictionsByDayAndRound,
  LeaderboardPrediction,
  DayGroup,
} from "../utils/roundLeaderboard";
import { fetchOnchainPredictions } from "../onchain/fetchOnchainLeaderboard";
import "./Leaderboard.css";

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

        // 2) GÜN + ROUND + ADRES bazında uniq yap:
        //    Aynı gün/round içinde aynı address birden fazla tahmin yaptıysa,
        //    sadece EN SON tahmini (createdAt en büyük olan) kalsın.
        const byKey = new Map<string, LeaderboardPrediction>();

        for (const p of normalized) {
          const day = p.createdAt.split("T")[0]; // YYYY-MM-DD
          const key = `${day}-${p.round}-${p.address?.toLowerCase() || ''}`;

          const existing = byKey.get(key);
          if (!existing) {
            byKey.set(key, p);
          } else {
            const existingTs = new Date(existing.createdAt).getTime();
            const currentTs = new Date(p.createdAt).getTime();
            // Daha geç olan tahmini sakla
            if (currentTs > existingTs) {
              byKey.set(key, p);
            }
          }
        }

        // 3) Uniq prediction listesini zamana göre sırala
        const uniquePredictions = Array.from(byKey.values()).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // 4) Gün + round bazlı gruplamayı uygula
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

  // Determine the latest day and latest round as the "active" round
  const latestDay = groups[groups.length - 1];
  const latestRound =
    latestDay && latestDay.rounds && latestDay.rounds[latestDay.rounds.length - 1];

  const latestDayKey = latestDay?.date;
  const latestRoundNumber = latestRound?.round;

  return (
    <div className="leaderboard">
      <h2 className="leaderboard-title">Leaderboard</h2>
      {groups.map((day) => (
        <section key={day.date} className="day-section">
          <h3 className="day-title">{day.date}</h3>
          {day.rounds.map((round) => {
            const isActiveRound =
              day.date === latestDayKey && round.round === latestRoundNumber;
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
                <header className="round-header">
                  <div className="round-title">Round {round.round}</div>
                  {round.predictions.length > 0 && (
                    <div className="round-subtitle">
                      Winner:{" "}
                      {round.predictions[0]?.address
                        ? `${round.predictions[0].address.slice(0, 6)}...${round.predictions[0].address.slice(-4)}`
                        : "-"}
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
                      <span className="round-user">
                        {p.address
                          ? `${p.address.slice(0, 6)}...${p.address.slice(-4)}`
                          : "Anon"}
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
            );
          })}
        </section>
      ))}
    </div>
  );
}
