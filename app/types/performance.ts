// app/types/performance.ts

export interface CategoryPerformance {
  category: string; // e.g. "Tennis", "US Politics"
  totalBets: number;
  winRate: number;
  pnl: number;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export interface PeriodStats {
  totalBets: number;
  won: number;
  lost: number;
  winRate: number;
  totalPnL: number;
  roi: number;
}

export interface PerformanceReportData {
  periodStart: string;
  periodEnd: string;
  overallGrade: "A+" | "A" | "B" | "C" | "D" | "F";
  executiveSummary: string;
  stats: PeriodStats; // <--- NEW FIELD
  topPerformingCategories: CategoryPerformance[];
  worstPerformingCategories: CategoryPerformance[];
  keyWins: string[];
  keyLosses: string[];
  strategicAdjustments: string;
}

export interface SavedReport {
  id: string;
  created_at: string;
  report_data: PerformanceReportData;
}