// app/actions/markets.ts
"use server";

export async function getMarketMetadata(conditionId: string) {
  if (!conditionId) return null;

  try {
    // FIX: Use query param ?condition_id=... instead of path param
    const res = await fetch(`https://gamma-api.polymarket.com/markets?condition_id=${conditionId}`, {
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) return null;
    
    // The list endpoint returns an array
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const market = data[0];

    return {
      question: market.question,
      slug: market.slug,
      icon: market.icon,
      // Helper to determine token outcome (Yes/No) based on asset_id if needed later
      tokens: market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [] 
    };
  } catch (e) {
    console.error("Market fetch error:", e);
    return null;
  }
}