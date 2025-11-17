export type LeaderboardPrediction = {
  id: string;
  user?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
  address?: string;
  createdAt: string;       // ISO date string
  round?: number;          // optional: round number if backend gönderiyorsa
  roundNumber?: number;    // alternatif alan isimleri
  roundIndex?: number;
  pnl?: number;            // kâr/zarar
  score?: number;          // puan
  value?: number;          // prediction value
  diff?: number;           // difference from actual
  rank?: number;           // current rank
  // NEW: how many predictions this address made in this day+round
  predictionCount?: number;
};

/**
 * Gün bazlı + round bazlı gruplama yapar.
 * Gün formatı: "YYYY-MM-DD"
 * Round: prediction.round / roundNumber / roundIndex -> yoksa 1
 */
export type RoundGroup = {
  round: number;
  predictions: LeaderboardPrediction[];
};

export type DayGroup = {
  date: string;      // "2025-11-16"
  rounds: RoundGroup[];
};

function getDayKey(createdAt: string): string {
  // ISO bekliyoruz, yoksa new Date ile fallback
  try {
    return createdAt.slice(0, 10);
  } catch {
    const d = new Date(createdAt);
    return d.toISOString().slice(0, 10);
  }
}

function getRoundNumber(p: LeaderboardPrediction): number {
  const r =
    p.round ??
    p.roundNumber ??
    p.roundIndex ??
    1;
  const n = Number(r);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function getScoreValue(p: LeaderboardPrediction): number {
  // Önce rank (ters), sonra diff (küçük daha iyi), sonra pnl, score
  if (typeof p.rank === "number") return -p.rank; // Lower rank = better (winner has rank 1)
  if (typeof p.diff === "number") return -Math.abs(p.diff); // Closer to actual = better
  if (typeof p.pnl === "number") return p.pnl;
  if (typeof p.score === "number") return p.score;
  return 0;
}

export function groupPredictionsByDayAndRound(
  predictions: LeaderboardPrediction[]
): DayGroup[] {
  // Önce address alanını normalize et
  const normalizedPredictions = predictions.map((p) => {
    // Try to get address from various possible fields
    const addr = 
      (p as any).address ||
      (p as any).user ||
      (p as any).wallet ||
      "";
    
    return {
      ...p,
      address: addr || (p as any).address, // varsa override et, yoksa bırak
    } as LeaderboardPrediction & { [key: string]: any };
  });

  const byDay = new Map<string, LeaderboardPrediction[]>();

  for (const p of normalizedPredictions) {
    const key = getDayKey(p.createdAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(p);
  }

  const dayGroups: DayGroup[] = [];

  for (const [date, dayPreds] of byDay.entries()) {
    const byRound = new Map<number, LeaderboardPrediction[]>();

    for (const p of dayPreds) {
      const rnd = getRoundNumber(p);
      if (!byRound.has(rnd)) byRound.set(rnd, []);
      byRound.get(rnd)!.push(p);
    }

    const rounds: RoundGroup[] = Array.from(byRound.entries())
      .map(([round, preds]) => {
        // Her round içinde en yüksek skor/pnl en üstte olacak şekilde sırala
        const sorted = [...preds].sort(
          (a, b) => getScoreValue(b) - getScoreValue(a)
        );
        return { round, predictions: sorted };
      })
      .sort((a, b) => a.round - b.round); // Round 1, 2, 3...

    dayGroups.push({ date, rounds });
  }

  // En yeni gün en üstte
  return dayGroups.sort((a, b) => b.date.localeCompare(a.date));
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
