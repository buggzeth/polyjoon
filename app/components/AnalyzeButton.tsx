// app/components/AnalyzeButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PolymarketEvent } from "../types/polymarket";
import { analyzeEvent } from "../actions/ai";
import { checkAnalysisExists } from "../actions/storage";
import { useTrading } from "../contexts/TradingContext";
import { ANALYSIS_COST_USDC } from "../lib/constants";
import PaymentModal from "./PaymentModal";
import CrabSpinner from "./CrabSpinner";

export default function AnalyzeButton({ event }: { event: PolymarketEvent }) {
  const [checking, setChecking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  
  const router = useRouter();
  const { transferUSDC, isReady } = useTrading();

  // 1. Initial Click: Attempt Free Trial first
  const handleAnalyzeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setChecking(true);
    
    try {
      // Step A: Check if DB has it already (Free & Fast)
      const alreadyAnalyzed = await checkAnalysisExists(event.id);

      if (alreadyAnalyzed) {
        router.push(`/analysis/result?eventId=${event.id}`);
        return;
      }

      // Step B: Attempt a FREE generation (Trial Mode)
      // We call analyzeEvent without a txHash. 
      // The server will check the cookie/IP.
      const result = await analyzeEvent(event, false);

      if (result.error === "TRIAL_EXHAUSTED") {
        // Step C: Trial used up? Open Payment Modal.
        setIsModalOpen(true);
      } else if (result.error) {
        // Actual error (API down, etc)
        alert("Analysis failed: " + result.error);
      } else {
        // Success (Free Trial Used)
        router.push(`/analysis/result?eventId=${event.id}`);
      }

    } catch (error) {
      console.error(error);
      alert("Something went wrong connecting to the agent.");
    } finally {
      setChecking(false);
    }
  };

  // 2. Modal Confirm: Pay & Execute (Bypass Trial Check)
  const handlePaymentAndGenerate = async () => {
    if (!isReady) {
        alert("Please connect your wallet and 'Enable Trading' to proceed.");
        setIsModalOpen(false);
        return;
    }

    setIsPaying(true);

    try {
        // A. Transfer
        const txHash = await transferUSDC(ANALYSIS_COST_USDC);

        // B. Generate (Passing txHash to bypass trial check)
        const result = await analyzeEvent(event, false, txHash);

        if (result.error) {
            throw new Error(result.error);
        }

        // C. Redirect
        router.push(`/analysis/result?eventId=${event.id}`);
        
    } catch (error: any) {
        console.error("Payment flow error:", error);
        alert(error.message || "Transaction failed");
        setIsPaying(false);
        setIsModalOpen(false); 
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
                <span className="text-[10px]">SCANNING</span>
                <div className="flex gap-1">
                   <span className="animate-bounce delay-0 text-lg">🦀</span>
                   <span className="animate-bounce delay-75 text-lg">🦀</span>
                   <span className="animate-bounce delay-150 text-lg">🦀</span>
                </div>
            </div>
          ) : "☢️ DEPLOY_AGENT"}
        </button>

        <PaymentModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onConfirm={handlePaymentAndGenerate}
            isProcessing={isPaying}
            amount={ANALYSIS_COST_USDC}
            title="Trial Exhausted"
            description="You have used your free analysis. Deploy the agent again to generate a fresh deep-dive report including EV calculations."
        />
    </>
  );
}