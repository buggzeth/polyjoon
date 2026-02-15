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
      const validMarkets = (event.markets || []).filter((market) => {
        if (market.closed) return false;
        if (!market.endDate) return false; 
        const marketEnd = new Date(market.endDate).getTime();
        return marketEnd > now;
      });

      return { ...event, markets: validMarkets };
    })
    .filter((event) => {
      if (event.markets.length === 0) return false;
      if (event.closed) return false;
      if (event.endDate) {
        const eventEnd = new Date(event.endDate).getTime();
        if (eventEnd <= now) return false;
      }
      return true;
    });
}

// UPDATE: Added tagSlug optional parameter
export async function fetchEvents(
  offset: number = 0, 
  limit: number = 20,
  maxVolume?: number,
  maxEndDate?: string,
  query?: string,
  tagSlug?: string
): Promise<PolymarketEvent[]> {
  
  let data: PolymarketEvent[] = [];

  // MODE 1: SEARCH
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
      if (!res.ok) return [];
      const json = await res.json();
      data = json.events || [];
    } catch (error) {
      console.error("Search fetch error:", error);
      return [];
    }
  }
  // MODE 2: STANDARD FEED
  else {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      active: "true",
      closed: "false",
      order: "volume",
      ascending: "false",
    });

    if (maxVolume !== undefined && maxVolume !== null) params.append("volume_max", maxVolume.toString());
    if (maxEndDate) params.append("end_date_max", maxEndDate);
    if (tagSlug) params.append("tag_slug", tagSlug);

    try {
      const res = await fetch(`${BASE_URL}/events?${params.toString()}`, {
        next: { revalidate: 60 },
        headers: { "Accept": "application/json" },
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

  return filterActiveEvents(data);
}

// NEW HELPER: Specifically for the Curated Sections
export async function fetchTopEventsByTag(tagSlug: string, limit: number = 3) {
  // We use a high volume filter implicitly by sorting by volume in fetchEvents
  return await fetchEvents(0, limit, undefined, undefined, undefined, tagSlug);
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