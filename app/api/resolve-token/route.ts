// app/api/resolve-token/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const marketId = searchParams.get("marketId");
  const outcome = searchParams.get("outcome");

  if (!marketId || !outcome) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://gamma-api.polymarket.com/markets/${marketId}`);
    if (!res.ok) throw new Error("Market not found");
    
    const data = await res.json();
    const tokens = JSON.parse(data.clobTokenIds);
    const outcomes = JSON.parse(data.outcomes);
    
    const index = outcomes.findIndex((o: string) => o.toLowerCase() === outcome.toLowerCase());
    
    if (index === -1 || !tokens[index]) {
        return NextResponse.json({ error: "Outcome not found" }, { status: 404 });
    }

    return NextResponse.json({ tokenId: tokens[index] });
  } catch (e) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}