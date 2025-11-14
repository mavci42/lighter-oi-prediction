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

/**
 * Kontrattaki PredictionSubmitted event'lerini okuyup
 * normalize eder.
 *
 * Şimdilik fromBlock = 0n; istersen ileride env ile sınırlandırılabilir:
 * VITE_PREDICTION_START_BLOCK gibi.
 */
export async function fetchOnchainPredictions(): Promise<OnchainPrediction[]> {
  if (
    !PREDICTION_CONTRACT_ADDRESS ||
    PREDICTION_CONTRACT_ADDRESS ===
      "0x0000000000000000000000000000000000000000"
  ) {
    return [];
  }

  try {
    const logs = await client.getContractEvents({
      address: PREDICTION_CONTRACT_ADDRESS,
      abi: predictionAbi,
      eventName: "PredictionSubmitted",
      fromBlock: 0n,
    });

    return logs.map((log) => {
      const { user, marketId, strikePrice, direction, timestamp } = log.args;
      const createdAt = new Date(Number(timestamp) * 1000).toISOString();

      return {
        txHash: log.transactionHash,
        user: user!,
        marketId: marketId!,
        strikePrice: strikePrice!,
        direction: Number(direction),
        timestamp: Number(timestamp),
        createdAt,
      };
    });
  } catch (error) {
    console.error("[ONCHAIN] Failed to fetch predictions:", error);
    return [];
  }
}
