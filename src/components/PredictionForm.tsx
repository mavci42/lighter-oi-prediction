import { useState } from "react";
import { apiPost } from "../lib/api";
import { connectWallet, shortenAddress } from "../lib/wallet";
import { submitPredictionOnchain, type Direction } from "../onchain/predictionContract";

export default function PredictionForm({
  oi,
  onSuccess
}: {
  oi: number | null;
  onSuccess?: () => void;
}) {
  const [user, setUser] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function handleConnectWallet() {
    setConnecting(true);
    try {
      const { address: addr } = await connectWallet();
      setAddress(addr);
    } catch (err: any) {
      alert(err?.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const identifier = address || user;
    if (!identifier || !value) return;
    
    setLoading(true);
    setMsg(null);
    setTxHash(null);
    
    try {
      // Step 1: Submit on-chain transaction (if wallet is connected)
      if (address) {
        const predictionValue = parseFloat(value);
        
        // Convert prediction value to on-chain format
        // marketId: 0 for now (can be dynamic later)
        // strikePrice: prediction value scaled to 8 decimals
        // direction: 1 (long) - assuming bullish prediction
        const marketId = BigInt(0);
        const strikePrice = BigInt(Math.round(predictionValue));
        const direction: Direction = 1; // 1 = long (bullish)
        
        console.log("[PREDICT] Submitting on-chain transaction...");
        const hash = await submitPredictionOnchain({
          marketId,
          strikePrice,
          direction,
        });
        
        setTxHash(hash);
        console.log("[PREDICT] On-chain tx successful:", hash);
      }
      
      // Step 2: Submit to off-chain backend (for leaderboard)
      await apiPost("/api/predictions", { user: identifier, value: parseFloat(value) });
      
      setMsg("Prediction submitted ✅" + (txHash ? " (on-chain)" : ""));
      setValue("");
      if (onSuccess) onSuccess();
    } catch (err:any) {
      console.error("[PREDICT] Error:", err);
      
      if (err?.message?.includes("user rejected") || err?.message?.includes("User denied")) {
        setMsg("Transaction cancelled by user");
      } else if (err?.message?.includes("No Ethereum provider found")) {
        setMsg("⚠️ Please open this miniapp inside Farcaster/Base wallet.");
        // Try to save off-chain as fallback
        try {
          await apiPost("/api/predictions", { user: identifier, value: parseFloat(value) });
          setMsg("Prediction saved (off-chain only - open in Farcaster for on-chain)");
          setValue("");
          if (onSuccess) onSuccess();
        } catch {}
      } else if (err?.message?.includes("Missing VITE_PREDICTION_CONTRACT")) {
        setMsg("⚠️ Contract not configured. Saving prediction off-chain only.");
        // Try to save off-chain even if on-chain fails
        try {
          await apiPost("/api/predictions", { user: identifier, value: parseFloat(value) });
          setMsg("Prediction saved (off-chain only)");
          setValue("");
          if (onSuccess) onSuccess();
        } catch {}
      } else {
        setMsg(err?.message || "Submit failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <p className="oi-line">
        <b>Current OI:</b> {oi ? `$${(oi / 1e6).toFixed(2)}M` : "loading..."}
        <span style={{opacity:.8, fontSize:"0.85rem", marginLeft:8}}>
          {(window as any).__OI_SOURCE__ ? `(${(window as any).__OI_SOURCE__})` : ""}
        </span>
      </p>

      <button
        type="button"
        onClick={handleConnectWallet}
        disabled={connecting}
        className="wallet-btn"
      >
        {address
          ? `Connected: ${shortenAddress(address)}`
          : connecting
          ? "Connecting..."
          : "Connect Wallet"}
      </button>

      <div className="fields">
        <input
          placeholder="Your name / FID (or use wallet)"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          disabled={!!address}
        />
        <input
          placeholder="Your prediction (USD)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      <div className="quick">
        <button type="button" onClick={() => setValue("1590000000")}>1.59B</button>
        <button type="button" onClick={() => setValue("1630000000")}>1.63B</button>
        <button type="button" onClick={() => setValue("1670000000")}>1.67B</button>
        <button type="button" onClick={() => setValue("1710000000")}>1.71B</button>
      </div>

      <button type="submit" className="primary" disabled={loading}>
        {loading ? "Submitting..." : "Submit Prediction"}
      </button>
      {msg && <p style={{marginTop:".5rem"}}>{msg}</p>}
      {txHash && (
        <p style={{marginTop:".5rem", fontSize:"0.85rem"}}>
          <a 
            href={`https://basescan.org/tx/${txHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{color: "#6a6cff", textDecoration: "underline"}}
          >
            View on BaseScan →
          </a>
        </p>
      )}
    </form>
  );
}
