// app/actions/profile.ts
"use server";

import { Position, Trade, Activity, ClosedPosition } from "../types/data-api";

const DATA_API = "https://data-api.polymarket.com";

export async function getUserData(userAddress: string) {
  if (!userAddress) {
    console.log("[Profile Action] No user address provided.");
    return null;
  }

  console.log(`[Profile Action] Fetching data for address: ${userAddress}`);

  try {
    // Execute fetches in parallel for speed
    const [positionsRes, tradesRes, activityRes, closedRes, valueRes] = await Promise.all([
      fetch(`${DATA_API}/positions?user=${userAddress}&sortBy=CURRENT&sortDirection=DESC`, { cache: 'no-store' }),
      fetch(`${DATA_API}/trades?user=${userAddress}&limit=20`, { cache: 'no-store' }),
      fetch(`${DATA_API}/activity?user=${userAddress}&limit=20`, { cache: 'no-store' }),
      fetch(`${DATA_API}/closed-positions?user=${userAddress}&limit=20`, { cache: 'no-store' }),
      fetch(`${DATA_API}/value?user=${userAddress}`, { cache: 'no-store' })
    ]);

    // --- LOGGING RESPONSES ---
    console.log(`[Profile Action] API Statuses - Pos: ${positionsRes.status}, Trades: ${tradesRes.status}, Act: ${activityRes.status}, Closed: ${closedRes.status}, Val: ${valueRes.status}`);

    let positions: Position[] = [];
    if (positionsRes.ok) {
        const rawPos = await positionsRes.json();
        positions = Array.isArray(rawPos) ? rawPos : [];
    }

    const trades: Trade[] = tradesRes.ok ? await tradesRes.json() : [];
    
    let activity: Activity[] = [];
    if (activityRes.ok) {
        const rawAct = await activityRes.json();
        activity = Array.isArray(rawAct) ? rawAct : [];
    }

    let closedPositions: ClosedPosition[] = [];
    if (closedRes.ok) {
        const rawClosed = await closedRes.json();
        closedPositions = Array.isArray(rawClosed) ? rawClosed : [];
    }

    // Value endpoint returns { user: "...", value: 123.45 }
    const valueData = valueRes.ok ? await valueRes.json() : { value: 0 };

    return {
      positions,
      trades,
      activity,
      closedPositions,
      portfolioValue: valueData.value || 0
    };
  } catch (error) {
    console.error("[Profile Action] Error fetching profile data:", error);
    return null;
  }
}