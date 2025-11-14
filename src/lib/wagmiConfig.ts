import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { baseAccount } from "wagmi/connectors";

// App metadata from Farcaster manifest
export const METADATA = {
  name: "Lighter OI Prediction",
  iconImageUrl: "https://lighter-oi-prediction.vercel.app/lighter-oi-cover.png",
};

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    // Farcaster miniapp wallet connector (primary)
    farcasterMiniApp(),
    // Base app / Base Wallet connector (fallback)
    baseAccount({
      appName: METADATA.name,
      appLogoUrl: METADATA.iconImageUrl,
    }),
  ],
});
