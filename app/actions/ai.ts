// app/actions/ai.ts
"use server";

import { GoogleGenAI } from "@google/genai";
import { PolymarketEvent } from "../types/polymarket";
import { AnalysisResponse, BetOpportunity } from "../types/ai";
import { saveAnalysisToDB, getLatestAnalysis } from "./storage";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

export async function analyzeEvent(
  event: PolymarketEvent, 
  force: boolean = false
): Promise<{ data: AnalysisResponse; isNew: boolean; error?: string }> {
  
  // 1. CACHE CHECK: If not forcing, return existing DB record if available
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

  // 2. COOLDOWN CHECK: If forcing, ensure 30 minutes have passed since last run
  if (force) {
    const existing = await getLatestAnalysis(event.id);
    if (existing) {
      const lastRun = new Date(existing.created_at).getTime();
      const now = new Date().getTime();
      const diffMinutes = (now - lastRun) / (1000 * 60);

      if (diffMinutes < 30) {
        const remaining = Math.ceil(30 - diffMinutes);
        return { 
          data: existing.analysis_data, 
          isNew: false, 
          error: `Cooldown active. Please wait ${remaining} minutes before regenerating.` 
        };
      }
    }
  }

  console.log(`🤖 Generating fresh AI Analysis for ${event.title}...`);

  // 3. Minify Market Data (Expanded to include Resolution Criteria & Stats)
  const marketContext = event.markets
    // FILTER: Only include markets that are Active AND Not Closed
    .filter(m => m.active && !m.closed)
    .map(m => {
      let outcomes: string[] = [];
      let prices: number[] = [];
      try {
        outcomes = JSON.parse(m.outcomes);
        prices = JSON.parse(m.outcomePrices).map(Number);
      } catch (e) {
        return null;
      }

      // We map the raw API fields to a context object for the AI
      return {
        id: m.id,
        question: m.question,
        resolutionCriteria: m.description, // CRITICAL: The rules of the bet
        endDate: m.endDate, // CRITICAL: Time horizon
        prices: outcomes.map((o, i) => `${o}: ${prices[i]}`).join(", "),
        liquidity: m.liquidity, // Helpful for viability
        volume: m.volume, // Helpful for sentiment
        // spread is not strictly typed in all Polymarket interfaces, so we check safely
        spread: (m as any).spread || 0 
      };
    })
    .filter(Boolean);

  // 4. Define Schema (Original Logic)
  const analysisSchema = {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "A brief 2-sentence overview of the event sentiment."
      },
      opportunities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            headline: { type: "string", description: "Short punchy headline" },
            selectedMarketId: { type: "string", description: "The ID of the chosen question" },
            selectedOutcome: { type: "string", description: "e.g. 'Yes', 'No', 'Kansas'" },
            marketQuestion: { type: "string", description: "The question text" },
            aiProbability: { type: "number", description: "0.0 to 1.0" },
            marketProbability: { type: "number", description: "The current market price 0.0 to 1.0" },
            confidenceScore: { type: "number", description: "1 to 100" },
            expectedValue: { type: "number", description: "EV percentage e.g. 0.15" },
            recommendation: { 
              type: "string", 
              enum: ["BUY", "SELL"],
              description: "Action to take."
            },
            betSizeUnits: { type: "number", description: "Kelly stake 0-5" },
            reasoning: { type: "string", description: "Specific analysis for this bet" }
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
    ROLE: You are an elite Forecaster and Quantitative Trader.
    
    TASK: Analyze the provided Event and its associated Markets. 
    Identify the TOP 6 (up to 6 if applicable) betting opportunities that offer positive Expected Value (EV).
    
    EVENT DETAILS:
    Title: "${event.title}"
    Description: "${event.description}"
    
    AVAILABLE MARKETS:
    ${JSON.stringify(marketContext, null, 2)}
    
    INSTRUCTIONS:
    1. ANALYZE RULES: Carefully read the "resolutionCriteria" for each market. Look for specific conditions (e.g., "resolves to No if X happens") that strictly define the outcome.
    2. RESEARCH: Use Google Search to find latest news, stats, and real-time data relative to these specific questions.
    3. EVALUATE METRICS:
       - Liquidity/Volume: Prioritize markets with higher liquidity. Be cautious of high EV plays on dead markets (low volume).
       - Spread: Account for the spread in your EV calculation. High spreads reduce realizable profit.
       - Time Horizon: Check "endDate". Consider the opportunity cost of locking up capital for long-duration bets.
    4. COMPUTE EV: Compare your researched probability against the current market "prices". Look for mispricings.
    5. SELECT: Return a list of the best plays. If there are no positive EV plays, return an empty opportunities list.
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

    // 5. Parse Response
    const text = response.text;
    if (!text) throw new Error("No response text generated");
    
    const parsed = JSON.parse(text);

    // Extract Sources from Grounding Metadata
    const explicitSources: string[] = [];
    const candidate = response.candidates?.[0];
    if (candidate?.groundingMetadata?.groundingChunks) {
      candidate.groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) explicitSources.push(chunk.web.uri);
      });
    }

    // 6. Map to Types
    const safeOpportunities: BetOpportunity[] = (parsed.opportunities || []).map((op: any) => ({
      headline: op.headline || "Opportunity",
      selectedMarketId: op.selectedMarketId || "",
      selectedOutcome: op.selectedOutcome || "N/A",
      marketQuestion: op.marketQuestion || "Unknown",
      aiProbability: Number(op.aiProbability) || 0,
      marketProbability: Number(op.marketProbability) || 0,
      confidenceScore: Number(op.confidenceScore) || 5,
      expectedValue: Number(op.expectedValue) || 0,
      recommendation: op.recommendation === "SELL" ? "SELL" : "BUY",
      betSizeUnits: Number(op.betSizeUnits) || 0,
      reasoning: op.reasoning || "No reasoning provided."
    }));

    const finalData: AnalysisResponse = {
      summary: parsed.summary || "Analysis complete.",
      opportunities: safeOpportunities,
      sources: explicitSources
    };

    // 7. SAVE TO DB
    await saveAnalysisToDB(event.id, finalData);

    return {
      data: finalData,
      isNew: true
    };

  } catch (error) {
    console.error("AI Analysis Error:", error);
    
    // Fallback error object matching return signature
    return {
      data: {
        summary: "Analysis Failed",
        opportunities: [],
        sources: []
      },
      isNew: false,
      error: "AI Generation failed internally."
    };
  }
}