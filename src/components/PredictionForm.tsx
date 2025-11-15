import { useState } from "react";
import { fetchOnchainPredictions } from "../onchain/fetchOnchainLeaderboard";
import { useAccount, useConnect, useWriteContract } from "wagmi";
import { predictionAbi, PREDICTION_CONTRACT_ADDRESS, type Direction } from "../onchain/predictionContract";
import { apiPost } from "../lib/api";

async function hasTodayPredictionForAddress(address: string): Promise<boolean> {
  try {
    const onchain = await fetchOnchainPredictions();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    return onchain.some((p) => {
      const day = p.createdAt.split("T")[0];
      return (
        day === today &&
        p.user.toLowerCase() === address.toLowerCase()
      );
    });
  } catch (e) {
    console.warn("[PREDICT] could not check today predictions on-chain:", e);
    // Eğer RPC hata verirse kullanıcıyı bloklamayalım,
    // on-chain tx akmaya devam etsin:
    return false;
  }
}

export default function PredictionForm({
  oi,
  onSuccess
}: {
  oi: number | null;
  onSuccess?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<string|null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const loading = isWriting || isSubmitting;

  async function handleConnectWallet() {
    try {
      const farcasterConnector = connectors.find(
        (c) => c.id === "farcasterMiniApp" || c.name.toLowerCase().includes("farcaster")
      ) ?? connectors[0];
      
      if (!farcasterConnector) {
        setMsg("⚠️ No wallet connector available. Please open inside Farcaster/Base.");
        return;
      }
      
      await connectAsync({ connector: farcasterConnector });
    } catch (err: any) {
      setMsg(err?.message || "Failed to connect wallet");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!value) {
      setMsg("Please enter a prediction value");
      return;
    }
    
    setMsg("Submitting on-chain prediction...");
    setTxHash(null);
    
    try {
      // Ensure wallet is connected
      let currentAddress = address;
      if (!currentAddress) {
        const farcasterConnector = connectors.find(
          (c) => c.id === "farcasterMiniApp" || c.name.toLowerCase().includes("farcaster")
        ) ?? connectors[0];
        
        if (!farcasterConnector) {
          setMsg("⚠️ This miniapp only works inside Farcaster/Base wallet.");
          return;
        }
        
        const result = await connectAsync({ connector: farcasterConnector });
        currentAddress = result.accounts[0];
      }
      
      if (!PREDICTION_CONTRACT_ADDRESS || PREDICTION_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        setMsg("⚠️ Contract not configured. Please contact the administrator.");
        return;
      }
      
      const predictionValue = parseFloat(value);
      
      // Convert prediction value to on-chain format
      const marketId = BigInt(0);
      const strikePrice = BigInt(Math.round(predictionValue));
      const direction: Direction = 1; // 1 = long (bullish)
      
      console.log("[PREDICT] Submitting on-chain transaction...", {
        marketId: marketId.toString(),
        strikePrice: strikePrice.toString(),
        direction,
        contract: PREDICTION_CONTRACT_ADDRESS,
      });
      
      // Aynı gün içinde aynı adres zaten tahmin girdiyse,
      // ikinci kez on-chain tx açma.
      if (currentAddress) {
        const already = await hasTodayPredictionForAddress(currentAddress);
        if (already) {
          setMsg("You already submitted a prediction for this round. 🎯");
          setIsSubmitting(false);
          return;
        }
      }
      
      setIsSubmitting(true);
      const hash = await writeContractAsync({
        address: PREDICTION_CONTRACT_ADDRESS,
        abi: predictionAbi,
        functionName: "submitPrediction",
        args: [marketId, strikePrice, direction],
      });
      
      setTxHash(hash);
      console.log("[PREDICT] On-chain tx successful:", hash);
      
      // Sync prediction to backend for leaderboard
      try {
        await apiPost("/api/predictions", {
          txHash: hash,
          user: currentAddress,
          address: currentAddress,
          value: predictionValue,
          marketId: Number(marketId),
          strikePrice: Number(strikePrice),
          direction,
          createdAt: new Date().toISOString(),
        });
        console.log("[PREDICT] Synced to backend successfully");
      } catch (e) {
        console.error("[PREDICT] Failed to sync with backend:", e);
        // Don't show error to user - on-chain tx already succeeded
      }
      
      setMsg("✅ On-chain prediction submitted!");
      setValue("");
      setIsSubmitting(false);
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("[PREDICT] Error:", err);
      setIsSubmitting(false);
      
      const errMsg = String(err?.message || "");
      
      if (errMsg.toLowerCase().includes("user rejected") || errMsg.includes("User denied")) {
        setMsg("Transaction cancelled by user.");
      } else if (errMsg.includes("connector") || errMsg.includes("provider")) {
        setMsg("⚠️ This miniapp only works inside Farcaster/Base wallet with a connected account.");
      } else {
        setMsg(err?.message || "On-chain prediction failed.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <p className="oi-line">
        <b>Current OI:</b> {oi ? `$${(oi / 1e6).toFixed(2)}M` : "coming soon..."}
        <span style={{opacity:.8, fontSize:"0.85rem", marginLeft:8}}>
          {(window as any).__OI_SOURCE__ ? `(${(window as any).__OI_SOURCE__})` : ""}
        </span>
      </p>

      <button
        type="button"
        onClick={handleConnectWallet}
        disabled={isConnecting || isConnected}
        className="wallet-btn"
      >
        {isConnected && address
          ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`
          : isConnecting
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
