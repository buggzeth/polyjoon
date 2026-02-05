// app/components/OrderBookWidget.tsx
"use client";

import { OrderBook } from "../types/clob";

interface OrderBookWidgetProps {
  book?: OrderBook;
  spread?: string;
  side: "BUY" | "SELL";
}

export default function OrderBookWidget({ book, spread, side }: OrderBookWidgetProps) {
  if (!book) {
    return (
      <div className="h-32 flex items-center justify-center bg-zinc-950/50 rounded-sm border border-orange-900/20 text-slate-600 text-xs">
        Loading Order Book...
      </div>
    );
  }

  // Helper to safely format numbers
  const fmt = (val: string) => Number(val).toFixed(2);
  const fmtPrice = (val: string) => (Number(val) * 100).toFixed(1) + "¢";

  // 1. Sort Bids DESCENDING (Highest price first)
  // 2. Sort Asks ASCENDING (Lowest price first)
  const bids = [...book.bids].sort((a, b) => Number(b.price) - Number(a.price));
  const asks = [...book.asks].sort((a, b) => Number(a.price) - Number(b.price));

  return (
    <div className="bg-zinc-950 rounded-sm border border-orange-900/20 overflow-hidden font-mono text-xs">
      
      {/* Header Stats */}
      <div className="flex justify-between items-center px-3 py-2 bg-zinc-900 border-b border-orange-900/20">
        <div className="flex gap-3">
            <span className="text-zinc-400">Spread: <span className="text-slate-200">{spread ? (Number(spread)*100).toFixed(1) : "-"}¢</span></span>
        </div>
        <div className="text-[10px] text-slate-500">Live CLOB</div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-orange-900/20">
        
        {/* BIDS (Buy Orders) */}
        <div className="flex flex-col">
            <div className="px-2 py-1 text-[10px] text-emerald-500 font-bold bg-emerald-950/10 text-center border-b border-orange-900/20">
                BIDS (Best Buy)
            </div>
            <div className="flex justify-between px-2 py-1 text-[10px] text-slate-500 border-b border-orange-900/20/50">
                <span>Size</span>
                <span>Price</span>
            </div>
            
            {/* Scrollable Container with Custom Scrollbar */}
            <div className="h-[72px] overflow-y-auto custom-scrollbar">
                {bids.length === 0 && <div className="text-center py-2 text-slate-600">Empty</div>}
                {bids.map((b, i) => (
                    <div key={i} className="flex justify-between px-2 py-1 hover:bg-zinc-900">
                        <span className="text-zinc-400">{fmt(b.size)}</span>
                        <span className="text-lime-400 font-bold">{fmtPrice(b.price)}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* ASKS (Sell Orders) */}
        <div className="flex flex-col">
            <div className="px-2 py-1 text-[10px] text-rose-500 font-bold bg-rose-950/10 text-center border-b border-orange-900/20">
                ASKS (Best Sell)
            </div>
            <div className="flex justify-between px-2 py-1 text-[10px] text-slate-500 border-b border-orange-900/20/50">
                <span>Price</span>
                <span>Size</span>
            </div>

            {/* Scrollable Container with Custom Scrollbar */}
            <div className="h-[72px] overflow-y-auto custom-scrollbar">
                {asks.length === 0 && <div className="text-center py-2 text-slate-600">Empty</div>}
                {asks.map((a, i) => (
                    <div key={i} className="flex justify-between px-2 py-1 hover:bg-zinc-900">
                        <span className="text-rose-400 font-bold">{fmtPrice(a.price)}</span>
                        <span className="text-zinc-400">{fmt(a.size)}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
      
      {/* Contextual Footer */}
      <div className="px-3 py-2 bg-zinc-900/50 border-t border-orange-900/20 text-[10px] text-center text-slate-500">
        {side === "BUY" ? (
             <span>To BUY, you take from <span className="text-rose-400 font-bold">ASKS</span></span>
        ) : (
             <span>To SELL, you hit <span className="text-lime-400 font-bold">BIDS</span></span>
        )}
      </div>
    </div>
  );
}