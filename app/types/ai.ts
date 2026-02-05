// app/types/ai.ts

export interface ScoutResponse {
  marketIds: string[];
  reasoning: string;
}

export interface BetOpportunity {
  headline: string;
  selectedMarketId: string;
  selectedOutcome: string;
  marketQuestion: string;
  aiProbability: number;
  marketProbability: number;
  confidenceScore: number;
  expectedValue: number;
  recommendation: "BUY" | "SELL";
  betSizeUnits: number;
  reasoning: string;
}

export interface AnalysisResponse {
  summary: string; // A high-level summary of the event
  opportunities: BetOpportunity[]; // List of actionable bets
  sources: string[];
}