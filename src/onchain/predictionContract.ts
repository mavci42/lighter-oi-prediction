import type { Abi } from "viem";

export const PREDICTION_CONTRACT_ADDRESS =
  (import.meta.env.VITE_PREDICTION_CONTRACT as `0x${string}`) ||
  "0x0000000000000000000000000000000000000000";

export const predictionAbi = [
  {
    type: "event",
    name: "PredictionSubmitted",
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "marketId", type: "uint256" },
      { indexed: false, name: "strikePrice", type: "int256" },
      { indexed: false, name: "direction", type: "uint8" },
      { indexed: false, name: "timestamp", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "submitPrediction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "strikePrice", type: "int256" },
      { name: "direction", type: "uint8" }
    ],
    outputs: []
  }
] as const satisfies Abi;

export type Direction = 0 | 1;
