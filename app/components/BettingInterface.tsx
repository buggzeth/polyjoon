// app/components/BettingInterface.tsx
"use client";

import { useState, useEffect } from "react";
import { useTrading } from "../contexts/TradingContext";
import { Side } from "@polymarket/clob-client";

interface BettingInterfaceProps {
  marketId: string;
  recommendedOutcome: string;
  recommendedPrice: number;
}

export default function BettingInterface({ marketId, recommendedOutcome, recommendedPrice }: BettingInterfaceProps) {
  const { clobClient, isReady } = useTrading();
  
  // State
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [mode, setMode] = useState<"BUY" | "SELL">("BUY");
  
  const [price, setPrice] = useState(recommendedPrice.toString());
  const [shares, setShares] = useState("10"); 
  
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [status, setStatus] = useState<"IDLE" | "TRADING" | "SUCCESS" | "ERROR">("IDLE");
  const [msg, setMsg] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Resolve Token ID on Mount
  // We need this ID to fetch live prices for the "Market" tab
  useEffect(() => {
    let mounted = true;
    const resolveToken = async () => {
      try {
        const tokenRes = await fetch(`/api/resolve-token?marketId=${marketId}&outcome=${recommendedOutcome}`);
        const data = await tokenRes.json();
        if (mounted && data.tokenId) {
          setTokenId(data.tokenId);
          // Optional: Auto-fetch price once token is resolved if in market mode
          if (orderType === "MARKET") fetchLivePrice(data.tokenId, mode);
        }
      } catch (e) {
        console.error("Token resolution failed", e);
      }
    };
    resolveToken();
    return () => { mounted = false; };
  }, [marketId, recommendedOutcome]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Helper to fetch best Bid/Ask from CLOB
  const fetchLivePrice = async (tid: string, side: "BUY" | "SELL") => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`https://clob.polymarket.com/book?token_id=${tid}`);
      if (!res.ok) throw new Error("Failed to fetch book");
      
      const book = await res.json();
      let bestPrice = "0";

      if (side === "BUY") {
        // Buying? We take from ASKS.
        // Sort Ascending (Lowest Price First) -> We want the cheapest seller.
        const sortedAsks = [...(book.asks || [])].sort((a: any, b: any) => Number(a.price) - Number(b.price));
        
        if (sortedAsks.length > 0) {
          bestPrice = sortedAsks[0].price;
        }
      } else {
        // Selling? We hit the BIDS.
        // Sort Descending (Highest Price First) -> We want the highest bidder.
        const sortedBids = [...(book.bids || [])].sort((a: any, b: any) => Number(b.price) - Number(a.price));
        
        if (sortedBids.length > 0) {
          bestPrice = sortedBids[0].price;
        }
      }

      if (Number(bestPrice) > 0) {
        setPrice(bestPrice);
      } else {
        setMsg("No liquidity found for market order");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Trigger refresh when clicking the button
  const handleRefreshClick = () => {
    if (tokenId) fetchLivePrice(tokenId, mode);
  };

  // Re-fetch price if user switches Buy/Sell mode while in Market tab
  useEffect(() => {
    if (tokenId && orderType === "MARKET") {
      fetchLivePrice(tokenId, mode);
    }
  }, [mode, orderType]); // eslint-disable-line react-hooks/exhaustive-deps


  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clobClient || !isReady) {
      setMsg("Please connect wallet & enable trading (top right).");
      setStatus("ERROR");
      return;
    }

    if (!tokenId) {
      setMsg("Loading market data...");
      return;
    }

    setStatus("TRADING");
    setMsg("");

    try {
      // Execute Trade
      const res = await clobClient.createAndPostOrder({
        tokenID: tokenId,
        price: Number(price),
        size: Number(shares),
        side: mode === "BUY" ? Side.BUY : Side.SELL,
      });

      if (res.success) {
        setStatus("SUCCESS");
        setMsg(`Order Placed! ID: ${res.orderId?.slice(0,8)}...`);
      } else {
        setStatus("ERROR");
        setMsg(res.errorMsg || "Order Failed");
      }
    } catch (err: any) {
      console.error(err);
      setStatus("ERROR");
      setMsg(err.message || "Trade failed");
    }
  };

  if (status === "SUCCESS") {
    return (
      <div className="bg-lime-900/30 border border-emerald-500/50 rounded-sm p-4 text-center animate-in fade-in zoom-in">
        <div className="text-lime-400 font-bold mb-2">✅ Trade Executed</div>
        <div className="text-xs text-zinc-400 font-mono mb-3">{msg}</div>
        <button onClick={() => setStatus("IDLE")} className="text-xs underline text-zinc-400 hover:text-white">Place another trade</button>
      </div>
    );
  }

  const estCost = (Number(price) * Number(shares)).toFixed(2);

  return (
    <form onSubmit={handleTrade} className="bg-zinc-950 rounded-sm p-4 border border-orange-900/20 mt-4">
      
      {/* 1. Buy / Sell Toggle */}
      <div className="flex gap-2 mb-4 bg-zinc-900 p-1 rounded-sm">
        {["BUY", "SELL"].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m as any)}
            className={`flex-1 py-1 text-xs font-bold rounded transition-colors ${
              mode === m 
                ? (m === "BUY" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white") 
                : "text-slate-500 hover:bg-orange-900/20"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* 2. Order Type Tabs */}
      <div className="flex border-b border-orange-900/20 mb-4">
        {["MARKET", "LIMIT"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setOrderType(t as any)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              orderType === t 
                ? "border-indigo-500 text-white" 
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* Info Row */}
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Outcome</span>
          <span className="font-bold text-orange-400">{recommendedOutcome}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          
          {/* Price Input with Logic */}
          <div className="relative">
            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">
              Price ($)
            </label>
            
            <div className="relative">
              <input 
                type="number" step="0.01" max="1" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
                className={`w-full bg-zinc-900 border rounded p-2 text-sm font-mono text-white focus:border-indigo-500 outline-none
                  ${orderType === "MARKET" ? "border-indigo-500/50 pr-8" : "border-slate-700"}
                `}
              />
              
              {/* Refresh Button (Only for Market Tab) */}
              {orderType === "MARKET" && (
                <button
                  type="button"
                  onClick={handleRefreshClick}
                  disabled={isRefreshing || !tokenId}
                  title="Fetch Best Market Price"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`${isRefreshing ? "animate-spin" : ""}`}
                  >
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M8 16H3v5" />
                  </svg>
                </button>
              )}
            </div>
            
            {orderType === "MARKET" && (
               <div className="text-[9px] text-slate-500 mt-1">
                 Filling at {mode === "BUY" ? "Best Ask" : "Best Bid"}
               </div>
            )}
          </div>

          {/* Shares Input */}
          <div>
            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Shares</label>
            <input 
              type="number" step="1" min="1" value={shares} onChange={(e) => setShares(e.target.value)}
              className="w-full bg-zinc-900 border border-slate-700 rounded p-2 text-sm font-mono text-white focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Footer Summary */}
        <div className="flex justify-between items-center pt-2 border-t border-orange-900/20">
            <span className="text-xs text-zinc-400">Est. Total</span>
            <span className="text-sm font-mono font-bold text-white">${estCost}</span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === "TRADING" || !isReady || !tokenId}
          className={`w-full py-2 rounded font-bold text-xs uppercase tracking-wider transition-all
            ${status === "TRADING" 
              ? "bg-slate-700 text-zinc-400 cursor-wait" 
              : !isReady || !tokenId
                ? "bg-orange-900/20 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-600 text-white shadow-lg shadow-indigo-900/20"
            }
          `}
        >
          {!isReady 
            ? "Connect & Enable Trading" 
            : !tokenId 
              ? "Loading Market..." 
              : status === "TRADING" 
                ? "Placing Order..." 
                : `Place ${mode} Order`
          }
        </button>

        {status === "ERROR" && (
          <div className="text-[10px] text-rose-400 text-center bg-rose-900/20 p-2 rounded border border-rose-900/50">
            Error: {msg}
          </div>
        )}
      </div>
    </form>
  );
}