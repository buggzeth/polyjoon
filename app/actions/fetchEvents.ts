// app/actions/fetchEvents.ts
"use server";

import { PolymarketEvent } from "../types/polymarket";

const BASE_URL = process.env.NEXT_PUBLIC_POLYMARKET_API_URL || "https://gamma-api.polymarket.com";

export async function fetchEvents(
  offset: number = 0, 
  limit: number = 20,
  maxVolume?: number,
  maxEndDate?: string,
  query?: string // <--- NEW PARAMETER
): Promise<PolymarketEvent[]> {
  
  // Base params
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    active: "true",
    closed: "false",
    order: "volume",
    ascending: "false",
  });

  // Apply Volume Filter
  if (maxVolume !== undefined && maxVolume !== null) {
    params.append("volume_max", maxVolume.toString());
  }

  // Apply End Date Filter
  if (maxEndDate) {
    params.append("end_date_max", maxEndDate);
  }

  // NEW: Apply Search Query
  if (query && query.trim().length > 0) {
    // The Gamma API usually accepts 'q' for keyword search
    params.append("q", query.trim());
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

    const data: PolymarketEvent[] = await res.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
}

export async function getEventById(eventId: string): Promise<PolymarketEvent | null> {
  try {
    const res = await fetch(`https://gamma-api.polymarket.com/events/${eventId}`, {
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