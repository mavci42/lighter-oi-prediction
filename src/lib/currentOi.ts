const COINGECKO_DEMO_KEY = "CG-FJ4paYNzau8KrTYJ5B81p3Lf";

export type CurrentOiResult = {
  usd: number | null;
  raw: any | null;
};

export async function fetchLighterCurrentOi(): Promise<CurrentOiResult> {
  const apiKey = COINGECKO_DEMO_KEY;

  if (!apiKey) {
    console.warn("[CurrentOI] CoinGecko demo API key is not set.");
    return { usd: null, raw: null };
  }

  try {
    //
    // 1) Fetch Lighter EXCHANGE-level open interest in BTC
    //    Endpoint: /api/v3/derivatives/exchanges/lighter
    //
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

    // open_interest_btc may be number or string; normalize
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

    //
    // 2) Fetch BTC price in USD
    //    Endpoint: /api/v3/simple/price?ids=bitcoin&vs_currencies=usd
    //
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

    //
    // 3) Compute total OI in USD = OI_BTC * BTC_USD
    //
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