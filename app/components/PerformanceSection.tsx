// app/components/PerformanceSection.tsx
"use client";

import { useState } from "react";
import { generateDailyReport } from "../actions/performance";
import { SavedReport, PerformanceReportData } from "../types/performance";

interface Props {
  initialReport: SavedReport | null;
  canGenerate: boolean;
  nextGenTime?: number;
}

export default function PerformanceSection({ initialReport, canGenerate, nextGenTime }: Props) {
  const [report, setReport] = useState<SavedReport | null>(initialReport);
  const [loading, setLoading] = useState(false);
  const [generatedJustNow, setGeneratedJustNow] = useState(false);
  const [isBtnDisabled, setIsBtnDisabled] = useState(!canGenerate);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const newReport = await generateDailyReport();
      if (newReport) {
        setReport(newReport);
        setGeneratedJustNow(true);
        setIsBtnDisabled(true); // Disable immediately after success
      }
    } catch (e) {
      console.error("Generation failed", e);
    } finally {
      setLoading(false);
    }
  };

  // Helper to show time remaining
  const getCooldownText = () => {
    if (!nextGenTime) return "24H Cooldown";
    const minutes = Math.ceil((nextGenTime - Date.now()) / 60000);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <section className="w-full border-t border-zinc-800 bg-zinc-900/20 p-6 md:p-10 mb-8 rounded-sm relative overflow-hidden">
      {/* Background Watermark */}
      <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-9xl text-zinc-500 select-none pointer-events-none">
        AUDIT
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
        <div>
          <h2 className="text-2xl font-mono font-bold text-slate-100 flex items-center gap-2">
            <span className="text-orange-500">📋</span> AGENT PERFORMANCE AUDIT
          </h2>
          <p className="text-zinc-500 text-sm font-mono mt-1 max-w-lg">
            Daily AI-generated analysis of betting patterns, win rates by category, and strategic flaws.
          </p>
        </div>

        {/* Generate Button / Cooldown Status */}
        <div className="text-right">
          {!report || (!isBtnDisabled && !generatedJustNow) ? (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-mono font-bold text-sm px-6 py-3 rounded-sm transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
              {loading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ANALYZING PNL...
                </>
              ) : (
                <>
                  <span>⚡</span> GENERATE NEW REPORT
                </>
              )}
            </button>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <div className="text-xs font-mono text-zinc-500 border border-zinc-800 px-3 py-1.5 rounded bg-black/50">
                NEXT ANALYSIS AVAILABLE: <span className="text-orange-400 font-bold">{getCooldownText()}</span>
              </div>
              {generatedJustNow && <div className="text-[10px] text-emerald-500 font-bold animate-pulse">REPORT GENERATED SUCCESSFULLY</div>}
            </div>
          )}
        </div>
      </div>

      {report ? (
        <ReportDisplay data={report.report_data} />
      ) : (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded bg-zinc-950/30">
          <p className="text-zinc-500 font-mono text-sm">Waiting for community audit initiation...</p>
        </div>
      )}
    </section>
  );
}

// Sub-component to render the actual report data
function ReportDisplay({ data }: { data: PerformanceReportData }) {
  const gradeColors: Record<string, string> = {
    "A+": "text-emerald-400 border-emerald-500 shadow-emerald-500/20",
    "A": "text-emerald-500 border-emerald-600 shadow-emerald-600/20",
    "B": "text-lime-400 border-lime-500 shadow-lime-500/20",
    "C": "text-yellow-400 border-yellow-500 shadow-yellow-500/20",
    "D": "text-orange-400 border-orange-500 shadow-orange-500/20",
    "F": "text-red-500 border-red-600 shadow-red-500/20",
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. NEW: Primitives / Stats Grid */}
      {data.stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
           <StatBox label="Markets Settled" value={data.stats.totalBets} />
           <StatBox 
             label="Win Rate" 
             value={`${data.stats.winRate}%`} 
             highlight={data.stats.winRate > 50} 
           />
           <StatBox 
             label="Won / Lost" 
             value={`${data.stats.won} / ${data.stats.lost}`} 
           />
           <StatBox 
             label="Net PnL" 
             value={`${data.stats.totalPnL > 0 ? '+' : ''}$${data.stats.totalPnL.toFixed(2)}`} 
             highlight={data.stats.totalPnL > 0}
             color={data.stats.totalPnL > 0 ? 'text-emerald-400' : 'text-rose-400'}
           />
           <StatBox 
             label="ROI" 
             value={`${data.stats.roi > 0 ? '+' : ''}${data.stats.roi}%`} 
             highlight={data.stats.roi > 0}
             color={data.stats.roi > 0 ? 'text-emerald-400' : 'text-rose-400'}
           />
        </div>
      )}

      {/* 2. Executive Header */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-9 bg-zinc-950/50 p-6 rounded border border-zinc-800/50 relative group hover:border-zinc-700 transition-colors">
          <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span> Executive Summary
          </h3>
          <p className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {data.executiveSummary}
          </p>
        </div>
        
        {/* Grade Card */}
        <div className="md:col-span-3 flex flex-col items-center justify-center bg-zinc-950 p-6 rounded border border-zinc-800">
          <span className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">Performance Grade</span>
          <div className={`text-6xl font-black font-mono mt-3 p-6 border-4 rounded-xl w-32 h-32 flex items-center justify-center shadow-lg bg-zinc-900 ${gradeColors[data.overallGrade] || 'text-zinc-500 border-zinc-700'}`}>
            {data.overallGrade}
          </div>
        </div>
      </div>

      {/* 3. Category Performance Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Winners */}
        <div>
          <h3 className="flex items-center gap-2 text-xs font-bold text-emerald-500 mb-4 uppercase tracking-wider">
            <span>▲</span> Outperforming Categories
          </h3>
          <div className="space-y-3">
            {data.topPerformingCategories.map((cat, i) => (
              <div key={i} className="bg-zinc-950/80 p-3 rounded-sm border border-zinc-800/50 flex justify-between items-center hover:border-emerald-900/50 transition-colors">
                <div>
                  <div className="text-sm font-bold text-slate-200">{cat.category}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">{cat.totalBets} Trades • {cat.winRate}% Win Rate</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-mono font-bold text-sm">+${cat.pnl.toFixed(2)}</div>
                  <div className="text-[9px] text-emerald-300 font-bold bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-900/30 inline-block mt-1">
                    {cat.sentiment}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Losers */}
        <div>
          <h3 className="flex items-center gap-2 text-xs font-bold text-rose-500 mb-4 uppercase tracking-wider">
            <span>▼</span> Underperforming Categories
          </h3>
          <div className="space-y-3">
            {data.worstPerformingCategories.map((cat, i) => (
              <div key={i} className="bg-zinc-950/80 p-3 rounded-sm border border-zinc-800/50 flex justify-between items-center hover:border-rose-900/50 transition-colors">
                <div>
                  <div className="text-sm font-bold text-slate-200">{cat.category}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">{cat.totalBets} Trades • {cat.winRate}% Win Rate</div>
                </div>
                <div className="text-right">
                  <div className="text-rose-400 font-mono font-bold text-sm">${cat.pnl.toFixed(2)}</div>
                  <div className="text-[9px] text-rose-300 font-bold bg-rose-900/20 px-1.5 py-0.5 rounded border border-rose-900/30 inline-block mt-1">
                    {cat.sentiment}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Strategic & Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-zinc-950/50 p-5 rounded border border-zinc-800 hover:border-orange-900/30 transition-colors">
            <h4 className="text-xs text-orange-500 font-bold uppercase mb-3 flex items-center gap-2">
               <span>🛠</span> Suggested Adjustments
            </h4>
            <p className="text-xs text-zinc-300 font-mono leading-relaxed border-l-2 border-orange-900/50 pl-3">
              "{data.strategicAdjustments}"
            </p>
         </div>
         <div className="bg-zinc-950/50 p-5 rounded border border-zinc-800">
            <h4 className="text-xs text-blue-500 font-bold uppercase mb-3 flex items-center gap-2">
                <span>📌</span> Notable Outcomes
            </h4>
            <ul className="text-xs text-zinc-400 font-mono space-y-2">
              {data.keyWins.slice(0,2).map((w, i) => (
                  <li key={`w-${i}`} className="flex gap-2 items-start">
                      <span className="text-emerald-500 font-bold text-[10px] mt-0.5">WIN</span> 
                      <span className="text-zinc-300">{w}</span>
                  </li>
              ))}
              {data.keyLosses.slice(0,2).map((l, i) => (
                  <li key={`l-${i}`} className="flex gap-2 items-start">
                      <span className="text-rose-500 font-bold text-[10px] mt-0.5">LOSS</span> 
                      <span className="text-zinc-300">{l}</span>
                  </li>
              ))}
            </ul>
         </div>
      </div>
    </div>
  );
}

// Small helper component for the stats grid
function StatBox({ label, value, highlight, color }: any) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/50 p-3 rounded flex flex-col items-center justify-center text-center">
      <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-mono font-bold ${color ? color : highlight ? 'text-slate-200' : 'text-zinc-400'}`}>
        {value}
      </div>
    </div>
  );
}