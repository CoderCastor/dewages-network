import { useState, useEffect } from "react";

const FALLBACK = 8000;
const CACHE_KEY = "sol_inr_price";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useSolPrice() {
  const [solPriceINR, setSolPriceINR] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.price;
    } catch { /* ignore */ }
    return FALLBACK;
  });
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=inr",
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        const price = data?.solana?.inr;
        if (!price || cancelled) return;
        setSolPriceINR(price);
        setLive(true);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ price, ts: Date.now() }));
      } catch { /* network failure — keep fallback, don't crash */ }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, CACHE_TTL);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { solPriceINR, live };
}
