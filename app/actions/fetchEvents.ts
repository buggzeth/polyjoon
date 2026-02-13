// app/actions/fetchEvents.ts
"use server";

import { PolymarketEvent } from "../types/polymarket";

const BASE_URL = process.env.NEXT_PUBLIC_POLYMARKET_API_URL || "https://gamma-api.polymarket.com";

/**
 * Strict filtering to ensure we only show events/markets that are currently betting.
 * 
 * Logic:
 * 1. Filter the event's 'markets' array to only keep those where endDate > now AND closed is false.
 * 2. If an event ends up with 0 valid markets, drop the event entirely.
 * 3. Double check the event's own 'endDate' and 'closed' status.
 */
function filterActiveEvents(events: PolymarketEvent[]): PolymarketEvent[] {
  const now = Date.now();

  return events
    .map((event) => {
      // 1. Filter inner markets based on date and status
      const validMarkets = (event.markets || []).filter((market) => {
        // Explicit closed check
        if (market.closed) return false;

        // Date check: Market must expire in the future
        if (!market.endDate) return false; 
        const marketEnd = new Date(market.endDate).getTime();
        
        return marketEnd > now;
      });

      // Return a shallow copy of the event with only valid markets
      return {
        ...event,
        markets: validMarkets,
      };
    })
    .filter((event) => {
      // 2. Filter the event wrapper
      
      // If no valid markets remain after step 1, hide the event
      if (event.markets.length === 0) return false;

      // Event-level explicit closed check
      if (event.closed) return false;

      // Event-level date check
      // (Usually redundant if markets are open, but good for safety)
      if (event.endDate) {
        const eventEnd = new Date(event.endDate).getTime();
        if (eventEnd <= now) return false;
      }

      return true;
    });
}

export async function fetchEvents(
  offset: number = 0, 
  limit: number = 20,
  maxVolume?: number,
  maxEndDate?: string,
  query?: string
): Promise<PolymarketEvent[]> {
  
  let data: PolymarketEvent[] = [];

  // ---------------------------------------------------------
  // MODE 1: SEARCH ACTIVE (Uses /public-search)
  // ---------------------------------------------------------
  if (query && query.trim().length > 0) {
    const page = Math.floor(offset / limit) + 1;

    const searchParams = new URLSearchParams({
      q: query.trim(),
      limit_per_type: limit.toString(),
      page: page.toString(),
      events_status: "active", 
      sort: "volume",
      ascending: "false",
    });

    try {
      const res = await fetch(`${BASE_URL}/public-search?${searchParams.toString()}`, {
        cache: "no-store",
        headers: { "Accept": "application/json" },
      });

      if (!res.ok) {
        console.error(`Search API Error: ${res.status}`);
        return [];
      }

      const json = await res.json();
      data = json.events || [];

      // Manual param filters (Search API doesn't support them)
      if (maxVolume !== undefined && maxVolume !== null) {
        data = data.filter(e => e.volume <= maxVolume);
      }
      if (maxEndDate) {
        const maxDate = new Date(maxEndDate).getTime();
        data = data.filter(e => e.endDate ? new Date(e.endDate).getTime() <= maxDate : true);
      }

    } catch (error) {
      console.error("Search fetch error:", error);
      return [];
    }
  }
  // ---------------------------------------------------------
  // MODE 2: STANDARD FEED (Uses /events)
  // ---------------------------------------------------------
  else {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      active: "true",
      closed: "false",
      order: "volume",
      ascending: "false",
    });

    if (maxVolume !== undefined && maxVolume !== null) {
      params.append("volume_max", maxVolume.toString());
    }

    if (maxEndDate) {
      params.append("end_date_max", maxEndDate);
    }

    try {
      const res = await fetch(`${BASE_URL}/events?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!res.ok) {
        console.error(`API Error: ${res.status}`);
        return [];
      }

      data = await res.json();
    } catch (error) {
      console.error("Fetch error:", error);
      return [];
    }
  }

  // ---------------------------------------------------------
  // FINAL PASS: Strict Date & Market Validity Filtering
  // ---------------------------------------------------------
  return filterActiveEvents(data);
}

export async function getEventById(eventId: string): Promise<PolymarketEvent | null> {
  try {
    const res = await fetch(`${BASE_URL}/events/${eventId}`, {
      cache: "no-store",
      headers: { "Accept": "application/json" }
    });
    
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Get Event Error:", error);
    return null;
  }
}