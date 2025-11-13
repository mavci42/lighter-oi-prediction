import { sdk } from "@farcaster/miniapp-sdk";

type EthProvider = {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
};

function getFarcasterEthProvider(): EthProvider | null {
  try {
    const p = (sdk as any)?.wallet?.getEthereumProvider?.();
    if (p && typeof p.request === "function") return p as EthProvider;
  } catch {
    // ignore, fall back to window.ethereum
  }
  return null;
}

function getWindowEthProvider(): EthProvider | null {
  const eth = (window as any).ethereum;
  if (eth && typeof eth.request === "function") return eth as EthProvider;
  return null;
}

async function getEthereumProvider(): Promise<EthProvider> {
  // 1) prefer Farcaster miniapp provider
  const farcaster = getFarcasterEthProvider();
  if (farcaster) return farcaster;

  // 2) fallback: window.ethereum (for local dev outside Farcaster)
  const win = getWindowEthProvider();
  if (win) return win;

  throw new Error("No Ethereum provider available (Farcaster or window.ethereum).");
}

export async function connectWallet(): Promise<string> {
  const provider = await getEthereumProvider();
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts || !accounts.length) {
    throw new Error("No account returned from provider.");
  }
  const addr = accounts[0];
  if (typeof addr !== "string") {
    throw new Error("Invalid account type from provider.");
  }
  return addr;
}

export function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function isFarcasterEnvironment(): boolean {
  try {
    const p = (sdk as any)?.wallet?.getEthereumProvider?.();
    return !!p;
  } catch {
    return false;
  }
}
