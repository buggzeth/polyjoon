// app/actions/profile.ts
"use server";

import { Position, Trade, Activity } from "../types/data-api";

const DATA_API = "https://data-api.polymarket.com";

export async function getUserData(userAddress: string) {
  if (!userAddress) return null;

  try {
    // Execute fetches in parallel for speed
    const [positionsRes, tradesRes, activityRes, valueRes] = await Promise.all([
      fetch(`${DATA_API}/positions?user=${userAddress}&sortBy=CURRENT&sortDirection=DESC`, { cache: 'no-store' }),
      fetch(`${DATA_API}/trades?user=${userAddress}&limit=20`, { cache: 'no-store' }),
      fetch(`${DATA_API}/activity?user=${userAddress}&limit=20`, { cache: 'no-store' }),
      fetch(`${DATA_API}/value?user=${userAddress}`, { cache: 'no-store' })
    ]);

    const positions: Position[] = positionsRes.ok ? await positionsRes.json() : [];
    const trades: Trade[] = tradesRes.ok ? await tradesRes.json() : [];
    const activity: Activity[] = activityRes.ok ? await activityRes.json() : [];
    
    // Value endpoint returns { user: "...", value: 123.45 }
    const valueData = valueRes.ok ? await valueRes.json() : { value: 0 };

    return {
      positions,
      trades,
      activity,
      portfolioValue: valueData.value || 0
    };
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return null;
  }
}