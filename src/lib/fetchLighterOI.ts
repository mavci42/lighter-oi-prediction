export async function fetchLighterOI(): Promise<number> {
  // Try backend first
  try {
    const r = await fetch("/api/oi");
    if (r.ok) {
      const j = await r.json();
      if (typeof j.oi === "number") return j.oi;
    }
  } catch {}
  // Fallback directly to DeFiLlama
  const res = await fetch("https://api.llama.fi/overview/perps");
  if (!res.ok) throw new Error("Failed to fetch perps overview");
  const data = await res.json();
  const lighter = data.protocols?.find(
    (p: any) => p?.name && p.name.toLowerCase().includes("lighter")
  );
  if (!lighter || typeof lighter.openInterest !== "number") {
    throw new Error("Lighter not found");
  }
  return lighter.openInterest as number;
}
