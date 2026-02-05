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

  // 1. Initial Click: Check DB, Redirect or Open Modal
  const handleAnalyzeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setChecking(true);
    
    try {
      // Check DB lazily
      const alreadyAnalyzed = await checkAnalysisExists(event.id);

      if (alreadyAnalyzed) {
        // Free path
        router.push(`/analysis/result?eventId=${event.id}`);
      } else {
        // Paid path - Open Modal
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setChecking(false);
    }
  };

  // 2. Modal Confirm: Pay & Execute
  const handlePaymentAndGenerate = async () => {
    if (!isReady) {
        alert("Please connect your wallet and 'Enable Trading' to proceed.");
        setIsModalOpen(false);
        return;
    }

    setIsPaying(true);

    try {
        // A. Transfer
        await transferUSDC(ANALYSIS_COST_USDC);

        // B. Generate (force=false is safe as we know it's missing)
        await analyzeEvent(event, false);

        // C. Redirect
        router.push(`/analysis/result?eventId=${event.id}`);
        
        // Note: We don't close modal here immediately to prevent UI flash before nav
    } catch (error: any) {
        console.error("Payment flow error:", error);
        alert(error.message || "Transaction failed");
        setIsPaying(false);
        setIsModalOpen(false); // Close on error
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
            title="Unlock AI Analysis"
            description="This market has not been analyzed yet. Generate a fresh, deep-dive report including EV calculations and buy signals."
        />
    </>
  );
}