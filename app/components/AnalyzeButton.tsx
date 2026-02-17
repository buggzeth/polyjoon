// app/components/AnalyzeButton.tsx
"use client";

import { useState, useEffect } from "react";
import { PolymarketEvent } from "../types/polymarket";
import { analyzeEvent } from "../actions/ai";
import { checkAnalysisExists } from "../actions/storage";
import { useTrading } from "../contexts/TradingContext";
import { ANALYSIS_COST_USDC } from "../lib/constants";
import PaymentModal from "./PaymentModal";
import AnalysisLoadingModal from "./AnalysisLoadingModal";

export default function AnalyzeButton({ event, hasAnalysis = false }: { event: PolymarketEvent; hasAnalysis?: boolean }) {
  // 1. Local state to track analysis status immediately (reacts to prop + local action)
  const [isAnalyzed, setIsAnalyzed] = useState(hasAnalysis);

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

  const { transferUSDC, isReady, initializeSession } = useTrading();

  // 2. Sync local state if parent prop changes (e.g. filters update)
  useEffect(() => {
    setIsAnalyzed(hasAnalysis);
  }, [hasAnalysis]);

  const handleSuccess = (eventId: string) => {
    setIsAnalyzed(true); // Update button immediately
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
    
    // Quick check: If we already know it's analyzed, just open the modal
    if (isAnalyzed) {
        setResultUrl(`/analysis/result?eventId=${event.id}`);
        setAnalysisStatus('ready');
        setIsAnalysisModalOpen(true);
        return;
    }

    setChecking(true);
    
    try {
      // Double check DB (in case another user analyzed it since page load)
      const alreadyAnalyzed = await checkAnalysisExists(event.id);

      if (alreadyAnalyzed) {
        setIsAnalyzed(true); // Update local state
        setChecking(false);
        setAnalysisStatus('ready');
        setResultUrl(`/analysis/result?eventId=${event.id}`);
        setIsAnalysisModalOpen(true);
        return;
      }

      // If not analyzed, open modal and start generation
      setIsAnalysisModalOpen(true);
      setAnalysisStatus('generating');
      setErrorMsg(null);

      // Attempt analysis (will fail if limits reached)
      const result = await analyzeEvent(event, false);

      // --- ERROR HANDLING & PAYMENT TRIGGER ---
      // We check for all 3 conditions: Guest Trial, Daily Limit, or Credit Exhaustion
      if (
          result.error === "TRIAL_EXHAUSTED" || 
          result.error === "DAILY_LIMIT_REACHED" || 
          result.error === "INSUFFICIENT_CREDITS"
      ) {
        setIsAnalysisModalOpen(false); // Close the "Generating..." modal
        
        // Determine Message based on error type
        if (result.error === "TRIAL_EXHAUSTED") {
            setPaymentModalContent({
                title: "Trial Exhausted",
                description: "You have used your free guest analysis. Sign in for daily free runs, or pay to proceed."
            });
        } else if (result.error === "INSUFFICIENT_CREDITS") {
            setPaymentModalContent({
                title: "Credits Depleted",
                description: "You have used all your available credits. Purchase a single run now or top up your balance."
            });
        } else {
             setPaymentModalContent({
                title: "Daily Limit Reached",
                description: "You've used your 5 free analyses for the day. You can purchase additional runs or credits to continue."
            });
        }
        
        setIsPaymentModalOpen(true); // Open Payment Modal
      
      } else if (result.error) {
        // Generic Error (API failure, etc)
        handleError(result.error);
      } else {
        // Success
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

  const handlePaymentAndGenerate = async () => {
    if (!isReady) {
        // Attempt to init session if not ready, or alert user
        try {
            await initializeSession();
        } catch(e) {
            alert("Please connect your wallet and 'Enable Trading' to proceed.");
            setIsPaymentModalOpen(false);
            return;
        }
    }

    setIsPaying(true);

    try {
        const txHash = await transferUSDC(ANALYSIS_COST_USDC);
        
        setIsPaying(false);
        setIsPaymentModalOpen(false);

        // Re-open analysis modal now that we are paying
        setAnalysisStatus('generating');
        setErrorMsg(null);
        setIsAnalysisModalOpen(true);

        // Pass the payment hash to bypass limits
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
            w-full py-3 rounded-none font-bold uppercase tracking-widest text-sm transition-all shadow-lg
            flex items-center justify-center gap-2 border
            ${checking 
              ? "bg-zinc-900 text-orange-400 border-orange-900/20 cursor-wait min-h-[50px]" 
              : isAnalyzed
                ? "bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
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
          ) : isAnalyzed ? (
            <div className="flex items-center gap-2">
               <span>📄</span>
               <span>VIEW ANALYSIS</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
               <span>☢️</span>
               <span>DEPLOY AGENT</span>
            </div>
          )}
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