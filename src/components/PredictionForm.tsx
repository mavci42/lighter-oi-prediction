import { useState } from "react";
import { connectWallet, shortenAddress } from "../lib/wallet";
import { submitPredictionOnchain, type Direction } from "../onchain/predictionContract";

export default function PredictionForm({
  oi,
  onSuccess
}: {
  oi: number | null;
  onSuccess?: () => void;
}) {
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
    
    if (!value) {
      setMsg("Please enter a prediction value");
      return;
    }
    
    setLoading(true);
    setMsg("Submitting on-chain prediction...");
    setTxHash(null);
    
    try {
      const predictionValue = parseFloat(value);
      
      // Convert prediction value to on-chain format
      // marketId: 0 for now (can be dynamic later)
      // strikePrice: prediction value (no scaling for now)
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
      setMsg("✅ On-chain prediction submitted!");
      setValue("");
      console.log("[PREDICT] On-chain tx successful:", hash);
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("[PREDICT] Error:", err);
      
      const errMsg = String(err?.message || "");
      
      if (errMsg.includes("Ethereum provider not found")) {
        setMsg("⚠️ This miniapp only works inside Farcaster/Base wallet with a connected account.");
      } else if (errMsg.toLowerCase().includes("user rejected") || errMsg.includes("User denied")) {
        setMsg("Transaction cancelled by user.");
      } else if (errMsg.includes("Missing VITE_PREDICTION_CONTRACT")) {
        setMsg("⚠️ Contract not configured. Please contact the administrator.");
      } else {
        setMsg(err?.message || "On-chain prediction failed.");
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
