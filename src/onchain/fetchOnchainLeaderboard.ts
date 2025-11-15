import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import {
  predictionAbi,
  PREDICTION_CONTRACT_ADDRESS,
} from "./predictionContract";

const client = createPublicClient({
  chain: base,
  transport: http(),
});

export type OnchainPrediction = {
  txHash: `0x${string}`;
  user: `0x${string}`;
  marketId: bigint;
  strikePrice: bigint;
  direction: number;
  timestamp: number;
  createdAt: string;
};

// Kontratın deploy olduğu blok (Remix output'undan): 38160749
// İleride istersen VITE_PREDICTION_START_BLOCK env'i ile değiştirilebilir.
const DEFAULT_START_BLOCK = 38160749n;

function getStartBlock(): bigint {
  try {
    const raw = import.meta.env.VITE_PREDICTION_START_BLOCK;
    if (raw) {
      const n = BigInt(raw);
      if (n > 0n) return n;
    }
  } catch {
    // ignore
  }
  return DEFAULT_START_BLOCK;
}

/**
 * Kontrattaki PredictionSubmitted event'lerini okuyup normalize eder.
 */
export async function fetchOnchainPredictions(): Promise<OnchainPrediction[]> {
  if (
    !PREDICTION_CONTRACT_ADDRESS ||
    PREDICTION_CONTRACT_ADDRESS ===
      "0x0000000000000000000000000000000000000000"
  ) {
    console.warn("[ONCHAIN] Prediction contract address is not set");
    return [];
  }

  const fromBlock = getStartBlock();

  console.log("[ONCHAIN] fetching events", {
    address: PREDICTION_CONTRACT_ADDRESS,
    fromBlock: fromBlock.toString(),
  });

  try {
    const logs = await client.getContractEvents({
      address: PREDICTION_CONTRACT_ADDRESS,
      abi: predictionAbi,
      eventName: "PredictionSubmitted",
      fromBlock,
    });

    console.log("[ONCHAIN] fetched logs count:", logs.length);

    return logs.map((log) => {
      const { user, marketId, strikePrice, direction, timestamp } = log.args as any;
      const ts = Number(timestamp);
      const createdAt =
        Number.isFinite(ts) && ts > 0
          ? new Date(ts * 1000).toISOString()
          : new Date().toISOString();

      return {
        txHash: log.transactionHash as `0x${string}`,
        user: user as `0x${string}`,
        marketId: marketId as bigint,
        strikePrice: strikePrice as bigint,
        direction: Number(direction),
        timestamp: ts,
        createdAt,
      };
    });
  } catch (e) {
    console.error("[ONCHAIN] getContractEvents error:", e);
    throw e;
  }
}
