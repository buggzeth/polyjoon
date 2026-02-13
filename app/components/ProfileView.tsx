// app/components/ProfileView.tsx
"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getUserData } from "../actions/profile";
import { getMarketMetadata } from "../actions/markets";
import { Position, Activity, ClosedPosition } from "../types/data-api";
import { OpenOrder } from "../types/clob";
import { useTrading } from "../contexts/TradingContext";
import CrabSpinner from "./CrabSpinner";

// Helper type for UI
interface EnrichedOrder extends OpenOrder {
  title?: string;
  icon?: string;
}

export default function ProfileView() {
  const { address, isConnected } = useAccount();
  // Get safeAddress from context to fetch the correct data
  const { clobClient, isReady, initializeSession, safeAddress } = useTrading();
  
  const [loadingData, setLoadingData] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Data State
  const [positions, setPositions] = useState<Position[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [hideDust, setHideDust] = useState(true); 
  const [activeTab, setActiveTab] = useState<"POSITIONS" | "ORDERS" | "ACTIVITY">("POSITIONS");

  // Determine the correct address to fetch data for (Safe > EOA)
  const targetAddress = safeAddress || address;

  // 1. Fetch Public Profile Data
  useEffect(() => {
    if (isConnected && targetAddress) {
      console.log(`[ProfileView] Fetching public data for: ${targetAddress}`);
      fetchPublicData(targetAddress);
    }
  }, [isConnected, targetAddress]);

  // 2. Fetch Private Open Orders (Requires CLOB Session)
  useEffect(() => {
    if (isReady && clobClient) {
      fetchOpenOrders();
    }
  }, [isReady, clobClient, activeTab]);

  const fetchPublicData = async (addr: string) => {
    setLoadingData(true);
    try {
        const data = await getUserData(addr);
        
        if (data) {
            setPositions(data.positions);
            setActivity(data.activity);
            setClosedPositions(data.closedPositions);
            setPortfolioValue(data.portfolioValue);
        }
    } catch (e) {
        console.error("[ProfileView] Error in fetchPublicData:", e);
    } finally {
        setLoadingData(false);
    }
  };

  const fetchOpenOrders = async () => {
    if (!clobClient) return;
    setLoadingOrders(true);
    try {
      const rawOrders = await clobClient.getOpenOrders({});
      
      const enriched = await Promise.all(rawOrders.map(async (order: any) => {
        const meta = await getMarketMetadata(order.market);
        const rawSize = order.size || order.current_size || order.original_size || "0";
        const safeId = order.id || order.orderID || "unknown";

        return {
          ...order,
          id: safeId,
          size: rawSize,
          title: meta?.question || "Unknown Market",
          icon: meta?.icon || "",
          slug: meta?.slug || ""
        };
      }));
      
      setOrders(enriched);
    } catch (e) {
      console.error("[ProfileView] Failed to fetch open orders", e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!clobClient || !orderId) return;
    
    const previousOrders = [...orders];
    setOrders(prev => prev.filter(o => o.id !== orderId));

    try {
      const res = await clobClient.cancelOrder({ orderID: orderId });
      
      if (res && res.not_canceled && Object.keys(res.not_canceled).length > 0) {
        alert("Could not cancel order.");
        setOrders(previousOrders);
      }
    } catch (e) {
      console.error("[ProfileView] Cancel failed", e);
      alert("Error cancelling order");
      setOrders(previousOrders);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
        <div className="text-xl font-bold mb-2">Wallet Not Connected</div>
        <p>Please connect your wallet in the top right to view your profile.</p>
      </div>
    );
  }

  // Calculate stats based on ALL positions (including 0 value ones) so PnL is accurate
  const totalPnl = positions.reduce((acc, p) => acc + p.cashPnl, 0);
  const isPositive = totalPnl >= 0;

  // Filter for UI: Only show positions with value > 0 (filters out lost bets/dust)
  const visiblePositions = hideDust 
  ? positions.filter((p) => (p.currentValue || 0) > 0.001) 
  : positions;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-orange-900/20 p-6 rounded-sm">
          <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Portfolio Value</div>
          <div className="text-3xl font-mono font-bold text-white">
            ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-zinc-900 border border-orange-900/20 p-6 rounded-sm">
           <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Open Positions PnL</div>
           <div className={`text-3xl font-mono font-bold ${isPositive ? 'text-lime-400' : 'text-rose-400'}`}>
             {isPositive ? '+' : ''}{totalPnl.toFixed(2)} <span className="text-sm text-slate-500">USD</span>
           </div>
        </div>

        <div className="bg-zinc-900 border border-orange-900/20 p-6 rounded-sm flex items-center justify-between">
            <div>
                <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Open Orders</div>
                <div className="text-3xl font-mono font-bold text-orange-400">
                    {isReady ? orders.length : "-"}
                </div>
            </div>
             {!isReady && (
                <button 
                  onClick={initializeSession}
                  className="text-xs bg-orange-600 hover:bg-indigo-500 text-white px-3 py-2 rounded font-bold"
                >
                  Enable Trading
                </button>
             )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-orange-900/20 mb-6 overflow-x-auto">
        {(["POSITIONS", "ORDERS", "ACTIVITY"] as const).map((tab) => (
            <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab 
                ? "border-indigo-500 text-white" 
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
            >
            {tab === "POSITIONS" && "Open Positions"}
            {tab === "ORDERS" && "Active Orders"}
            {tab === "ACTIVITY" && "Recent Activity"}
            </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === "POSITIONS" && (
            <div className="space-y-4">
                {/* NEW: Toggle Switch */}
                {!loadingData && positions.length > 0 && (
                    <div className="flex justify-end">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer select-none hover:text-orange-400 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={hideDust}
                                onChange={(e) => setHideDust(e.target.checked)}
                                className="w-4 h-4 rounded border-orange-900/40 bg-zinc-900 text-orange-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                            HIDE DUST / LOST BETS
                        </label>
                    </div>
                )}
                <PositionsTable positions={visiblePositions} loading={loadingData} />
            </div>
        )}
        
        {activeTab === "ORDERS" && (
            <OrdersTable 
                orders={orders} 
                loading={loadingOrders} 
                isReady={isReady} 
                onCancel={handleCancelOrder} 
                onConnect={initializeSession}
            />
        )}
        
        {activeTab === "ACTIVITY" && (
            <div className="space-y-8">
                <ActivityTable activities={activity} loading={loadingData} />
                <ClosedPositionsTable positions={closedPositions} loading={loadingData} />
            </div>
        )}
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---

function PositionsTable({ positions, loading }: { positions: Position[], loading: boolean }) {
    if (loading) return <div className="py-12"><CrabSpinner text="DIGGING UP POSITIONS..." /></div>;
    if (!positions || positions.length === 0) return <div className="text-slate-500 text-center py-10">No active positions found.</div>;

    return (
        <div className="overflow-x-auto bg-zinc-900/50 rounded-sm border border-orange-900/20">
            <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                    <tr className="text-xs text-slate-500 border-b border-orange-900/20 uppercase tracking-wider">
                        <th className="p-4 font-medium">Market</th>
                        <th className="p-4 font-medium">Outcome</th>
                        <th className="p-4 font-medium text-right">Shares</th>
                        <th className="p-4 font-medium text-right">Avg Price</th>
                        <th className="p-4 font-medium text-right">P&L</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {positions.map((pos) => {
                        const pnlColor = pos.cashPnl >= 0 ? "text-lime-400" : "text-rose-400";
                        return (
                            <tr key={pos.conditionId + pos.asset} className="border-b border-orange-900/20/50 hover:bg-orange-900/20/30">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <img src={pos.icon} alt="" className="w-8 h-8 rounded bg-orange-900/20" />
                                        <div className="max-w-[200px] truncate text-slate-200 font-medium">{pos.title}</div>
                                    </div>
                                </td>
                                <td className="p-4"><Badge label={pos.outcome} /></td>
                                <td className="p-4 text-right font-mono text-slate-300">{pos.size.toFixed(1)}</td>
                                <td className="p-4 text-right font-mono text-zinc-400">{(pos.avgPrice * 100).toFixed(1)}¢</td>
                                <td className={`p-4 text-right font-mono font-bold ${pnlColor}`}>
                                    {pos.cashPnl >= 0 ? '+' : ''}{pos.cashPnl.toFixed(2)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function OrdersTable({ 
    orders, loading, isReady, onCancel, onConnect 
}: { 
    orders: EnrichedOrder[], 
    loading: boolean, 
    isReady: boolean, 
    onCancel: (id: string) => void,
    onConnect: () => void
}) {
    if (!isReady) {
        return (
            <div className="text-center py-16 bg-zinc-900/50 rounded-sm border border-dashed border-orange-900/20">
                <div className="text-zinc-400 mb-4">You must enable trading to view open orders.</div>
                <button onClick={onConnect} className="bg-orange-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-bold">
                    Enable Trading
                </button>
            </div>
        );
    }
    
    if (loading) return <div className="py-12"><CrabSpinner text="CHECKING THE BOOKS..." /></div>;
    if (orders.length === 0) return <div className="text-slate-500 text-center py-10">No open orders.</div>;

    return (
        <div className="overflow-x-auto bg-zinc-900/50 rounded-sm border border-orange-900/20">
            <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                    <tr className="text-xs text-slate-500 border-b border-orange-900/20 uppercase tracking-wider">
                        <th className="p-4 font-medium">Market</th>
                        <th className="p-4 font-medium">Side</th>
                        <th className="p-4 font-medium text-right">Size</th>
                        <th className="p-4 font-medium text-right">Limit Price</th>
                        <th className="p-4 font-medium text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {orders.map((order) => {
                        const sizeNum = parseFloat(order.size as string);
                        const priceNum = parseFloat(order.price);

                        return (
                        <tr key={order.id} className="border-b border-orange-900/20/50 hover:bg-orange-900/20/30">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    {order.icon ? (
                                        <img src={order.icon} alt="" className="w-8 h-8 rounded bg-orange-900/20" />
                                    ) : (
                                        <div className="w-8 h-8 rounded bg-orange-900/20 flex items-center justify-center text-xs">?</div>
                                    )}
                                    <div className="max-w-[200px] truncate text-slate-200 font-medium" title={order.title}>
                                        {order.title}
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <span className={`font-bold ${order.side === 'BUY' ? 'text-lime-400' : 'text-rose-400'}`}>
                                    {order.side}
                                </span>
                            </td>
                            <td className="p-4 text-right font-mono text-slate-300">
                                {isNaN(sizeNum) ? "0.00" : sizeNum.toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-mono text-slate-200">
                                {isNaN(priceNum) ? "0.00" : (priceNum * 100).toFixed(1)}¢
                            </td>
                            <td className="p-4 text-right">
                                <button 
                                    onClick={() => onCancel(order.id as string)}
                                    className="text-xs bg-rose-950/50 hover:bg-rose-900 text-rose-400 border border-rose-900 px-3 py-1.5 rounded transition-colors"
                                >
                                    Cancel
                                </button>
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>
    );
}

function ActivityTable({ activities, loading }: { activities: Activity[], loading: boolean }) {
    if (loading) return <div className="py-12"><CrabSpinner text="TRACING HISTORY..." /></div>;
    
    // Don't show "No recent activity" if there are closed positions rendering below.
    // Instead return empty div or null. 
    // We will let the user see the Closed Positions section if this is empty.
    if (!activities || activities.length === 0) {
        return <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-4">On-Chain Activity: None</div>;
    }

    return (
        <div>
            <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-4">Recent Transactions</div>
            <div className="space-y-2">
                {activities.map((act, i) => (
                    <div key={i} className="flex items-center justify-between bg-zinc-900/50 border border-orange-900/20 p-4 rounded-sm">
                        <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                act.side === 'BUY' ? 'bg-lime-900/20 text-lime-400' : 'bg-rose-900/20 text-rose-400'
                            }`}>
                                {act.side === 'BUY' ? 'B' : 'S'}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-200">{act.side} {act.outcome}</div>
                                <div className="text-xs text-slate-500 truncate max-w-[200px]">{act.title}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-mono font-bold text-slate-200">
                                {act.size.toFixed(0)} @ {(act.price * 100).toFixed(1)}¢
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                                {new Date(act.timestamp * 1000).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ClosedPositionsTable({ positions, loading }: { positions: ClosedPosition[], loading: boolean }) {
    if (loading) return null;
    if (!positions || positions.length === 0) return <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-4">Closed Positions: None</div>;

    return (
        <div>
            <div className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-4 pt-4 border-t border-orange-900/20">History: Closed Positions</div>
            <div className="overflow-x-auto bg-zinc-900/50 rounded-sm border border-orange-900/20">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="text-xs text-slate-500 border-b border-orange-900/20 uppercase tracking-wider">
                            <th className="p-4 font-medium">Market</th>
                            <th className="p-4 font-medium">Outcome</th>
                            <th className="p-4 font-medium text-right">Total Bought</th>
                            <th className="p-4 font-medium text-right">Avg Price</th>
                            <th className="p-4 font-medium text-right">Realized PnL</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {positions.map((pos, idx) => {
                            const pnlColor = pos.realizedPnl >= 0 ? "text-lime-400" : "text-rose-400";
                            return (
                                <tr key={idx} className="border-b border-orange-900/20/50 hover:bg-orange-900/20/30">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <img src={pos.icon} alt="" className="w-8 h-8 rounded bg-orange-900/20" />
                                            <div className="max-w-[200px] truncate text-slate-200 font-medium">{pos.title}</div>
                                        </div>
                                    </td>
                                    <td className="p-4"><Badge label={pos.outcome} /></td>
                                    <td className="p-4 text-right font-mono text-slate-300">{pos.totalBought.toFixed(1)}</td>
                                    <td className="p-4 text-right font-mono text-zinc-400">{(pos.avgPrice * 100).toFixed(1)}¢</td>
                                    <td className={`p-4 text-right font-mono font-bold ${pnlColor}`}>
                                        {pos.realizedPnl >= 0 ? '+' : ''}{pos.realizedPnl.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Badge({ label }: { label: string }) {
    const isYes = label === 'Yes';
    const isNo = label === 'No';
    return (
        <span className={`px-2 py-1 rounded text-xs font-bold ${
            isYes ? 'bg-emerald-950/50 text-lime-400 border border-lime-900' :
            isNo ? 'bg-rose-950/50 text-rose-400 border border-rose-900' :
            'bg-orange-900/20 text-slate-300'
        }`}>
            {label}
        </span>
    );
}