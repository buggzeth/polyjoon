// app/actions/mock.ts
"use server";

import { supabaseAdmin } from "../lib/supabase";
import { AnalysisRecord } from "./storage";

const MARKETS_API = "https://gamma-api.polymarket.com/markets";

export interface MockPosition {
  recordId: string;
  createdAt: string;
  headline: string;
  marketQuestion: string;
  recommendation: "BUY" | "SELL";
  outcome: string;
  entryPrice: number;
  currentPrice: number;
  stake: number;
  status: "OPEN" | "WON" | "LOST";
  pnl: number;
  marketId: string;
  marketEndDate?: string;
}

export interface MockDashboardData {
  stats: {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    activeVolume: number;
  };
  positions: MockPosition[];
}

export async function getMockDashboardData(): Promise<MockDashboardData> {
  // 1. Fetch ALL Analysis History.
  const { data: records, error } = await supabaseAdmin
    .from('market_analysis')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !records) return { stats: { totalTrades: 0, winRate: 0, totalPnL: 0, activeVolume: 0 }, positions: [] };

  // 2. Extract all Market IDs
  const allMarketIds = new Set<string>();
  (records as AnalysisRecord[]).forEach(r => {
    r.analysis_data.opportunities.forEach(op => {
      if (op.selectedMarketId) allMarketIds.add(op.selectedMarketId);
    });
  });

  // 3. Batch Fetch Market Data
  const marketIdsArray = Array.from(allMarketIds);
  const liveMarketsMap = new Map<string, any>();
  
  for (let i = 0; i < marketIdsArray.length; i += 20) {
    const chunk = marketIdsArray.slice(i, i + 20);
    try {
      const res = await fetch(`${MARKETS_API}?id=${chunk.join('&id=')}`, { cache: 'no-store' });
      const marketData = await res.json();
      marketData.forEach((m: any) => liveMarketsMap.set(m.id, m));
    } catch (e) {
      console.error("Error fetching live market data", e);
    }
  }

  // 4. Construct Mock Positions
  const positions: MockPosition[] = [];

  (records as AnalysisRecord[]).forEach((record) => {
    record.analysis_data.opportunities.forEach((op) => {
      const liveMarket = liveMarketsMap.get(op.selectedMarketId);
      
      const stake = (op.betSizeUnits || 1) * 10; 

      // Normalize Entry Price
      let rawEntry = Number(op.marketProbability);
      const entryPrice = rawEntry > 1 ? rawEntry / 100 : rawEntry;
      
      let status: "OPEN" | "WON" | "LOST" = "OPEN";
      let currentPrice = entryPrice; 
      let pnl = 0;

      if (liveMarket) {
        let outcomeIndex = -1;
        try {
          const outcomes = JSON.parse(liveMarket.outcomes);
          outcomeIndex = outcomes.findIndex((o: string) => o.toLowerCase() === op.selectedOutcome.toLowerCase());
          
          if (outcomeIndex !== -1) {
             const prices = JSON.parse(liveMarket.outcomePrices);
             currentPrice = Number(prices[outcomeIndex]);
          }
        } catch (e) { /* ignore */ }

        if (liveMarket.closed) {
          if (currentPrice > 0.95) status = "WON";
          else status = "LOST";
        }
      }

      // Calculate PnL
      if (status === "WON") {
        const shares = stake / entryPrice;
        const payout = shares * 1.00; 
        pnl = payout - stake;
      } else if (status === "LOST") {
        pnl = -stake;
      } else {
        // For OPEN positions, we still calculate unrealized PnL for the list view,
        // but we will exclude this from the dashboard total below.
        const shares = stake / entryPrice;
        const currentValue = shares * currentPrice;
        pnl = currentValue - stake;
      }

      positions.push({
        recordId: record.id,
        createdAt: record.created_at,
        headline: op.headline,
        marketQuestion: op.marketQuestion,
        recommendation: op.recommendation,
        outcome: op.selectedOutcome,
        entryPrice,
        currentPrice,
        stake,
        status,
        pnl,
        marketId: op.selectedMarketId,
        marketEndDate: liveMarket ? liveMarket.endDate : undefined
      });
    });
  });

  const finishedTrades = positions.filter(p => p.status !== "OPEN");
  const wins = finishedTrades.filter(p => p.status === "WON").length;
  
  // --- UPDATED LOGIC: Only sum PnL from finished trades ---
  const realizedPnL = finishedTrades.reduce((acc, curr) => acc + curr.pnl, 0);

  return {
    stats: {
      totalTrades: positions.length,
      winRate: finishedTrades.length > 0 ? (wins / finishedTrades.length) * 100 : 0,
      totalPnL: realizedPnL, // This is now strictly Realized PnL
      activeVolume: positions.filter(p => p.status === "OPEN").reduce((acc, c) => acc + c.stake, 0)
    },
    positions
  };
}