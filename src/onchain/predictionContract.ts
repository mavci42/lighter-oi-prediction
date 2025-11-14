import type { Abi } from "viem";
import { base } from "viem/chains";
import { createWalletClient, custom } from "viem";

// Contract address on Base mainnet - set this in .env file
// Deploy your contract and update VITE_PREDICTION_CONTRACT in .env
const CONTRACT_ADDRESS = import.meta.env.VITE_PREDICTION_CONTRACT as `0x${string}`;

// Simple prediction contract ABI
// function submitPrediction(uint256 marketId, int256 strikePrice, uint8 direction)
export const predictionAbi = [
  {
    type: "function",
    name: "submitPrediction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "strikePrice", type: "int256" },
      { name: "direction", type: "uint8" }, // 0 = short, 1 = long
    ],
    outputs: [],
  },
] as const satisfies Abi;

export type Direction = 0 | 1;

export async function submitPredictionOnchain(params: {
  marketId: bigint;
  strikePrice: bigint;
  direction: Direction;
}): Promise<`0x${string}`> {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Missing VITE_PREDICTION_CONTRACT env var. Please deploy contract and set address in .env");
  }

  // Get Ethereum provider from Farcaster/Base wallet or window.ethereum
  const eth: any = (window as any).ethereum;

  if (!eth) {
    throw new Error("Ethereum provider not found. This miniapp must be opened inside Farcaster/Base wallet.");
  }

  const client = createWalletClient({
    chain: base,
    transport: custom(eth),
  });

  const [account] = await client.getAddresses();

  if (!account) {
    throw new Error("No wallet account available. Please open in Farcaster/Base and connect your wallet.");
  }

  console.log("[ON-CHAIN] Submitting prediction:", {
    marketId: params.marketId.toString(),
    strikePrice: params.strikePrice.toString(),
    direction: params.direction,
    account,
    contract: CONTRACT_ADDRESS,
  });

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    abi: predictionAbi,
    functionName: "submitPrediction",
    args: [params.marketId, params.strikePrice, params.direction],
    account,
  });

  console.log("[ON-CHAIN] Transaction sent:", txHash);
  return txHash;
}
