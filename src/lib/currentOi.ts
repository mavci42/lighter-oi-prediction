export type CurrentOiResult = {
  usd: number | null;
  raw: any | null;
};

export async function fetchLighterCurrentOi(): Promise<CurrentOiResult> {
  const apiKey = import.meta.env.VITE_COINGECKO_API_KEY;

  // If there is no API key, just return null and let the UI show "coming soon..."
  if (!apiKey) {
    console.warn("[CurrentOI] VITE_COINGECKO_API_KEY is not set, skipping OI fetch.");
    return { usd: null, raw: null };
  }

  try {
    // Use the root domain and x_cg_demo_api_key query param as specified by CoinGecko
    const url =
      "https://api.coingecko.com/api/v3/derivatives/exchanges/lighter" +
      "?x_cg_demo_api_key=" +
      encodeURIComponent(apiKey);

    const res = await fetch(url);

    if (!res.ok) {
      console.error(
        "[CurrentOI] CoinGecko response not ok:",
        res.status,
        res.statusText
      );
      return { usd: null, raw: null };
    }

    const data = await res.json();

    // Lighter is a derivatives EXCHANGE; we want TOTAL exchange OI,
    // not a single pair. CoinGecko derivatives exchange schema typically provides:
    //  - open_interest_usd
    //  - open_interest_btc
    //  - bitcoin_price_usd
    // We prefer USD if present, otherwise derive from BTC OI * BTC price.
    const openInterestBtc =
      typeof data?.open_interest_btc === "number"
        ? data.open_interest_btc
        : typeof data?.open_interest_btc_value === "number"
        ? data.open_interest_btc_value
        : null;

    const btcPriceUsd =
      typeof data?.bitcoin_price_usd === "number"
        ? data.bitcoin_price_usd
        : typeof data?.btc_price_usd === "number"
        ? data.btc_price_usd
        : null;

    let usd: number | null = null;

    if (typeof data?.open_interest_usd === "number") {
      usd = data.open_interest_usd;
    } else if (
      typeof openInterestBtc === "number" &&
      typeof btcPriceUsd === "number"
    ) {
      usd = openInterestBtc * btcPriceUsd;
    }

    return {
      usd: Number.isFinite(usd as number) ? (usd as number) : null,
      raw: data,
    };
  } catch (err) {
    console.error("[CurrentOI] failed to fetch from CoinGecko:", err);
    return { usd: null, raw: null };
  }
}