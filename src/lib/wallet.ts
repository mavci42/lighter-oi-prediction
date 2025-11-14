import { sdk } from "@farcaster/miniapp-sdk";

type ConnectedWallet = {
  address: string;
  source: "farcaster" | "external";
};

export async function connectWallet(): Promise<ConnectedWallet> {
  // 1) Try Farcaster miniapp wallet first
  try {
    const provider = await sdk.wallet.getEthereumProvider();
    if (provider) {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address = accounts[0];
      if (address) {
        console.log("[wallet] connected via Farcaster miniapp:", address);
        return { address, source: "farcaster" };
      }
    }
  } catch (err) {
    console.warn("[wallet] Farcaster provider failed, will try external:", err);
  }

  // 2) Fallback: window.ethereum (browser / desktop dev)
  const anyWindow = window as any;
  const eth = anyWindow.ethereum;
  if (!eth) {
    throw new Error("No wallet provider found (Farcaster or external).");
  }

  const accounts = (await eth.request({
    method: "eth_requestAccounts",
  })) as string[];
  const address = accounts[0];
  console.log("[wallet] connected via external provider:", address);
  return { address, source: "external" };
}

export function shortenAddress(addr?: string | null): string {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function isFarcasterEnvironment(): boolean {
  try {
    // Check if Farcaster SDK is available by checking for the sdk object
    // This is a synchronous check that doesn't require async context
    return typeof sdk !== 'undefined' && typeof sdk.wallet !== 'undefined';
  } catch {
    return false;
  }
}
