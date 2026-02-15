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
  const [paymentModalContent, setPaymentModalContent] = useState({ title: "", description: "" });
  const [isPaying, setIsPaying] = useState(false);

  // Analysis Loading/Result Modal State
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<'generating' | 'ready' | 'error'>('generating');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { transferUSDC, isReady } = useTrading();

  const handleSuccess = (eventId: string) => {
    setResultUrl(`/analysis/result?eventId=${eventId}`);
    setAnalysisStatus('ready');
  };

  const handleError = (msg: string) => {
    setErrorMsg(msg);
    setAnalysisStatus('error');
  };

  const handleAnalyzeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setChecking(true);
    
    try {
      const alreadyAnalyzed = await checkAnalysisExists(event.id);

      if (alreadyAnalyzed) {
        setChecking(false);
        setAnalysisStatus('ready');
        setResultUrl(`/analysis/result?eventId=${event.id}`);
        setIsAnalysisModalOpen(true);
        return;
      }

      setIsAnalysisModalOpen(true);
      setAnalysisStatus('generating');
      setErrorMsg(null);

      const result = await analyzeEvent(event, false);

      // FIX: Handle both trial and daily limit errors by showing payment modal
      if (result.error === "TRIAL_EXHAUSTED" || result.error === "DAILY_LIMIT_REACHED") {
        setIsAnalysisModalOpen(false);
        // Set context-specific text for the modal
        if (result.error === "TRIAL_EXHAUSTED") {
            setPaymentModalContent({
                title: "Trial Exhausted",
                description: "You have used your free analysis. Deploy the agent again to generate a fresh deep-dive report."
            });
        } else { // DAILY_LIMIT_REACHED
             setPaymentModalContent({
                title: "Daily Limit Reached",
                description: "You've used your 5 free analyses for the day. You can purchase additional runs to continue."
            });
        }
        setIsPaymentModalOpen(true);
      } else if (result.error) {
        handleError(result.error);
      } else {
        window.dispatchEvent(new Event("trial_updated"));
        handleSuccess(event.id);
      }

    } catch (error: any) {
      console.error(error);
      handleError(error.message || "Connection failed");
    } finally {
      setChecking(false);
    }
  };

  // handlePaymentAndGenerate is unchanged
  const handlePaymentAndGenerate = async () => {
    if (!isReady) {
        alert("Please connect your wallet and 'Enable Trading' to proceed.");
        setIsPaymentModalOpen(false);
        return;
    }

    setIsPaying(true);

    try {
        const txHash = await transferUSDC(ANALYSIS_COST_USDC);
        
        setIsPaying(false);
        setIsPaymentModalOpen(false);

        setAnalysisStatus('generating');
        setErrorMsg(null);
        setIsAnalysisModalOpen(true);

        const result = await analyzeEvent(event, false, txHash);

        if (result.error) {
            handleError(result.error);
        } else {
            handleSuccess(event.id);
        }
        
    } catch (error: any) {
        console.error("Payment flow error:", error);
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

        <PaymentModal 
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            onConfirm={handlePaymentAndGenerate}
            isProcessing={isPaying}
            amount={ANALYSIS_COST_USDC}
            title={paymentModalContent.title}
            description={paymentModalContent.description}
        />

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