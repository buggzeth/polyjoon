// app/actions/ai.ts
"use server";

import { GoogleGenAI } from "@google/genai";
import { cookies, headers } from "next/headers";
import { PolymarketEvent } from "../types/polymarket";
import { AnalysisResponse, BetOpportunity } from "../types/ai";
import { saveAnalysisToDB, getLatestAnalysis } from "./storage";
import { fetchClobData } from "./clob"; 

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

const TRIAL_COOKIE_NAME = "nuke_trial_used";

export async function analyzeEvent(
  event: PolymarketEvent, 
  force: boolean = false,
  paymentTx?: string
): Promise<{ data: AnalysisResponse; isNew: boolean; error?: string }> {
  
  // 1. CACHE CHECK
  if (!force) {
    try {
      const existing = await getLatestAnalysis(event.id);
      if (existing) {
        console.log(`⚡ Returning cached analysis for ${event.id}`);
        return { data: existing.analysis_data, isNew: false };
      }
    } catch (e) {
      console.warn("Database read failed, proceeding to generate fresh.", e);
    }
  }

  // 2. TRIAL & PAYMENT ENFORCEMENT
  const cookieStore = await cookies();
  const trialUsed = cookieStore.get(TRIAL_COOKIE_NAME);
  
  if (!paymentTx) {
    if (trialUsed) {
      return {
        data: { summary: "", opportunities: [], sources: [] },
        isNew: false,
        error: "TRIAL_EXHAUSTED"
      };
    }
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    console.log(`🕵️ Analyzing request from IP: ${ip} (Trial Mode)`);
  }

  // 3. COOLDOWN CHECK
  if (force) {
    const existing = await getLatestAnalysis(event.id);
    if (existing) {
      const lastRun = new Date(existing.created_at).getTime();
      const now = new Date().getTime();
      const diffMinutes = (now - lastRun) / (1000 * 60);

      if (diffMinutes < 30 && !paymentTx) {
        const remaining = Math.ceil(30 - diffMinutes);
        return { 
          data: existing.analysis_data, 
          isNew: false, 
          error: `Cooldown active. Wait ${remaining} mins or pay to bypass.` 
        };
      }
    }
  }

  console.log(`🤖 Generating fresh AI Analysis for ${event.title}...`);

  // --- STEP 4: PREPARE LIVE PRICE DATA (CLOB) ---
  const allTokenIds: string[] = [];
  const now = Date.now();

  // Filter markets that are active, not closed, AND not expired based on date
  const activeMarkets = event.markets.filter(m => {
    const isClosedStatus = !m.active || m.closed;
    const isExpiredDate = m.endDate ? new Date(m.endDate).getTime() <= now : true;
    
    return !isClosedStatus && !isExpiredDate;
  });
  
  activeMarkets.forEach(m => {
    try {
      if (m.clobTokenIds) {
        const tokens = JSON.parse(m.clobTokenIds);
        allTokenIds.push(...tokens);
      }
    } catch (e) {
      console.error(`Error parsing token IDs for market ${m.id}`);
    }
  });

  let livePrices: Record<string, number> = {};
  if (allTokenIds.length > 0) {
    try {
      const clobData = await fetchClobData(allTokenIds);
      
      if (clobData && clobData.prices) {
        Object.entries(clobData.prices).forEach(([tid, priceObj]) => {
            livePrices[tid] = priceObj.SELL ? Number(priceObj.SELL) : 0;
        });
      }
    } catch (e) {
      console.error("Failed to fetch live CLOB data, falling back to cached prices.", e);
    }
  }

  // --- STEP 5: BUILD CONTEXT ---
  const marketContext = activeMarkets.map(m => {
      let outcomes: string[] = [];
      let cachedPrices: number[] = [];
      let tokenIds: string[] = [];
      
      try {
        outcomes = JSON.parse(m.outcomes);
        cachedPrices = JSON.parse(m.outcomePrices).map(Number);
        tokenIds = m.clobTokenIds ? JSON.parse(m.clobTokenIds) : [];
      } catch (e) {
        return null;
      }

      const priceString = outcomes.map((o, i) => {
        const tid = tokenIds[i];
        const isLive = tid && livePrices[tid] !== undefined && livePrices[tid] > 0;
        const finalPrice = isLive ? livePrices[tid] : cachedPrices[i];
        
        return `${o}: ${finalPrice.toFixed(3)} ${isLive ? '(Live Orderbook)' : '(Cached)'}`; 
      }).join(", ");

      return {
        id: m.id,
        question: m.question,
        resolutionCriteria: m.description,
        endDate: m.endDate,
        currentPrices: priceString, 
        liquidity: m.liquidity,
        volume: m.volume,
      };
    })
    .filter(Boolean);

  const analysisSchema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      opportunities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            headline: { type: "string" },
            selectedMarketId: { type: "string" },
            selectedOutcome: { type: "string" },
            marketQuestion: { type: "string" },
            aiProbability: { type: "number" },
            marketProbability: { type: "number" },
            confidenceScore: { type: "number" },
            expectedValue: { type: "number" },
            recommendation: { 
              type: "string", 
              enum: ["BUY"], 
              description: "Action is always BUY."
            },
            betSizeUnits: { type: "number" },
            reasoning: { type: "string" }
          },
          required: [
            "headline", "selectedMarketId", "selectedOutcome", "marketQuestion",
            "aiProbability", "marketProbability", "confidenceScore", 
            "expectedValue", "recommendation", "betSizeUnits", "reasoning"
          ]
        }
      }
    },
    required: ["summary", "opportunities"]
  };

  // --- STEP 6: THE UNIFIED PROMPT ---
  const prompt = `
    ROLE: You are a Skeptical Hedge Fund Risk Manager and Superforecaster. 
    Your goal is NOT to find the highest theoretical return, but to find the *most mispriced* probabilities based on *fresh*, *real-time* evidence.

    CURRENT DATE: ${new Date().toISOString()}
    *Critical: Use this date to disqualify any news or polls older than 48 hours unless they are the absolute latest available.*

    TASK: Analyze the Event. Select top betting opportunities based on "Risk-Adjusted EV".
    
    EVENT CONTEXT:
    Title: "${event.title}"
    Description: "${event.description}"
    
    MARKET DATA (LIVE EXECUTION PRICES):
    ${JSON.stringify(marketContext, null, 2)}
    
    OPERATIONAL PRINCIPLES:
    1. RESPECT THE MARKET: Assume current prices reflect all public information efficiently. The "Live Orderbook" prices are what we must pay to enter.
    2. THE "NEWS GAP": Only recommend a bet if you find *recent* evidence (relative to Current Date) that contradicts the current price.
    3. ACTION IS ALWAYS "BUY": 
       - You are entering NEW positions. You cannot "Sell" shares you don't own.
       - If you think "Yes" is overpriced (bad bet), you must recommend "BUY No".
       - If you think "No" is overpriced, you must recommend "BUY Yes".
    4. SKEPTICISM: 
       - Avoid "Long Shots" (Price < 0.10) unless you have breaking news.
       - Avoid "Sure Things" (Price > 0.90) as the upside is capped.
    5. EV CALCULATION: 
       - Calculate EV using the live price provided. 
       - EV = (YourProb / LiveAskPrice) - 1. 
       - If EV is negative or < 0.05, do not recommend.
    6. LOGICAL CONSISTENCY (CRITICAL):
       - You CAN recommend multiple opportunities per market, BUT they must fit a SINGLE coherent narrative.
       - ACCEPTABLE: Cumulative/Nested bets. (Example: If you believe Bitcoin hits 120k, betting on "> 100k" AND "> 110k" is valid because they are consistent).
       - PROHIBITED: Contradictory/Conflicting bets on mutually exclusive outcomes. (Example: Do NOT bet "14-16 Earthquakes" AND "17-19 Earthquakes". This is confusing. Pick the single specific range with the highest EV).
       - If two mutually exclusive outcomes both look good, select ONLY the one with the best risk-adjusted return.

    ANALYSIS STEPS:
    1. READ RULES: Check "resolutionCriteria".
    2. LIVE SEARCH: Search for the absolute latest status, polls, or data.
    3. BASE RATE: Ask "How often does this usually happen?"
    4. COMPUTE: Estimate true probability (0-100%).
    5. CONSISTENCY CHECK: Ensure all recommendations for this event align with ONE version of the future. Remove contradictory bets.
    6. SANITY CHECK: If your probability differs from Market Price by >20%, verify sources again.
    
    OUTPUT REQUIREMENTS:
    - Return empty list if no confident opportunities exist.
    - "confidenceScore" (1-100) based on source freshness.
    - "marketProbability" must match the Live Price provided in context.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseJsonSchema: analysisSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text generated");
    
    const parsed = JSON.parse(text);

    // Explicit Sources Extraction
    const explicitSources: string[] = [];
    const candidate = response.candidates?.[0];
    if (candidate?.groundingMetadata?.groundingChunks) {
      candidate.groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) explicitSources.push(chunk.web.uri);
      });
    }

    const safeOpportunities: BetOpportunity[] = (parsed.opportunities || []).map((op: any) => ({
      headline: op.headline || "Opportunity",
      selectedMarketId: op.selectedMarketId || "",
      selectedOutcome: op.selectedOutcome || "N/A",
      marketQuestion: op.marketQuestion || "Unknown",
      aiProbability: Number(op.aiProbability) || 0,
      marketProbability: Number(op.marketProbability) || 0,
      confidenceScore: Number(op.confidenceScore) || 5,
      expectedValue: Number(op.expectedValue) || 0,
      recommendation: "BUY",
      betSizeUnits: Number(op.betSizeUnits) || 0,
      reasoning: op.reasoning || "No reasoning provided."
    }));

    const finalData: AnalysisResponse = {
      summary: parsed.summary || "Analysis complete.",
      opportunities: safeOpportunities,
      sources: explicitSources
    };

    await saveAnalysisToDB(event.id, finalData);

    if (!paymentTx) {
      try {
        cookieStore.set(TRIAL_COOKIE_NAME, "true", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 365 * 10,
          path: "/",
          sameSite: "lax"
        });
      } catch (e) {
        console.warn("Client disconnected, could not set trial cookie.");
      }
    }

    return { data: finalData, isNew: true };

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      data: { summary: "Analysis Failed", opportunities: [], sources: [] },
      isNew: false,
      error: "AI Generation failed internally."
    };
  }
}