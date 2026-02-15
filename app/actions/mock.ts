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
  entryPrice: number; // The price observed by AI at generation
  currentPrice: number; // Live price (or 1/0 if resolved)
  stake: number; // Calculated mock stake in USD
  status: "OPEN" | "WON" | "LOST";
  pnl: number;
  marketId: string;
  marketEndDate?: string; // <--- NEW FIELD: Essential for daily resolution reports
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
  // 1. Fetch Analysis History (Limit 50 for demo speed)
  const { data: records, error } = await supabaseAdmin
    .from('market_analysis')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !records) return { stats: { totalTrades: 0, winRate: 0, totalPnL: 0, activeVolume: 0 }, positions: [] };

  // 2. Extract all Market IDs to batch fetch current status
  const allMarketIds = new Set<string>();
  (records as AnalysisRecord[]).forEach(r => {
    r.analysis_data.opportunities.forEach(op => {
      if (op.selectedMarketId) allMarketIds.add(op.selectedMarketId);
    });
  });

  // 3. Batch Fetch Market Data from Polymarket
  const marketIdsArray = Array.from(allMarketIds);
  const liveMarketsMap = new Map<string, any>();
  
  // Fetch in chunks of 20 to avoid URL length limits
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
      
      // Determine Mock Stake ($100 * units)
      const stake = (op.betSizeUnits || 1) * 10; 

      // Entry Price (from AI snapshot)
      const entryPrice = op.marketProbability;
      
      // Determine Status & Result
      let status: "OPEN" | "WON" | "LOST" = "OPEN";
      let currentPrice = entryPrice; // Default to entry if unknown
      let pnl = 0;

      if (liveMarket) {
        // Parse current prices
        let outcomeIndex = -1;
        try {
          const outcomes = JSON.parse(liveMarket.outcomes);
          // Simple match (Yes/No). 
          outcomeIndex = outcomes.findIndex((o: string) => o.toLowerCase() === op.selectedOutcome.toLowerCase());
          
          if (outcomeIndex !== -1) {
             const prices = JSON.parse(liveMarket.outcomePrices);
             currentPrice = Number(prices[outcomeIndex]);
          }
        } catch (e) { /* ignore parse errors */ }

        // Check Resolution
        if (liveMarket.closed) {
          // Heuristic: If price is > 0.95, it won. If < 0.05, it lost.
          if (currentPrice > 0.95) status = "WON";
          else status = "LOST";
        }
      }

      // Calculate PnL
      if (status === "WON") {
        // Profit = (Stake / Entry) - Stake
        const shares = stake / entryPrice;
        const payout = shares * 1.00; // Redeems at $1
        pnl = payout - stake;
      } else if (status === "LOST") {
        pnl = -stake;
      } else {
        // Unrealized PnL (Mark to Market)
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
        marketEndDate: liveMarket ? liveMarket.endDate : undefined // <--- POPULATED HERE
      });
    });
  });

  // 5. Aggregate Stats
  const finishedTrades = positions.filter(p => p.status !== "OPEN");
  const wins = finishedTrades.filter(p => p.status === "WON").length;
  const totalPnL = positions.reduce((acc, curr) => acc + curr.pnl, 0);

  return {
    stats: {
      totalTrades: positions.length,
      winRate: finishedTrades.length > 0 ? (wins / finishedTrades.length) * 100 : 0,
      totalPnL,
      activeVolume: positions.filter(p => p.status === "OPEN").reduce((acc, c) => acc + c.stake, 0)
    },
    positions
  };
}