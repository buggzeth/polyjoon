// app/actions/clob.ts
"use server";

import { ClobData, OrderBook } from "../types/clob";

const CLOB_API = "https://clob.polymarket.com";

export async function fetchClobData(tokenIds: string[]): Promise<ClobData> {
  if (tokenIds.length === 0) {
    return { books: {}, spreads: {}, prices: {} };
  }

  // Deduplicate IDs
  const uniqueIds = Array.from(new Set(tokenIds));
  const payload = uniqueIds.map(id => ({ token_id: id }));
  const pricePayload = uniqueIds.map(id => [
    { token_id: id, side: "BUY" }, 
    { token_id: id, side: "SELL" }
  ]).flat();

  try {
    // 1. Fetch Books (Batch)
    const booksRes = await fetch(`${CLOB_API}/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store" // Always fresh
    });
    
    // 2. Fetch Spreads (Batch)
    const spreadsRes = await fetch(`${CLOB_API}/spreads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    // 3. Fetch Prices (Batch) - Optional but good for confirmation
    const pricesRes = await fetch(`${CLOB_API}/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pricePayload),
      cache: "no-store"
    });

    const booksData = await booksRes.json();
    const spreadsData = await spreadsRes.json();
    const pricesData = await pricesRes.json();

    // Transform Books Array to Map
    const booksMap: Record<string, OrderBook> = {};
    if (Array.isArray(booksData)) {
        booksData.forEach((book: any) => {
            // Polymarket returns 'asset_id' as the token ID in this response
            if (book.asset_id) booksMap[book.asset_id] = book;
        });
    }

    return {
      books: booksMap,
      spreads: spreadsData, // Returns object { "token_id": "0.01" }
      prices: pricesData    // Returns object { "token_id": { "BUY": "...", "SELL": "..." } }
    };

  } catch (error) {
    console.error("Error fetching CLOB data:", error);
    return { books: {}, spreads: {}, prices: {} };
  }
}

// Helper to resolve MarketID + Outcome Name -> Token ID
// We need this because AI gives us "Yes", but CLOB needs "0x123..."
export async function resolveTokenIds(
  targets: { marketId: string; outcome: string }[]
): Promise<Record<string, string>> {
  
  const resolved: Record<string, string> = {}; // key: "marketId-outcome", value: "tokenId"
  
  // Group by marketId to minimize Gamma API calls
  const marketIds = Array.from(new Set(targets.map(t => t.marketId)));

  await Promise.all(marketIds.map(async (mid) => {
    try {
      const res = await fetch(`https://gamma-api.polymarket.com/markets/${mid}`, { 
        next: { revalidate: 300 } // Cache definition for 5 mins, tokens don't change
      });
      if (!res.ok) return;
      
      const data = await res.json();
      const outcomes = JSON.parse(data.outcomes);       // ["Yes", "No"]
      const tokens = JSON.parse(data.clobTokenIds);     // ["0x...", "0x..."]

      targets.filter(t => t.marketId === mid).forEach(target => {
        // Find index (case insensitive)
        const idx = outcomes.findIndex((o: string) => o.toLowerCase() === target.outcome.toLowerCase());
        if (idx !== -1 && tokens[idx]) {
          resolved[`${mid}-${target.outcome}`] = tokens[idx];
        }
      });
    } catch (e) {
      console.error(`Failed to resolve tokens for market ${mid}`, e);
    }
  }));

  return resolved;
}