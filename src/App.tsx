import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import PredictionForm from "./components/PredictionForm";
import Leaderboard from "./components/Leaderboard";
import { isFarcasterEnvironment } from "./lib/wallet";
import "./style.css";

export default function App() {
  const [view, setView] = useState<"predict" | "leaderboard">("predict");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Notify Farcaster/Base that the mini app UI is ready to display
    sdk.actions.ready().catch((err) => {
      console.error("Miniapp sdk.actions.ready() failed:", err);
    });
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
