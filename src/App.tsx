import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { fetchLighterOI } from "./lib/fetchLighterOI";
import PredictionForm from "./components/PredictionForm";
import Leaderboard from "./components/Leaderboard";
import { isFarcasterEnvironment } from "./lib/wallet";
import "./style.css";

export default function App() {
  const [oi, setOi] = useState<number | null>(null);
  const [view, setView] = useState<"predict" | "leaderboard">("predict");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Notify Farcaster/Base that the mini app UI is ready to display
    sdk.actions.ready().catch((err) => {
      console.error("Miniapp sdk.actions.ready() failed:", err);
    });
  }, []);

  useEffect(() => {
    async function load(){
      try{
        const r = await fetch("/api/oi");
        const j = await r.json();
        if (r.ok && typeof j.oi === "number") {
          setOi(j.oi);
          (window as any).__OI_SOURCE__ = j.source || "unknown";
          (window as any).__OI_UPDATED__ = j.updatedAt || null;
        } else {
          setOi(null);
        }
      }catch{ setOi(null); }
    }
    load();
  }, []);

  return (
    <div className="app">
      <h1>Lighter OI Prediction</h1>
      <p className="sub">
        Guess today's open interest in USD.
      </p>
      {isFarcasterEnvironment() && (
        <p style={{fontSize: "0.8rem", opacity: 0.7}}>
          Running inside Farcaster Mini App environment.
        </p>
      )}

      <div className="tabs">
        <button onClick={() => setView("predict")} className={view === "predict" ? "active" : ""}>
          Predict
        </button>
        <button onClick={() => setView("leaderboard")} className={view === "leaderboard" ? "active" : ""}>
          Leaderboard
        </button>
      </div>

      {view === "predict" ? (
        <PredictionForm
          oi={oi}
          onSuccess={() => setRefreshKey((k)=>k+1)}
        />
      ) : (
        <div key={refreshKey}>
          <Leaderboard />
        </div>
      )}
    </div>
  );
}
