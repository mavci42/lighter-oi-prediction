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
    // 1) Fetch Lighter derivatives EXCHANGE data -> total OI in BTC
    //    Use the root domain and x_cg_demo_api_key query param as specified by CoinGecko.
    const lighterUrl =
      "https://api.coingecko.com/api/v3/derivatives/exchanges/lighter" +
      "?x_cg_demo_api_key=" +
      encodeURIComponent(apiKey);

    const lighterRes = await fetch(lighterUrl);

    if (!lighterRes.ok) {
      console.error(
        "[CurrentOI] CoinGecko lighter response not ok:",
        lighterRes.status,
        lighterRes.statusText
      );
      return { usd: null, raw: null };
    }

    const lighterData = await lighterRes.json();

    // open_interest_btc may be a number or a string; normalize to a number
    const oiBtcRaw = lighterData?.open_interest_btc;
    let oiBtc: number | null = null;

    if (typeof oiBtcRaw === "number") {
      oiBtc = oiBtcRaw;
    } else if (typeof oiBtcRaw === "string") {
      const parsed = parseFloat(oiBtcRaw);
      oiBtc = Number.isFinite(parsed) ? parsed : null;
    }

    if (oiBtc == null || !Number.isFinite(oiBtc)) {
      console.warn("[CurrentOI] open_interest_btc is missing or invalid:", oiBtcRaw);
      return { usd: null, raw: { lighter: lighterData } };
    }

    // 2) Fetch BTC price in USD using the simple price endpoint:
    //    https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&x_cg_demo_api_key=KEY
    const priceUrl =
      "https://api.coingecko.com/api/v3/simple/price" +
      "?ids=bitcoin&vs_currencies=usd" +
      "&x_cg_demo_api_key=" +
      encodeURIComponent(apiKey);

    const priceRes = await fetch(priceUrl);

    if (!priceRes.ok) {
      console.error(
        "[CurrentOI] CoinGecko price response not ok:",
        priceRes.status,
        priceRes.statusText
      );
      return { usd: null, raw: { lighter: lighterData } };
    }

    const priceData = await priceRes.json();
    const btcUsdRaw = priceData?.bitcoin?.usd;
    let btcUsd: number | null = null;

    if (typeof btcUsdRaw === "number") {
      btcUsd = btcUsdRaw;
    } else if (typeof btcUsdRaw === "string") {
      const parsed = parseFloat(btcUsdRaw);
      btcUsd = Number.isFinite(parsed) ? parsed : null;
    }

    if (btcUsd == null || !Number.isFinite(btcUsd)) {
      console.warn("[CurrentOI] BTC USD price is missing or invalid:", btcUsdRaw);
      return { usd: null, raw: { lighter: lighterData, price: priceData } };
    }

    // 3) Compute OI in USD
    const usdOi = oiBtc * btcUsd;

    return {
      usd: Number.isFinite(usdOi) ? usdOi : null,
      raw: { lighter: lighterData, price: priceData },
    };
  } catch (err) {
    console.error("[CurrentOI] failed to fetch from CoinGecko:", err);
    return { usd: null, raw: null };
  }
}