import { useEffect, useState } from "react";
import { fetchLighterCurrentOi, CurrentOiResult } from "../lib/currentOi";

export function useCurrentOi() {
  const [data, setData] = useState<CurrentOiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchLighterCurrentOi();
        if (!cancelled) {
          setData(result);
        }
      } catch (e: any) {
        console.error("[useCurrentOi] error:", e);
        if (!cancelled) {
          setError(e?.message || "Failed to fetch current OI");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}