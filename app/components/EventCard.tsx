// app/components/EventCard.tsx
"use client";

import { useState } from "react";
import { PolymarketEvent } from "../types/polymarket";
import AnalyzeButton from "./AnalyzeButton";
import DataModal from "./DataModal";

const formatUSD = (amount: number | string) => {
  const num = Number(amount);
  if (isNaN(num)) return "$0";
  if (num > 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num > 1000) return `$${(num / 1000).toFixed(0)}k`;
  return `$${num.toFixed(0)}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

interface EventCardProps {
  event: PolymarketEvent;
  hasAnalysis?: boolean; // NEW: Passed from parent batch check
}

export default function EventCard({ event, hasAnalysis = false }: EventCardProps) {
  const [showAllMarkets, setShowAllMarkets] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);

  const INITIAL_MARKETS_TO_SHOW = 3;
  const markets = event.markets || [];

  const now = Date.now();

  const validMarkets = markets.filter((m) => {
    if (m.endDate) {
      const marketEnd = new Date(m.endDate).getTime();
      if (marketEnd <= now) return false;
    }
    try {
      if (!m.outcomes || !m.outcomePrices) return false;
      JSON.parse(m.outcomes);
      JSON.parse(m.outcomePrices);
      return true;
    } catch (e) {
      return false;
    }
  });

  if (validMarkets.length === 0) return null;

  const displayedMarkets = showAllMarkets 
    ? validMarkets 
    : validMarkets.slice(0, INITIAL_MARKETS_TO_SHOW);
  
  const hiddenCount = validMarkets.length - INITIAL_MARKETS_TO_SHOW;
  const eventImage = event.image || event.icon || "https://polymarket.com/images/fallback.png";

  return (
    <>
      {showDataModal && (
        <DataModal 
          eventId={event.id} 
          onClose={() => setShowDataModal(false)} 
        />
      )}

      <div className={`bg-zinc-900 border rounded-none transition-all duration-300 flex flex-col h-full relative group shadow-[0_0_15px_rgba(234,88,12,0.05)] hover:shadow-[0_0_20px_rgba(234,88,12,0.15)] ${hasAnalysis ? 'border-emerald-900/40 hover:border-emerald-500/50' : 'border-orange-900/20 hover:border-orange-500/50'}`}>
        
        {/* NEW: Analysis Badge (Zero latency, props based) */}
        {hasAnalysis && (
           <div className="absolute -top-2.5 -left-1 z-20 bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-lg flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              ANALYSIS READY
           </div>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDataModal(true);
          }}
          title="View Raw Data"
          className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-orange-600 text-slate-300 hover:text-white p-1.5 rounded-sm backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </button>

        {/* --- Header --- */}
        <div className="p-4 bg-zinc-900/50 relative border-b border-zinc-800">
          <div className="flex gap-4">
            <img
              src={eventImage}
              alt="icon"
              className="w-12 h-12 rounded-sm object-cover bg-orange-900/20"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="flex-1 min-w-0 pr-6">
              <h2 className="text-base font-bold text-orange-50 leading-snug mb-1 font-mono uppercase">
                {event.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                <span className="text-lime-400 font-mono text-xs">
                   VOL: {formatUSD(event.volume)} ☢️
                </span>
                <span>
                   Ends: {formatDate(event.endDate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- Markets List --- */}
        <div className="flex-1 p-3 bg-zinc-950 space-y-2">
          {displayedMarkets.map((market) => (
            <MarketItem key={market.id} market={market} />
          ))}

          {validMarkets.length > INITIAL_MARKETS_TO_SHOW && (
            <button 
              onClick={() => setShowAllMarkets(!showAllMarkets)}
              className="w-full py-1 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showAllMarkets ? "Show Less" : `+ ${hiddenCount} More Questions`}
            </button>
          )}
        </div>

        {/* --- NEW: Tags Section (Using existing event data) --- */}
        {event.tags && event.tags.length > 0 && (
          <div className="px-3 pb-2 bg-zinc-950 flex flex-wrap gap-1.5 mt-auto border-t border-zinc-800/50 pt-2">
             {event.tags.slice(0, 5).map((tag) => (
               <span 
                 key={tag.slug || tag.label} 
                 className="text-[10px] font-mono uppercase bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800 hover:text-orange-400 hover:border-orange-900/50 transition-colors cursor-default"
               >
                 #{tag.label}
               </span>
             ))}
          </div>
        )}

        {/* --- Footer: Analyze Button --- */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800">
          <AnalyzeButton event={event} hasAnalysis={hasAnalysis} />
        </div>
      </div>
    </>
  );
}

function MarketItem({ market }: { market: any }) {
  let outcomes: string[] = [];
  let prices: number[] = [];
  
  try {
    outcomes = JSON.parse(market.outcomes);
    prices = JSON.parse(market.outcomePrices).map((p: any) => Number(p));
  } catch(e) { return null; }

  return (
    <div className="bg-orange-900/20/40 rounded p-2 border border-slate-700/30">
      <div className="text-xs text-zinc-400 mb-2 font-medium line-clamp-1">
         {market.question}
      </div>

      <div className="space-y-1.5">
        {outcomes.map((outcome, idx) => {
          const price = prices[idx] || 0;
          const percentage = Math.round(price * 100);

          let barColor = "bg-slate-600";
          let textColor = "text-slate-300";

          const lower = outcome.toLowerCase();
          if (lower === "yes" || lower === "unc") { barColor = "bg-emerald-600"; textColor="text-emerald-100"; }
          else if (lower === "no" || lower === "kansas") { barColor = "bg-rose-600"; textColor="text-rose-100"; }
          else {
             const colors = ["bg-blue-500", "bg-purple-500", "bg-orange-500"];
             barColor = colors[idx % colors.length];
          }

          return (
            <div key={idx} className="relative h-5 bg-zinc-900/50 rounded overflow-hidden flex items-center">
               <div 
                 className={`absolute top-0 left-0 h-full ${barColor} opacity-40`} 
                 style={{ width: `${percentage}%` }}
               />
               <div className="absolute inset-0 flex justify-between items-center px-2 z-10">
                  <span className={`text-[10px] font-bold ${textColor}`}>{outcome}</span>
                  <span className="text-[10px] font-mono text-zinc-400">{percentage}%</span>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}