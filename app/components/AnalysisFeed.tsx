// app/components/AnalysisFeed.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { AnalysisRecord, fetchAnalysisPage } from "../actions/storage";

interface AnalysisFeedProps {
  initialRecords: AnalysisRecord[];
}

export default function AnalysisFeed({ initialRecords }: AnalysisFeedProps) {
  // --- STATE ---
  const [records, setRecords] = useState<AnalysisRecord[]>(initialRecords);
  const [offset, setOffset] = useState(initialRecords.length);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // --- FILTERS STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [minEV, setMinEV] = useState<number>(0);
  const [showBuysOnly, setShowBuysOnly] = useState(false);

  // --- INFINITE SCROLL ---
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [isLoading, hasMore, offset]);

  const loadMore = async () => {
    setIsLoading(true);
    try {
      // Fetch next batch
      const newRecords = await fetchAnalysisPage(offset, 20);
      
      if (newRecords.length === 0) {
        setHasMore(false);
      } else {
        // Append unique records only (safety check)
        setRecords((prev) => {
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNew = newRecords.filter(r => !existingIds.has(r.id));
          return [...prev, ...uniqueNew];
        });
        setOffset((prev) => prev + 20);
      }
    } catch (err) {
      console.error("Failed to load more analysis", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FILTERING LOGIC (Applied to loaded records) ---
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const data = record.analysis_data;
      
      // 1. Text Search (Summary, Event ID, or Headlines)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        !searchTerm || 
        record.event_id.toLowerCase().includes(searchLower) ||
        data.summary.toLowerCase().includes(searchLower) ||
        data.opportunities.some(o => o.marketQuestion.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      // 2. Buys Only Filter (Now effectively "Has Trades")
      if (showBuysOnly) {
        if (data.opportunities.length === 0) return false;
      }

      // 3. EV Filter (Show if ANY opp in the analysis > minEV)
      if (minEV > 0) {
         const meetsEV = data.opportunities.some(o => (o.expectedValue * 100) >= minEV);
         if (!meetsEV) return false;
      }
      
      return true;
    });
  }, [records, searchTerm, showBuysOnly, minEV]);

  return (
    <div className="space-y-8">
      
      {/* --- Filter Controls (Non-Sticky) --- */}
      {/* Removed 'sticky top-20 z-30' */}
      <div className="bg-zinc-900/80 border border-orange-900/20 p-6 rounded-sm backdrop-blur-md shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Search */}
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Search</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Filter by keywords, questions or Event ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-slate-700 text-slate-200 rounded-sm pl-10 pr-4 py-3 focus:border-indigo-500 outline-none"
              />
               <span className="absolute left-3 top-3.5 text-slate-600">🔍</span>
            </div>
          </div>

          {/* Sliders & Toggles */}
          <div className="flex flex-col sm:flex-row gap-6 lg:w-1/2">
            
            {/* EV Slider */}
            <div className="flex-1">
              <div className="flex justify-between items-end mb-2">
                <label className="text-[10px] uppercase font-bold text-slate-500">Min EV</label>
                <span className="font-mono text-lime-400 font-bold text-xs">+{minEV}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="50" step="5"
                value={minEV}
                onChange={(e) => setMinEV(Number(e.target.value))}
                className="w-full h-1.5 bg-orange-900/20 rounded-sm appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Toggle */}
            <div className="flex items-end pb-1">
              <button
                onClick={() => setShowBuysOnly(!showBuysOnly)}
                className={`
                  w-full sm:w-auto px-4 py-2.5 rounded-sm border text-xs font-bold transition-all flex items-center justify-center gap-2
                  ${showBuysOnly 
                    ? "bg-lime-900/30 border-emerald-500/50 text-lime-400 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]" 
                    : "bg-orange-900/20 border-slate-700 text-zinc-400 hover:border-slate-600"}
                `}
              >
                {showBuysOnly ? "✅ TRADES ONLY" : "👁 ALL RECORDS"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Feed List --- */}
      <div className="space-y-6">
        {filteredRecords.map((record) => (
          <AnalysisFeedItem key={record.id} record={record} />
        ))}

        {filteredRecords.length === 0 && !isLoading && (
          <div className="text-center py-12 border border-dashed border-orange-900/20 rounded-sm text-slate-500">
             No records found matching your filters.
          </div>
        )}
      </div>

      {/* --- Loader --- */}
      <div ref={loaderRef} className="flex justify-center py-8">
        {isLoading ? (
          <div className="flex items-center gap-2 text-orange-400">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading History...</span>
          </div>
        ) : !hasMore && records.length > 0 ? (
          <div className="text-slate-600 text-xs uppercase tracking-widest">End of Archives</div>
        ) : null}
      </div>

    </div>
  );
}

function AnalysisFeedItem({ record }: { record: AnalysisRecord }) {
  const data = record.analysis_data;
  const date = new Date(record.created_at);
  
  // Find key stats
  const oppCount = data.opportunities.length;
  const maxEV = Math.max(...data.opportunities.map(o => o.expectedValue), 0);
  
  // Determine Primary Title (Group Name)
  // We use the first opportunity's question or the event ID
  const primaryQuestion = data.opportunities[0]?.marketQuestion || `Event Analysis: ${record.event_id}`;

  return (
    <div className="bg-zinc-900 border border-orange-900/20 rounded-sm overflow-hidden hover:border-slate-700 transition-colors">
      
      {/* Header (Parent Event Context) */}
      <div className="bg-zinc-950/50 border-b border-orange-900/20 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-zinc-900 px-1.5 py-0.5 rounded border border-orange-900/20">
                    Parent Event
                </span>
                <span className="text-[10px] text-slate-600 font-mono">
                    {date.toLocaleDateString()} • {date.toLocaleTimeString()}
                </span>
            </div>
            <h3 className="text-base font-bold text-slate-200 leading-tight">
                {primaryQuestion}
            </h3>
        </div>

        <Link 
            href={`/analysis/result?eventId=${record.event_id}`}
            className="shrink-0 bg-orange-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-sm transition-colors shadow-lg shadow-indigo-900/20"
        >
            View Full Analysis 🡆
        </Link>
      </div>

      {/* Content Preview */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Summary */}
        <div className="lg:col-span-2">
            <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">AI Executive Summary</div>
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
                {data.summary}
            </p>
        </div>

        {/* Right: Quick Stats */}
        <div className="bg-zinc-950 rounded-sm p-3 border border-orange-900/20 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Best Opp</span>
                <span className={`text-sm font-mono font-bold ${maxEV > 0 ? 'text-lime-400' : 'text-zinc-400'}`}>
                    {maxEV > 0 ? '+' : ''}{(maxEV * 100).toFixed(0)}% EV
                </span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Signals</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${oppCount > 0 ? 'bg-indigo-900/30 text-orange-400' : 'bg-orange-900/20 text-slate-500'}`}>
                    {oppCount} Trades Identified
                </span>
            </div>
        </div>

      </div>
    </div>
  );
}