// app/actions/ai.ts
"use server";

import { GoogleGenAI } from "@google/genai";
import { cookies, headers } from "next/headers";
import { auth } from "@/auth"; // Import auth
import { PolymarketEvent } from "../types/polymarket";
import { AnalysisResponse, BetOpportunity } from "../types/ai";
import { saveAnalysisToDB, getLatestAnalysis, getUserDailyUsage } from "./storage";
import { fetchClobData } from "./clob"; 

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

const TRIAL_COOKIE_NAME = "nuke_last_free_gen";
const USER_LIMIT_COOKIE = "nuke_user_usage"; // New cookie for UI
const COOLDOWN_HOURS = 24;
const USER_DAILY_LIMIT = 5;

export async function analyzeEvent(
  event: PolymarketEvent, 
  force: boolean = false,
  paymentTx?: string
): Promise<{ data: AnalysisResponse; isNew: boolean; error?: string }> {
  
  const session = await auth();
  const cookieStore = await cookies();

  // 1. CACHE CHECK (Same as before)
  if (!force) {
    try {
      const existing = await getLatestAnalysis(event.id);
      if (existing) {
        console.log(`⚡ Returning cached analysis for ${event.id}`);
        return { data: existing.analysis_data, isNew: false };
      }
    } catch (e) {
      console.warn("Database read failed", e);
    }
  }

  // 2. TRIAL & PAYMENT ENFORCEMENT
  if (!paymentTx) {
    
    // BRANCH A: LOGGED IN USER (Limit 5)
    if (session?.user?.id) {
        const usageCount = await getUserDailyUsage(session.user.id);
        
        if (usageCount >= USER_DAILY_LIMIT) {
             return {
                data: { summary: "", opportunities: [], sources: [] },
                isNew: false,
                error: `DAILY_LIMIT_REACHED` // Frontend handles text (Buy more or wait)
            };
        }
        console.log(`👤 User ${session.user.name} Usage: ${usageCount}/${USER_DAILY_LIMIT}`);
    } 
    // BRANCH B: GUEST (Limit 1 via Cookie)
    else {
        const lastGenCookie = cookieStore.get(TRIAL_COOKIE_NAME);
        if (lastGenCookie) {
            const lastGenTime = new Date(lastGenCookie.value).getTime();
            const now = Date.now();
            const hoursDiff = (now - lastGenTime) / (1000 * 60 * 60);

            if (hoursDiff < COOLDOWN_HOURS) {
                return {
                    data: { summary: "", opportunities: [], sources: [] },
                    isNew: false,
                    error: `TRIAL_EXHAUSTED` 
                };
            }
        }
        console.log(`🕵️ Guest analyzing (Trial Mode)`);
    }
  }

  // 3. COOLDOWN CHECK (Per Event)
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
    }).filter(Boolean);

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
    Your PRIMARY goal is to identify HIGH-QUALITY, POSITIVE-EV betting opportunities where your probability assessment differs meaningfully from the market AND you have strong conviction in your analysis.

    HIERARCHY OF DECISION-MAKING (IN ORDER):
    1. CORRECTNESS FIRST: Is your probability estimate well-founded and defensible?
    2. EDGE VERIFICATION: Does the market price meaningfully differ from your estimate?
    3. RISK ASSESSMENT: Is the opportunity worth the capital at risk?
    
    ⚠️ CRITICAL: A "mispricing" is ONLY actionable if YOUR probability estimate is correct. 
    Do NOT bet simply because you identified a logical inconsistency between markets.
    Do NOT bet on a market just because it's "relatively mispriced" if the absolute prediction is unfavorable.

    CURRENT DATE: ${new Date().toISOString()}
    *Critical: Use this date to disqualify any news or polls older than 48 hours unless they are the absolute latest available.*

    TASK: Analyze the Event. Recommend ONLY betting opportunities where:
    - You have HIGH CONFIDENCE in your probability estimate (backed by evidence)
    - The market price creates meaningful positive expected value
    - The risk-reward profile justifies capital allocation
    
    EVENT CONTEXT:
    Title: "${event.title}"
    Description: "${event.description}"
    
    MARKET DATA (LIVE EXECUTION PRICES):
    ${JSON.stringify(marketContext, null, 2)}
    
    OPERATIONAL PRINCIPLES:
    
    1. EVIDENCE-BASED PROBABILITIES:
      - Build your probability from the ground up using recent, credible evidence
      - Base rates, historical precedent, and current data are your foundation
      - Your estimate must be defensible independent of market prices
    
    2. MEANINGFUL EDGE REQUIRED:
      - Only recommend when your probability differs from market by >15% AND you have strong evidence
      - Small edges (<10% difference) require extraordinary evidence to justify
      - If you can't articulate WHY the market is wrong, don't bet
    
    3. MISPRICING IS NOT ENOUGH:
      - Example of WRONG thinking: "Market A (60%) is less likely than Market B (55%), so Market B is mispriced"
      - Example of CORRECT thinking: "Based on [evidence], true probability is 75%, market shows 55%, therefore positive EV exists"
      - Relative mispricing between markets is IRRELEVANT unless your absolute probability for that specific market justifies entry
    
    4. ACTION IS ALWAYS "BUY": 
      - You are entering NEW positions. You cannot "Sell" shares you don't own.
      - If you think "Yes" is overpriced (bad bet), you must recommend "BUY No".
      - If you think "No" is overpriced, you must recommend "BUY Yes".
    
    5. QUALITY OVER QUANTITY: 
      - Empty list is BETTER than weak recommendations
      - Avoid "Long Shots" (Price < 0.10) unless you have breaking, verified news
      - Avoid "Sure Things" (Price > 0.90) as upside is capped and you need near-certainty
      - Focus on markets where you have genuine informational or analytical edge
    
    6. EV CALCULATION (Reality Check): 
      - EV = (YourProbability / LiveAskPrice) - 1
      - Minimum threshold: EV > 0.08 (8% edge)
      - If EV is marginal, ask: "Am I really 8%+ better informed than the market?"
    
    7. LOGICAL CONSISTENCY (CRITICAL):
      - All recommendations must fit a SINGLE coherent narrative about the future
      - ACCEPTABLE: Cumulative/Nested bets (e.g., "BTC > 100k" AND "BTC > 110k" if you believe it hits 120k)
      - PROHIBITED: Contradictory bets on mutually exclusive outcomes
      - If two mutually exclusive outcomes both seem attractive, it likely means:
        a) You're uncertain and shouldn't bet either, OR
        b) Only one actually has positive EV when you account for all factors
      - Pick the SINGLE best opportunity per mutually exclusive set
    
    8. RESPECT MARKET EFFICIENCY:
      - Assume current prices reflect substantial aggregated information
      - You need a specific, articulable reason why you know something the market doesn't
      - "Market seems wrong" is not sufficient; "Market hasn't priced in X recent development because Y" is acceptable

    ANALYSIS WORKFLOW:
    
    Step 1 - UNDERSTAND THE QUESTION:
    - Read resolution criteria carefully
    - Identify exactly what would cause YES vs NO resolution
    - Note any edge cases or ambiguities
    
    Step 2 - INDEPENDENT PROBABILITY ESTIMATE:
    - Search for the absolute latest relevant data (polls, news, statistics)
    - Establish base rates: "How often does this type of event occur?"
    - Build YOUR probability estimate from evidence, NOT from market prices
    - Quality of sources matters: Official data > Major outlets > Aggregators > Commentary
    
    Step 3 - CONFIDENCE ASSESSMENT:
    - How strong is your evidence? (Recent? Reliable? Comprehensive?)
    - What could you be missing? (Selection bias? Measurement error? Unknown unknowns?)
    - Rate your confidence honestly (1-100)
    - If confidence < 70, strongly consider not recommending
    
    Step 4 - MARKET COMPARISON:
    - NOW compare your estimate to market price
    - Calculate expected value using live price
    - Ask: "Is this difference large enough to overcome uncertainty?"
    
    Step 5 - COHERENCE CHECK:
    - Review all potential recommendations together
    - Ensure they tell ONE consistent story
    - Eliminate any contradictory positions
    - Verify you're not just "finding mispricings" but making sound predictions
    
    Step 6 - FINAL FILTER:
    - Would you stake your reputation on this analysis?
    - Does this opportunity justify allocating real capital?
    - If you're on the fence, DON'T recommend it
    
    SANITY CHECKS:
    - If your probability differs from market by >25%, verify sources twice
    - If you found >3 opportunities in one event, ensure they're truly compatible
    - If all your opportunities are longshots, reconsider your risk tolerance
    - If you're recommending based on "arbitrage" between markets, STOP and reassess
    
    OUTPUT REQUIREMENTS:
    - Return EMPTY list if no high-quality opportunities exist (this is often the right answer)
    - Each opportunity must include:
      * "confidenceScore" (1-100): Based on evidence quality and recency, be honest
      * "marketProbability": Must exactly match the Live Price from context
      * "aiProbability": YOUR evidence-based estimate (0-100)
      * "expectedValue": Calculated as (aiProbability/marketProbability) - 1
      * "reasoning": Must explain WHY the market is wrong, not just THAT it's wrong
    
    Remember: Your reputation depends on recommendation quality, not quantity. 
    One well-researched, high-conviction bet >> Multiple "technically mispriced" positions.
    When in doubt, return an empty opportunities array.
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

    // Save with User ID if available
    await saveAnalysisToDB(event.id, finalData, session?.user?.id);

    // POST-GENERATION COOKIE UPDATES
    if (!paymentTx) {
        // If Guest: Set timestamp
        if (!session?.user) {
            cookieStore.set(TRIAL_COOKIE_NAME, new Date().toISOString(), {
                httpOnly: false,
                secure: process.env.NODE_ENV === "production",
                maxAge: 60 * 60 * 24 * 365,
                path: "/",
                sameSite: "lax"
            });
        } 
        // If User: Set usage count for Client UI
        else {
             // We just did one, so fetch fresh count
             const newCount = (await getUserDailyUsage(session.user.id!)); 
             cookieStore.set(USER_LIMIT_COOKIE, newCount.toString(), {
                httpOnly: false,
                secure: process.env.NODE_ENV === "production",
                maxAge: 60 * 60 * 24, // 24h
                path: "/",
                sameSite: "lax"
            });
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