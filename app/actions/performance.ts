// app/actions/performance.ts
"use server";

import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "../lib/supabase";
import { getMockDashboardData } from "./mock";
import { SavedReport, PerformanceReportData, PeriodStats } from "../types/performance";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

// 24 Hour Cooldown
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function getLatestReport(): Promise<{ report: SavedReport | null; canGenerate: boolean; nextGenTime?: number }> {
  const { data, error } = await supabaseAdmin
    .from('agent_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return { report: null, canGenerate: true };
  }

  const lastRun = new Date(data.created_at).getTime();
  const now = Date.now();
  const timeSince = now - lastRun;

  if (timeSince < COOLDOWN_MS) {
    return { 
      report: data as SavedReport, 
      canGenerate: false,
      nextGenTime: lastRun + COOLDOWN_MS
    };
  }

  return { report: data as SavedReport, canGenerate: true };
}

export async function generateDailyReport(): Promise<SavedReport | null> {
  // 1. Check Cooldown
  const status = await getLatestReport();
  if (!status.canGenerate) return status.report;

  // 2. Fetch Data
  const dashboardData = await getMockDashboardData();
  const allPositions = dashboardData.positions;

  if (!allPositions || allPositions.length === 0) return null;

  // 3. Calculate "Lifetime" Context (Cheap Math)
  const totalTrades = allPositions.length;
  const lifetimePnL = allPositions.reduce((acc, p) => acc + p.pnl, 0);
  const wins = allPositions.filter(p => p.status === "WON").length;
  const losses = allPositions.filter(p => p.status === "LOST").length;
  const resolvedCount = wins + losses;
  const lifetimeWinRate = resolvedCount > 0 ? ((wins / resolvedCount) * 100).toFixed(1) : "0.0";

  // 4. Filter for "Daily Resolution" Context
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  // A. Get strict 24h settlements
  const tradesSettled24h = allPositions.filter(p => {
    if (!p.marketEndDate) return false;
    const end = new Date(p.marketEndDate).getTime();
    return end > oneDayAgo && end <= now;
  });

  let recentTrades = [...tradesSettled24h];
  let timeContextLabel = "Settled in Last 24 Hours";

  // B. Backfill if fewer than 10 trades
  if (recentTrades.length < 10) {
    const needed = 10 - recentTrades.length;

    // Find older resolved trades (WON/LOST) that fall outside the 24h window
    const olderTrades = allPositions.filter(p => {
      if (p.status !== "WON" && p.status !== "LOST") return false;
      
      // If it has an end date, ensure it's older than 24h ago
      // If it has NO end date but is resolved, include it as a candidate
      if (p.marketEndDate) {
        const end = new Date(p.marketEndDate).getTime();
        return end <= oneDayAgo;
      }
      return true;
    });

    // Sort by End Date descending (newest first), fallback to Created Date
    olderTrades.sort((a, b) => {
      const dateA = a.marketEndDate ? new Date(a.marketEndDate).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.marketEndDate ? new Date(b.marketEndDate).getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    // Append the filler trades
    const filler = olderTrades.slice(0, needed);
    recentTrades = [...recentTrades, ...filler];
    
    timeContextLabel = `Last ${recentTrades.length} Resolved Markets (Including Extended Context)`;
  }

  // --- NEW: Calculate Strict Statistics in Code (No Hallucinations) ---
  // Note: We calculate stats on the final 'recentTrades' array, so the stats match the list shown.
  const batchTotal = recentTrades.length;
  const batchWins = recentTrades.filter(t => t.status === "WON").length;
  const batchLosses = recentTrades.filter(t => t.status === "LOST").length;
  const batchPnL = recentTrades.reduce((acc, t) => acc + t.pnl, 0);
  const batchInvested = recentTrades.reduce((acc, t) => acc + t.stake, 0);
  
  const computedStats: PeriodStats = {
    totalBets: batchTotal,
    won: batchWins,
    lost: batchLosses,
    winRate: batchTotal > 0 ? Number(((batchWins / batchTotal) * 100).toFixed(1)) : 0,
    totalPnL: Number(batchPnL.toFixed(2)),
    roi: batchInvested > 0 ? Number(((batchPnL / batchInvested) * 100).toFixed(1)) : 0
  };

  // 5. Serialize for Prompt
  const tradeContext = recentTrades.map(p => `
    - Market: "${p.headline}"
    - Question: "${p.marketQuestion}"
    - Prediction: ${p.recommendation} ${p.outcome}
    - Entry Price: ${p.entryPrice.toFixed(2)}
    - Result: ${p.status}
    - Net PnL: $${p.pnl.toFixed(2)}
    - Ended: ${p.marketEndDate || "Unknown"}
  `).join("\n");

  // 6. The High-Quality Prompt
  const prompt = `
    ROLE: You are the Chief Risk Officer and Head of Portfolio Management for a high-frequency prediction market hedge fund.
    
    TASK: Analyze the recent SETTLEMENT performance of our autonomous trading agent ("The Crab"). Write a nuanced, investor-facing daily performance report.

    CONTEXT - LIFETIME STATS:
    - Total Trades Logged: ${totalTrades}
    - Lifetime PnL: $${lifetimePnL.toFixed(2)}
    - Lifetime Win Rate: ${lifetimeWinRate}%

    CONTEXT - RECENTLY SETTLED TRADES (${timeContextLabel}):
    - Calculated Batch PnL: $${computedStats.totalPnL}
    - Calculated Batch Win Rate: ${computedStats.winRate}%
    
    Trades List:
    ${tradeContext}
    
    INSTRUCTIONS:
    1. DEEP CATEGORIZATION: Do not use generic categories like "Sports". Be specific: "NBA Player Props", "Tennis Match Winner", "US Senate Races", "Middle East Geopolitics".
    2. ANALYSIS: 
       - Identify why we won these specific bets (e.g., "The agent correctly identified arbitrage in low-liquidity tennis markets").
       - Identify why we lost these specific bets (e.g., "The agent was over-exposed to high-variance political polls that swung late").
       - Compare this batch's performance to the lifetime stats provided above.
    3. TONE: Professional, slightly technical, confident but transparent about losses. 
    4. GRADING: Assign an overall grade (A+ to F) for this specific batch of resolutions based on ROI and accuracy.
    5. OUTPUT: Strict JSON format matching the schema provided.
  `;

  // 7. Schema
  // Note: We do NOT ask the AI to generate the 'stats' object. We inject the computedStats manually.
  const reportSchema = {
    type: "object",
    properties: {
      periodStart: { type: "string" },
      periodEnd: { type: "string" },
      overallGrade: { type: "string", enum: ["A+", "A", "B", "C", "D", "F"] },
      executiveSummary: { type: "string" },
      topPerformingCategories: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string" },
            totalBets: { type: "number" },
            winRate: { type: "number" },
            pnl: { type: "number" },
            sentiment: { type: "string", enum: ["BULLISH", "BEARISH", "NEUTRAL"] }
          },
          required: ["category", "totalBets", "winRate", "pnl", "sentiment"]
        }
      },
      worstPerformingCategories: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string" },
            totalBets: { type: "number" },
            winRate: { type: "number" },
            pnl: { type: "number" },
            sentiment: { type: "string", enum: ["BULLISH", "BEARISH", "NEUTRAL"] }
          },
          required: ["category", "totalBets", "winRate", "pnl", "sentiment"]
        }
      },
      keyWins: { type: "array", items: { type: "string" } },
      keyLosses: { type: "array", items: { type: "string" } },
      strategicAdjustments: { type: "string" }
    },
    required: [
      "overallGrade", "executiveSummary", "topPerformingCategories", 
      "worstPerformingCategories", "keyWins", "keyLosses", "strategicAdjustments"
    ]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: reportSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text generated");
    
    const aiData = JSON.parse(text);

    // MERGE: AI Qualitative Data + Strict Code Calculations
    const finalReportData: PerformanceReportData = {
      ...aiData,
      stats: computedStats
    };

    // Save to DB
    const { data: savedRecord, error } = await supabaseAdmin
      .from('agent_reports')
      .insert({ report_data: finalReportData })
      .select()
      .single();

    if (error) {
      console.error("DB Save Error:", error);
      return null;
    }
    
    return savedRecord as SavedReport;

  } catch (error) {
    console.error("Report Generation Error:", error);
    return null;
  }
}