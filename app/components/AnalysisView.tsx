// app/components/AnalysisView.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnalysisRecord } from "../actions/storage";
import { BetOpportunity } from "../types/ai";
import BettingInterface from "./BettingInterface";
import PaymentModal from "./PaymentModal";
import { analyzeEvent } from "../actions/ai";
import { getEventById } from "../actions/fetchEvents";
import { fetchClobData, resolveTokenIds } from "../actions/clob"; 
import { ClobData } from "../types/clob"; 
import OrderBookWidget from "./OrderBookWidget"; 
import { useTrading } from '../contexts/TradingContext';
import { ANALYSIS_COST_USDC } from '../lib/constants';
import CrabSpinner from "./CrabSpinner";

interface AnalysisViewProps {
  eventId: string;
  initialHistory: AnalysisRecord[];
}

export default function AnalysisView({ eventId, initialHistory }: AnalysisViewProps) {
  const router = useRouter();
  
  // Analysis State
  const [history, setHistory] = useState<AnalysisRecord[]>(initialHistory);
  const [selectedId, setSelectedId] = useState<string>(initialHistory[0]?.id || "");
  const [regenerating, setRegenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // CLOB Data State
  const [tokenMap, setTokenMap] = useState<Record<string, string>>({}); 
  const [clobData, setClobData] = useState<ClobData | null>(null);
  const [loadingClob, setLoadingClob] = useState(false);

  // Derived state
  const selectedRecord = history.find(h => h.id === selectedId) || history[0];
  const data = selectedRecord?.analysis_data;

  // --- 1. RESOLVE TOKEN IDS WHEN ANALYSIS CHANGES ---
  useEffect(() => {
    if (!data?.opportunities) return;

    const resolve = async () => {
      setLoadingClob(true);
      const targets = data.opportunities.map(o => ({
        marketId: o.selectedMarketId,
        outcome: o.selectedOutcome
      }));
      
      const mapping = await resolveTokenIds(targets);
      setTokenMap(mapping);
      
      const tokenIds = Object.values(mapping);
      if (tokenIds.length > 0) {
        const liveData = await fetchClobData(tokenIds);
        setClobData(liveData);
      }
      setLoadingClob(false);
    };

    resolve();
  }, [data]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { transferUSDC, isReady } = useTrading();

  // 1. Initial Click
  const onRegenerateClick = () => {
    setShowPaymentModal(true);
  };

  // 2. Modal Confirm
  const handleRegenerateConfirm = async () => {
    if (!isReady) {
        alert("Please enable trading to proceed.");
        setShowPaymentModal(false);
        return;
    }

    setRegenerating(true); 
    setShowPaymentModal(false); 
    setErrorMsg(null);
    
    try {
      // A. Pay
      const txHash = await transferUSDC(ANALYSIS_COST_USDC);

      // B. Fetch & Analyze
      const rawEvent = await getEventById(eventId);
      if (!rawEvent) throw new Error("Could not fetch event data");

      // Pass txHash to bypass trial checks since we paid
      const result = await analyzeEvent(rawEvent, true, txHash); 
      
      if (result.error) {
        setErrorMsg(result.error);
      } else if (result.isNew) {
        router.refresh();
        const newRecord: AnalysisRecord = {
            id: "temp-" + Date.now(),
            event_id: eventId,
            analysis_data: result.data,
            created_at: new Date().toISOString()
        };
        setHistory([newRecord, ...history]);
        setSelectedId(newRecord.id);
      } else {
        setErrorMsg("Database returned existing record.");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  // Calculate time since generation
  const elapsedMs = Date.now() - new Date(selectedRecord.created_at).getTime();
  const hoursAgo = Math.floor(elapsedMs / (1000 * 60 * 60));
  const timeLabel = hoursAgo < 1 ? "just now" : `${hoursAgo} hour${hoursAgo === 1 ? '' : 's'} ago`;

  if (!data) return <div className="p-10 text-center text-slate-500">No data available.</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <Link href="/analysis/feed" className="text-xs font-mono text-slate-500 hover:text-slate-300 mb-4 block w-fit">
          ← SHOW ALL ANALYSES
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-400 to-orange-400 bg-clip-text text-transparent">
            Market Analysis
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <select 
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-zinc-900 border border-slate-700 text-slate-300 text-xs rounded-sm px-3 py-2 outline-none focus:border-indigo-500"
            >
              {history.map((h, i) => (
                <option key={h.id} value={h.id}>
                  {i === 0 ? "Latest: " : "History: "}
                  {new Date(h.created_at).toLocaleString()}
                </option>
              ))}
            </select>
            <button
              onClick={onRegenerateClick}
              disabled={regenerating}
              className="bg-orange-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:border disabled:border-orange-900/20 disabled:text-orange-400/50 text-white text-xs font-bold px-4 py-2 rounded-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap min-w-[140px]"
            >
              {regenerating ? (
                <div className="flex gap-1">
                   <span className="animate-bounce">🦀</span>
                   <span>Thinking...</span>
                </div>
              ) : (
                <>🔄 Regenerate Analysis</>
              )}
            </button>
        </div>

        {/* Payment Modal for Regeneration */}
        <PaymentModal 
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            onConfirm={handleRegenerateConfirm}
            isProcessing={regenerating && showPaymentModal} 
            amount={ANALYSIS_COST_USDC}
            title="Regenerate Analysis"
            description="Run a fresh analysis on this market using the latest live data and odds. This action incurs a standard fee."
        />
        </div>

        {/* Large Time Display */}
        <div className="text-xl md:text-2xl font-bold text-slate-500 mb-6">
          Analysis generated {timeLabel}
        </div>

        {errorMsg && (
            <div className="mb-4 p-3 bg-rose-900/30 border border-rose-500/30 text-rose-300 text-sm rounded-sm text-center">
            ⚠️ {errorMsg}
            </div>
        )}

        {/* --- LOADING OVERLAY FOR REGENERATION --- */}
        {regenerating && (
             <div className="my-12 bg-zinc-900/30 border border-orange-900/20 rounded-sm p-12 flex flex-col items-center justify-center">
                <CrabSpinner text="PINCHING ALPHA..." size="lg" />
                <p className="text-zinc-500 text-xs font-mono mt-4">
                    Querying LLM & saving to database...
                </p>
             </div>
        )}

        {/* Executive Summary */}
        {!regenerating && (
            <div className="bg-zinc-900/50 border border-orange-900/20 p-6 rounded-sm">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Executive Summary</h2>
                <span className="text-[10px] text-slate-600 font-mono">
                    {new Date(selectedRecord.created_at).toLocaleString()}
                </span>
            </div>
            <p className="text-slate-200 leading-relaxed text-lg">{data.summary}</p>
            {data.sources && data.sources.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                {data.sources.map((src, i) => (
                    <a key={i} href={src} target="_blank" className="text-[10px] bg-orange-900/20 hover:bg-slate-700 text-zinc-400 px-2 py-1 rounded truncate max-w-[200px]">
                    Source #{i + 1}
                    </a>
                ))}
                </div>
            )}
            </div>
        )}
      </div>

      {/* Opportunities Grid */}
      {!regenerating && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.opportunities.length > 0 ? (
            data.opportunities.map((opp, idx) => {
                const key = `${opp.selectedMarketId}-${opp.selectedOutcome}`;
                const tokenId = tokenMap[key];
                const book = tokenId && clobData?.books ? clobData.books[tokenId] : undefined;
                const spread = tokenId && clobData?.spreads ? clobData.spreads[tokenId] : undefined;
                const livePriceObj = tokenId && clobData?.prices ? clobData.prices[tokenId] : undefined;

                let suggestedFillPrice = opp.marketProbability; 
                if (livePriceObj) {
                    suggestedFillPrice = opp.recommendation === "BUY" 
                        ? Number(livePriceObj.SELL || livePriceObj.BUY || 0) 
                        : Number(livePriceObj.BUY || 0); 
                }

                return (
                <OpportunityCard 
                    key={idx} 
                    data={opp} 
                    book={book}
                    spread={spread}
                    livePrice={suggestedFillPrice}
                />
                );
            })
            ) : (
            <div className="col-span-full text-center py-12 bg-zinc-900/50 border border-dashed border-orange-900/20 rounded-sm text-slate-500">
                No specific high-EV opportunities found.
            </div>
            )}
        </div>
      )}
    </div>
  );
}

function OpportunityCard({ 
    data, 
    book, 
    spread,
    livePrice 
}: { 
    data: BetOpportunity, 
    book?: any, 
    spread?: string,
    livePrice: number
}) {
  const isBuy = data.recommendation === "BUY";
  const isYes = data.selectedOutcome === "Yes";
  const borderColor = isBuy ? "border-emerald-500/30 hover:border-emerald-500/60" : "border-slate-700 hover:border-slate-600";
  const glow = isBuy ? "shadow-[0_0_30px_-5px_rgba(16,185,129,0.1)]" : "";

  return (
    <div className={`bg-zinc-900 border ${borderColor} rounded-2xl p-6 shadow-xl ${glow} transition-all flex flex-col h-full`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
            <div className={`text-xs font-bold px-2 py-1 rounded w-fit mb-2 ${isYes ? 'bg-lime-900/30 text-lime-400' : 'bg-rose-900/30 text-rose-400'}`}>
                {data.recommendation} 🡆 {data.selectedOutcome.toUpperCase()}
            </div>
            <h3 className="text-xl font-bold text-orange-50 leading-tight">{data.headline}</h3>
        </div>
        <div className="ml-4 text-right">
            <div className={`text-2xl font-mono font-bold ${data.expectedValue > 0 ? 'text-lime-400' : 'text-zinc-400'}`}>
                {data.expectedValue > 0 ? '+' : ''}{(data.expectedValue * 100).toFixed(0)}% EV
            </div>
            <div className="text-xs text-slate-500 font-mono mt-1">Conf: {data.confidenceScore}/100</div>
        </div>
      </div>
      
      <p className="text-xs text-zinc-400 font-mono border-l-2 border-slate-700 pl-3 mb-6 line-clamp-2">{data.marketQuestion}</p>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        <StatBox label="AI Prob" value={`${(data.aiProbability > 1 ? data.aiProbability : data.aiProbability * 100).toFixed(1)}%`} />
        
        <div className="p-2 rounded border text-center bg-orange-900/20/30 border-slate-700/30 opacity-75">
            <div className="text-[10px] uppercase text-slate-500 font-bold">Price (Then)</div>
            <div className="text-lg font-mono font-bold text-zinc-400">
                {(data.marketProbability * 100).toFixed(1)}¢
            </div>
        </div>

        <StatBox label="Price (Now)" value={`${(livePrice * 100).toFixed(1)}¢`} highlight />
        <StatBox label="Kelly Stake" value={`${data.betSizeUnits}u`} />
      </div>

      <div className="mb-6">
        <OrderBookWidget book={book} spread={spread} side={data.recommendation} />
      </div>

      <div className="flex-1 bg-zinc-950/50 rounded-sm p-4 border border-orange-900/20/50 mb-6 text-sm text-slate-300 whitespace-pre-line">
        {data.reasoning}
      </div>
      
      <div className="mt-auto pt-4 border-t border-orange-900/20/50">
        <div className="flex justify-between items-center mb-3">
            <div className={`text-sm font-bold px-3 py-1 rounded-md ${isYes ? 'bg-lime-900/30 text-lime-400' : 'bg-rose-900/30 text-rose-400'}`}>
                {data.recommendation === "BUY" ? "BUYING" : "SELLING"} {data.selectedOutcome.toUpperCase()}
            </div>
        </div>
        <BettingInterface 
            marketId={data.selectedMarketId}
            recommendedOutcome={data.selectedOutcome}
            recommendedPrice={livePrice} 
        />
      </div>
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className={`p-2 rounded border text-center ${highlight ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-orange-900/20/30 border-slate-700/30'}`}>
      <div className="text-[10px] uppercase text-slate-500 font-bold">{label}</div>
      <div className={`text-lg font-mono font-bold ${highlight ? 'text-indigo-300' : 'text-slate-200'}`}>
        {value}
      </div>
    </div>
  );
}