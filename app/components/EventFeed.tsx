// app/components/EventFeed.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { PolymarketEvent } from "../types/polymarket";
import EventCard from "./EventCard";
import { fetchEvents } from "../actions/fetchEvents";
import CrabSpinner from "./CrabSpinner";

interface EventFeedProps {
  initialEvents: PolymarketEvent[];
}

export default function EventFeed({ initialEvents }: EventFeedProps) {
  // Data State
  const [events, setEvents] = useState<PolymarketEvent[]>(initialEvents);
  const [offset, setOffset] = useState(initialEvents.length);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Storage State: Prevents initial render from overwriting LS with defaults
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // --- FILTERS ---
  // Volume Filter (Default 5M)
  const [volumeCap, setVolumeCap] = useState<number>(5000000); 
  // Date Filter (Default 365 days)
  const [daysCap, setDaysCap] = useState<number>(365);
  // Search Filter
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Debounced Values
  const [debouncedVolumeCap, setDebouncedVolumeCap] = useState<number>(5000000);
  const [debouncedDaysCap, setDebouncedDaysCap] = useState<number>(365);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");

  const loaderRef = useRef<HTMLDivElement>(null);

  // 1. Load from LocalStorage on Mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedVol = localStorage.getItem("nuke_vol");
        const savedDays = localStorage.getItem("nuke_days");
        const savedQuery = localStorage.getItem("nuke_query");

        if (savedVol) {
          setVolumeCap(Number(savedVol));
          setDebouncedVolumeCap(Number(savedVol));
        }
        if (savedDays) {
          setDaysCap(Number(savedDays));
          setDebouncedDaysCap(Number(savedDays));
        }
        if (savedQuery) {
          setSearchQuery(savedQuery);
          setDebouncedSearchQuery(savedQuery);
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setIsStorageLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // 2. Save to LocalStorage when filters change
  useEffect(() => {
    if (!isStorageLoaded) return;
    localStorage.setItem("nuke_vol", volumeCap.toString());
    localStorage.setItem("nuke_days", daysCap.toString());
    localStorage.setItem("nuke_query", searchQuery);
  }, [volumeCap, daysCap, searchQuery, isStorageLoaded]);

  // 3. Handle Debounce (Combine all filters)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedVolumeCap(volumeCap);
      setDebouncedDaysCap(daysCap);
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [volumeCap, daysCap, searchQuery]);

  // Helper: Get ISO Date string for N days from now
  const getIsoDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  };

  // 4. Refetch when Filters Change
  useEffect(() => {
    // Prevent fetching until storage is checked to avoid UI flicker/double fetch
    if (!isStorageLoaded) return;

    // Optimization: If it's the very first render and values match initial props/empty state, 
    // use the server-passed initialEvents to save a fetch.
    if (
      debouncedVolumeCap === 5000000 && 
      debouncedDaysCap === 365 && 
      debouncedSearchQuery === "" &&
      events === initialEvents
    ) return;

    const resetFeed = async () => {
      setIsLoading(true);
      setEvents([]); 
      setHasMore(true);
      
      try {
        const endDateStr = getIsoDate(debouncedDaysCap);
        
        // Pass all filters including search query
        const newEvents = await fetchEvents(
          0, 
          20, 
          debouncedVolumeCap, 
          endDateStr,
          debouncedSearchQuery
        );
        setEvents(newEvents);
        setOffset(20);
      } catch (e) {
        console.error("Filter error", e);
      } finally {
        setIsLoading(false);
      }
    };

    resetFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedVolumeCap, debouncedDaysCap, debouncedSearchQuery, isStorageLoaded]);

  // 5. Infinite Scroll
  useEffect(() => {
    if (!isStorageLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [isLoading, hasMore, offset, debouncedVolumeCap, debouncedDaysCap, debouncedSearchQuery, isStorageLoaded]);

  const loadMore = async () => {
    setIsLoading(true);
    try {
      const endDateStr = getIsoDate(debouncedDaysCap);

      const newEvents = await fetchEvents(
        offset, 
        20, 
        debouncedVolumeCap, 
        endDateStr,
        debouncedSearchQuery
      );
      
      if (newEvents.length === 0) {
        setHasMore(false);
      } else {
        setEvents((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const uniqueNew = newEvents.filter((e: any) => !existingIds.has(e.id));
          return [...prev, ...uniqueNew];
        });
        setOffset((prev) => prev + 20);
      }
    } catch (err) {
      console.error("Failed to load more", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Formatting helpers
  const formatVol = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
    return `$${val}`;
  };

  const formatDays = (val: number) => {
    if (val === 1) return "24 Hours";
    if (val === 365) return "1 Year+";
    return `${val} Days`;
  };

  // Prevent rendering until we know the local storage state to avoid hydration mismatch/flicker
  if (!isStorageLoaded) {
    return <div className="min-h-[50vh] flex items-center justify-center"><CrabSpinner text="LOADING PREFERENCES..." /></div>;
  }

  return (
    <div className="space-y-8">
      
      {/* --- Filter Control Bar --- */}
      <div className="bg-zinc-900/80 border border-orange-900/20 p-6 rounded-sm backdrop-blur-md shadow-2xl space-y-8">
        
        {/* Search Bar */}
        <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-orange-600 font-mono font-bold animate-pulse">{'>'}</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH PROTOCOLS [Trump, Crypto, NFL...]"
              className="w-full bg-black/50 border border-orange-900/30 text-orange-50 font-mono text-sm rounded-sm py-3 pl-8 pr-10 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 placeholder-zinc-700 transition-all"
            />
            {searchQuery && (
               <button 
                 onClick={() => setSearchQuery("")}
                 className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-600 hover:text-orange-500"
               >
                 <span className="text-[10px] uppercase font-bold tracking-wider">CLR</span>
               </button>
            )}
        </div>

        {/* Sliders Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-orange-900/10 pt-6">
            
            {/* Volume Slider */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-slate-200 font-bold text-sm uppercase tracking-wide">Volume Ceiling</h3>
                        <p className="text-slate-500 text-xs mt-1">
                            Filter low liquidity vs viral markets.
                        </p>
                    </div>
                    <div className="text-2xl font-mono font-bold text-orange-400">
                        {formatVol(volumeCap)}
                    </div>
                </div>
                <div className="relative pt-2">
                    <input 
                        type="range" 
                        min="1000" 
                        max="5000000" 
                        step="1000"
                        value={volumeCap}
                        onChange={(e) => setVolumeCap(Number(e.target.value))}
                        className="w-full h-2 bg-orange-900/20 rounded-sm appearance-none cursor-pointer accent-indigo-500 hover:accent-orange-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-600 font-mono uppercase mt-2">
                        <span>$1k</span>
                        <span>$5M</span>
                    </div>
                </div>
            </div>

            {/* End Date Slider */}
            <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l border-orange-900/20 pt-4 md:pt-0 md:pl-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-slate-200 font-bold text-sm uppercase tracking-wide">Ends Within</h3>
                        <p className="text-slate-500 text-xs mt-1">
                            Find markets resolving <span className="text-lime-400 font-bold">soon</span>.
                        </p>
                    </div>
                    <div className="text-2xl font-mono font-bold text-lime-400">
                        {formatDays(daysCap)}
                    </div>
                </div>
                <div className="relative pt-2">
                    <input 
                        type="range" 
                        min="1" 
                        max="365" 
                        step="1"
                        value={daysCap}
                        onChange={(e) => setDaysCap(Number(e.target.value))}
                        className="w-full h-2 bg-orange-900/20 rounded-sm appearance-none cursor-pointer accent-emerald-500 hover:accent-lime-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-600 font-mono uppercase mt-2">
                        <span>Today</span>
                        <span>Next Year</span>
                    </div>
                </div>
            </div>

        </div>
      </div>

      {/* --- Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        
        {events.length === 0 && !isLoading && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center text-slate-500 border border-dashed border-orange-900/20 rounded-sm bg-zinc-900/30">
                <span className="text-2xl mb-2">☢️</span>
                <p className="font-mono text-sm">No markets found matching filters.</p>
                {debouncedSearchQuery && (
                  <p className="text-xs mt-2 text-orange-800">Query: "{debouncedSearchQuery}"</p>
                )}
            </div>
        )}
      </div>

      {/* --- Loader --- */}
      <div ref={loaderRef} className="flex justify-center py-10 w-full">
        {isLoading ? (
          <CrabSpinner text={debouncedSearchQuery ? "SCANNING SECTOR..." : "HUNTING FOR MARKETS..."} size="sm" />
        ) : !hasMore && events.length > 0 ? (
          <div className="text-slate-600 text-sm font-mono border-t border-orange-900/10 pt-4">
            // END OF FEED
          </div>
        ) : (
          <div className="h-10" />
        )}
      </div>
    </div>
  );
}