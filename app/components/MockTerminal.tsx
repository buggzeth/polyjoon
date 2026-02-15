// app/components/MockTerminal.tsx
"use client";

import { useState, useMemo } from "react";
import { MockDashboardData, MockPosition } from "../actions/mock";

interface MockTerminalProps {
  data: MockDashboardData;
}

const ITEMS_PER_PAGE = 10; // Number of executions to show per page/load

export default function MockTerminal({ data }: MockTerminalProps) {
  const { stats, positions } = data;
  const [page, setPage] = useState(1);

  // Group all positions by the analysis execution (recordId)
  // useMemo ensures this expensive computation only runs when positions data changes
  const allGroupedExecutions = useMemo(() => {
    return Object.values(positions.reduce((acc, pos) => {
      if (!acc[pos.recordId]) {
        acc[pos.recordId] = {
          id: pos.recordId,
          date: pos.createdAt,
          items: []
        };
      }
      acc[pos.recordId].items.push(pos);
      return acc;
    }, {} as Record<string, { id: string, date: string, items: MockPosition[] }>))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [positions]);

  // Derive the visible list based on the current page
  const visibleExecutions = useMemo(() => {
    return allGroupedExecutions.slice(0, page * ITEMS_PER_PAGE);
  }, [allGroupedExecutions, page]);

  const hasMore = visibleExecutions.length < allGroupedExecutions.length;
  const loadMore = () => setPage(p => p + 1);

  return (
    <div className="w-full space-y-6">
      
      {/* 1. HUD / Heads Up Display */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Bets Logged" value={stats.totalTrades.toString()} />
        <StatCard 
            label="Win Rate" 
            value={`${stats.winRate.toFixed(1)}%`} 
            color={stats.winRate > 50 ? "text-lime-400" : "text-orange-400"} 
        />
        <StatCard 
            label="Total PnL (USD)" 
            value={`${stats.totalPnL > 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)}`} 
            color={stats.totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"}
            subtext="Realized + Unrealized"
        />
        <StatCard 
            label="Active Exposure" 
            value={`$${stats.activeVolume.toFixed(2)}`} 
            color="text-blue-400" 
        />
      </div>

      {/* 2. Feed Header */}
      <div className="flex items-center gap-2 border-b border-orange-900/30 pb-2 mb-4">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        <h2 className="text-xs font-mono font-bold text-orange-500 uppercase tracking-widest">
            Live Agent Execution Feed
        </h2>
      </div>

      {/* 3. The List */}
      <div className="space-y-4">
        {visibleExecutions.map((group) => (
            <ExecutionItem key={group.id} group={group} />
        ))}
        {allGroupedExecutions.length === 0 && (
            <div className="text-center py-20 text-zinc-600 font-mono">
                NO AGENT ACTIVITY DETECTED.
            </div>
        )}
      </div>

      {/* 4. Load More Button */}
      {hasMore && (
        <div className="text-center mt-8">
            <button
                onClick={loadMore}
                className="font-mono text-xs uppercase bg-zinc-900 border border-zinc-700 text-zinc-400 px-6 py-2 rounded-sm hover:bg-zinc-800 hover:border-orange-500 hover:text-orange-500 transition-all"
            >
                Load More Executions
            </button>
        </div>
      )}

    </div>
  );
}

// --- Sub-Components ---

function StatCard({ label, value, color = "text-slate-200", subtext }: any) {
    return (
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm shadow-lg backdrop-blur-sm">
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{label}</div>
            <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
            {subtext && <div className="text-[10px] text-zinc-600 mt-1">{subtext}</div>}
        </div>
    );
}

function ExecutionItem({ group }: { group: { id: string, date: string, items: MockPosition[] } }) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Calculate Group Stats
    const totalInvested = group.items.reduce((sum, i) => sum + i.stake, 0);
    const groupPnL = group.items.reduce((sum, i) => sum + i.pnl, 0);
    const timeAgo = new Date(group.date).toLocaleString();

    return (
        <div className="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden transition-all hover:border-zinc-700">
            {/* Header / Summary Bar */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer hover:bg-zinc-900/50 transition-colors gap-4"
            >
                <div className="flex items-center gap-4">
                    <div className={`text-xs font-mono px-2 py-1 rounded border ${isOpen ? 'bg-orange-900/20 border-orange-500 text-orange-500' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                        {isOpen ? '[-]' : '[+]'}
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 font-mono mb-0.5">
                            EXECUTION ID: {group.id.slice(0, 8)}... • {timeAgo}
                        </div>
                        <div className="text-sm font-bold text-slate-200">
                             🤖 Executed {group.items.length} Order{group.items.length !== 1 && 's'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                    <div>
                        <div className="text-[10px] text-zinc-500 uppercase">Deployed</div>
                        <div className="text-sm font-mono text-slate-300">${totalInvested.toFixed(2)}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-zinc-500 uppercase">Net PnL</div>
                        <div className={`text-sm font-mono font-bold ${groupPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {groupPnL > 0 ? '+' : ''}{groupPnL.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dropdown Content */}
            {isOpen && (
                <div className="bg-zinc-900/30 border-t border-zinc-800 divide-y divide-zinc-800/50">
                    {group.items.map((pos, idx) => (
                        <div key={idx} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 text-sm hover:bg-zinc-900/50">
                            
                            {/* 1. Market Context */}
                            <div className="md:col-span-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge status={pos.status} />
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pos.recommendation === 'BUY' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`}>
                                        {pos.recommendation} {pos.outcome}
                                    </span>
                                </div>
                                <div className="text-zinc-300 font-medium leading-tight mb-1">
                                    {pos.headline}
                                </div>
                                <div className="text-xs text-zinc-500 font-mono line-clamp-1">
                                    {pos.marketQuestion}
                                </div>
                            </div>

                            {/* 2. Entry Details */}
                            <div className="md:col-span-3 flex flex-col justify-center font-mono text-xs">
                                <div className="flex justify-between text-zinc-400 mb-1">
                                    <span>Entry Price:</span>
                                    <span className="text-slate-200">{pos.entryPrice.toFixed(3)}¢</span>
                                </div>
                                <div className="flex justify-between text-zinc-400">
                                    <span>Size:</span>
                                    <span className="text-slate-200">${pos.stake.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* 3. Result Details */}
                            <div className="md:col-span-4 flex flex-col justify-center font-mono text-xs border-l border-zinc-800 md:pl-4">
                                <div className="flex justify-between text-zinc-400 mb-1">
                                    <span>Current Price:</span>
                                    <span className={`${pos.status === 'WON' ? 'text-lime-400' : 'text-zinc-300'}`}>
                                        {pos.currentPrice.toFixed(3)}¢
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">Return:</span>
                                    <span className={`text-sm font-bold ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {pos.pnl > 0 ? '+' : ''}{pos.pnl.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Badge({ status }: { status: string }) {
    if (status === "WON") return <span className="bg-lime-500 text-black text-[10px] font-bold px-1.5 rounded">WIN</span>;
    if (status === "LOST") return <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 rounded">LOSS</span>;
    return <span className="bg-blue-600/20 text-blue-400 border border-blue-500/50 text-[10px] font-bold px-1.5 rounded">OPEN</span>;
}