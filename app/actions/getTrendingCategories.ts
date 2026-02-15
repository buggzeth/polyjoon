// app/actions/getTrendingCategories.ts
"use server";

import { fetchEvents } from "./fetchEvents";
import { PolymarketEvent } from "../types/polymarket";

interface CategoryGroup {
  slug: string;
  label: string;
  totalVolume: number;
  events: PolymarketEvent[];
}

const ICON_MAP: Record<string, string> = {
  "politics": "🏛️",
  "us-politics": "🦅",
  "global-politics": "🌍",
  "elections": "🗳️",
  "crypto": "₿",
  "bitcoin": "🟠",
  "ethereum": "💎",
  "nfts": "🖼️",
  "sports": "🏆",
  "nba": "🏀",
  "nfl": "🏈",
  "soccer": "⚽",
  "pop-culture": "✨",
  "business": "💼",
  "science": "🧬",
  "middle-east": "🏜️",
  "ai": "🤖",
  "technology": "💾"
};

function getIconForSlug(slug: string): string {
  if (ICON_MAP[slug]) return ICON_MAP[slug];
  if (slug.includes("politics")) return "🏛️";
  if (slug.includes("tech")) return "💾";
  if (slug.includes("crypto")) return "₿";
  return "⚡"; 
}

export async function getTrendingCategories() {
  // 1. Fetch a large batch to ensure we have enough diversity
  const topEvents = await fetchEvents(0, 100);

  const rawCategories = new Map<string, CategoryGroup>();

  // 2. Initial Bucket Sort
  topEvents.forEach((event) => {
    if (!event.tags || event.tags.length === 0) return;

    event.tags.forEach((tag) => {
      // Blacklist generic/metadata tags
      if (["active", "verified", "clob", "2024", "2025"].includes(tag.slug)) return;

      const current = rawCategories.get(tag.slug) || {
        slug: tag.slug,
        label: tag.label || tag.slug,
        totalVolume: 0,
        events: []
      };

      if (!current.events.find(e => e.id === event.id)) {
        current.events.push(event);
        current.totalVolume += event.volume;
      }
      rawCategories.set(tag.slug, current);
    });
  });

  // 3. Sort categories by volume (High to Low)
  const sortedCandidates = Array.from(rawCategories.values())
    .sort((a, b) => b.totalVolume - a.totalVolume);

  // 4. "Winner Takes All" Deduplication
  const finalCategories: CategoryGroup[] = [];
  const claimedEventIds = new Set<string>();

  for (const candidate of sortedCandidates) {
    // Filter out events that have already been claimed by a higher-volume category
    const uniqueEvents = candidate.events.filter(e => !claimedEventIds.has(e.id));

    // If this category still has enough unique content (>= 3 events), keep it
    if (uniqueEvents.length >= 3) {
      // Update the category with only its unique events
      candidate.events = uniqueEvents;
      
      // Mark these events as claimed
      uniqueEvents.forEach(e => claimedEventIds.add(e.id));
      
      finalCategories.push(candidate);
    }
  }

  // 5. Return top 12 valid categories (to allow for the "Show More" expansion)
  return finalCategories.slice(0, 12).map(cat => ({
    title: cat.label,
    icon: getIconForSlug(cat.slug),
    // Slice up to 9 for the internal grid
    events: cat.events.slice(0, 9) 
  }));
}