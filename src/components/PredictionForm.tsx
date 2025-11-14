import { useState } from "react";
import { apiPost } from "../lib/api";
import { connectWallet, shortenAddress } from "../lib/wallet";

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
    try {
      await apiPost("/api/predictions", { user: identifier, value: parseFloat(value) });
      setMsg("Prediction submitted ✅");
      setValue("");
      if (onSuccess) onSuccess();
    } catch (err:any) {
      setMsg(err?.message || "Submit failed");
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
    </form>
  );
}
