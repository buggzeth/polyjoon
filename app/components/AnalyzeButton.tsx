// app/components/AnalyzeButton.tsx
"use client";

import { useState } from "react";
import { PolymarketEvent } from "../types/polymarket";
import { analyzeEvent } from "../actions/ai";
import { checkAnalysisExists } from "../actions/storage";
import { useTrading } from "../contexts/TradingContext";
import { ANALYSIS_COST_USDC } from "../lib/constants";
import PaymentModal from "./PaymentModal";
import AnalysisLoadingModal from "./AnalysisLoadingModal";

export default function AnalyzeButton({ event }: { event: PolymarketEvent }) {
  // Button State
  const [checking, setChecking] = useState(false);
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // Analysis Loading/Result Modal State
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<'generating' | 'ready' | 'error'>('generating');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { transferUSDC, isReady } = useTrading();

  // Helper to trigger the success state
  const handleSuccess = (eventId: string) => {
    setResultUrl(`/analysis/result?eventId=${eventId}`);
    setAnalysisStatus('ready');
  };

  // Helper to trigger error state
  const handleError = (msg: string) => {
    setErrorMsg(msg);
    setAnalysisStatus('error');
  };

  // 1. Initial Click: Check DB or Attempt Free Trial
  const handleAnalyzeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setChecking(true);
    
    try {
      // Step A: Check if DB has it already (Fast)
      const alreadyAnalyzed = await checkAnalysisExists(event.id);

      if (alreadyAnalyzed) {
        // If exists, show the "Ready" modal immediately
        setChecking(false);
        setAnalysisStatus('ready');
        setResultUrl(`/analysis/result?eventId=${event.id}`);
        setIsAnalysisModalOpen(true);
        return;
      }

      // Step B: Attempt a FREE generation (Trial Mode)
      // Note: We don't show the modal yet, we check if trial is valid first
      const result = await analyzeEvent(event, false);

      if (result.error === "TRIAL_EXHAUSTED") {
        // Step C: Trial used up? Open Payment Modal.
        setIsPaymentModalOpen(true);
      } else if (result.error) {
        // Actual error (API down, etc)
        alert("Analysis failed: " + result.error);
      } else {
        // Success (Free Trial Used) -> Show Ready Modal
        setChecking(false);
        setAnalysisStatus('ready');
        setResultUrl(`/analysis/result?eventId=${event.id}`);
        setIsAnalysisModalOpen(true);
        return;
      }

    } catch (error) {
      console.error(error);
      alert("Something went wrong connecting to the agent.");
    } finally {
      setChecking(false);
    }
  };

  // 2. Modal Confirm: Pay -> Close Payment -> Open Loading -> Generate
  const handlePaymentAndGenerate = async () => {
    if (!isReady) {
        alert("Please connect your wallet and 'Enable Trading' to proceed.");
        setIsPaymentModalOpen(false);
        return;
    }

    setIsPaying(true);

    try {
        // A. Transfer Funds
        const txHash = await transferUSDC(ANALYSIS_COST_USDC);

        // B. Payment Success: Close Payment Modal immediately
        setIsPaying(false);
        setIsPaymentModalOpen(false);

        // C. Open Analysis Loading Modal
        setAnalysisStatus('generating');
        setErrorMsg(null);
        setIsAnalysisModalOpen(true);

        // D. Perform Analysis (Client-side wait)
        const result = await analyzeEvent(event, false, txHash);

        if (result.error) {
            handleError(result.error);
        } else {
            handleSuccess(event.id);
        }
        
    } catch (error: any) {
        console.error("Payment flow error:", error);
        // If payment failed, stay on payment modal (or close it and alert)
        setIsPaying(false);
        setIsPaymentModalOpen(false); 
        alert(error.message || "Transaction failed");
    }
  };

  return (
    <>
        <button
          onClick={handleAnalyzeClick}
          className={`
            w-full mt-4 py-3 rounded-none font-bold uppercase tracking-widest text-sm transition-all shadow-lg
            flex items-center justify-center gap-2 border
            ${checking 
              ? "bg-zinc-900 text-orange-400 border-orange-900/20 cursor-wait min-h-[50px]" 
              : "bg-orange-600 hover:bg-orange-500 text-black border-orange-400 shadow-orange-900/20"
            }
          `}
        >
          {checking ? (
            <div className="flex items-center gap-3">
                <span className="text-[10px]">SCANNING...</span>
                <div className="flex gap-1">
                   <span className="animate-bounce delay-0 text-lg">🦀</span>
                   <span className="animate-bounce delay-75 text-lg">🦀</span>
                   <span className="animate-bounce delay-150 text-lg">🦀</span>
                </div>
            </div>
          ) : "☢️ DEPLOY_AGENT"}
        </button>

        {/* 1. Payment Modal */}
        <PaymentModal 
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            onConfirm={handlePaymentAndGenerate}
            isProcessing={isPaying}
            amount={ANALYSIS_COST_USDC}
            title="Trial Exhausted"
            description="You have used your free analysis. Deploy the agent again to generate a fresh deep-dive report including EV calculations."
        />

        {/* 2. Analysis Loading / Result Modal */}
        <AnalysisLoadingModal 
            isOpen={isAnalysisModalOpen}
            status={analysisStatus}
            resultUrl={resultUrl}
            errorMsg={errorMsg}
            onClose={() => setIsAnalysisModalOpen(false)}
        />
    </>
  );
}