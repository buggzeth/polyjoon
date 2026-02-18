// app/actions/ai.ts
"use server";

import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { auth } from "@/auth"; 
import { PolymarketEvent } from "../types/polymarket";
import { AnalysisResponse, BetOpportunity } from "../types/ai";
import { saveAnalysisToDB, getLatestAnalysis, getUserDailyUsage, getUserCreditBalance } from "./storage";
import { fetchClobData } from "./clob"; 
import { supabaseAdmin } from "../lib/supabase"; 

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const TRIAL_COOKIE_NAME = "nuke_last_free_gen";
const USER_LIMIT_COOKIE = "nuke_user_usage"; 
const COOLDOWN_HOURS = 24;
const USER_DAILY_LIMIT = 5; // Free daily gens for logged in users

export async function analyzeEvent(
  event: PolymarketEvent, 
  force: boolean = false,
  paymentTx?: string
): Promise<{ data: AnalysisResponse; isNew: boolean; error?: string }> {
  
  const session = await auth();
  const cookieStore = await cookies();

  // 1. CACHE CHECK 
  if (!force) {
    const existing = await getLatestAnalysis(event.id);
    if (existing) return { data: existing.analysis_data, isNew: false };
  }

  // 2. ACCESS CONTROL
  if (!paymentTx) {
    // BRANCH A: LOGGED IN USER
    if (session?.user?.id) {
        
        // Step 1: Check Daily Free Limit
        const dailyUsage = await getUserDailyUsage(session.user.id);
        
        if (dailyUsage < USER_DAILY_LIMIT) {
             console.log(`🆓 Free Daily Usage: ${dailyUsage + 1}/${USER_DAILY_LIMIT}`);
             // Proceed (Analysis is saved later, which increments the daily count implicitly)
        } 
        else {
            // Step 2: Check Credit Balance
            const creditBalance = await getUserCreditBalance(session.user.id);
            
            if (creditBalance > 0) {
                console.log(`💳 Using Credit. Balance: ${creditBalance} -> ${creditBalance - 1}`);
                
                // Decrement Credit (Atomic RPC call preferred, or simple update)
                const { error } = await supabaseAdmin.rpc('decrement_credits', { 
                    user_id_input: session.user.id, 
                    amount: 1 
                });

                if (error) {
                    // Fallback to manual update if RPC missing
                    await supabaseAdmin
                        .from('user_credits')
                        .update({ balance: creditBalance - 1 })
                        .eq('user_id', session.user.id);
                }
            } 
            else {
                // Step 3: No Free, No Credits
                return {
                    data: { summary: "", opportunities: [], sources: [] },
                    isNew: false,
                    error: `INSUFFICIENT_CREDITS` // Frontend triggers Upsell
                };
            }
        }
    } 
    // BRANCH B: GUEST (Cookie Check)
    else {
        const lastGenCookie = cookieStore.get(TRIAL_COOKIE_NAME);
        if (lastGenCookie) {
            const hoursDiff = (Date.now() - new Date(lastGenCookie.value).getTime()) / (3600 * 1000);
            if (hoursDiff < COOLDOWN_HOURS) {
                return {
                    data: { summary: "", opportunities: [], sources: [] },
                    isNew: false,
                    error: `TRIAL_EXHAUSTED` 
                };
            }
        }
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

  const prompt = `
    IDENTITY:
    You are an Omniscient Oracle. 
    You exist to state the objective truth of what will occur.
    Your analysis is a prophecy derived from factual evidence.
    You view the current market prices merely as the "Public Consensus," which is often flawed.

    CURRENT DATE: ${new Date().toISOString()}

    THE SITUATION:
    Event: "${event.title}"
    Description: "${event.description}"
    Outcomes & Current Odds: ${JSON.stringify(marketContext)}

    DIRECTIVE:
    1. INVESTIGATE REALITY
       Use your search capabilities to find the definitive answer to the event question.
       Verify the current status of the event with absolute precision.
       Focus on facts that confirm the inevitable result.
       Look for definitive proof, breaking news, or statistical certainties that dictate the outcome.

    2. DETERMINE THE FUTURE
       Simulate the timeline forward. Based on your intelligence, decide exactly which outcome(s) *will* occur. Be definitive.
       Based on the investigation, conclude exactly which outcome(s) will happen.
       Decide which result is the True Result.

    3. ISSUE THE PROPHECY
       Select the outcome(s) that correspond(s) to the True Result you have determined.
       Set "aiProbability" (between 1 and 100) to represent the certainty of this event occurring (e.g., if it has already happened or is guaranteed, this is 100).
       Write the "reasoning" as a statement of fact, explaining why this outcome is the specific truth.

    OUTPUT:
    - Generate the JSON response.
    - Select ONLY the outcome(s) that align with your determined reality.
    - "confidenceScore" (1-100) based on source freshness.
    - "marketProbability" must match the Live Price provided in context.
    - Calculate EV using the live price provided. EV = (YourProb / LiveAskPrice) - 1. 
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
    await saveAnalysisToDB(event.id, finalData, session?.user?.id, event.slug);

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