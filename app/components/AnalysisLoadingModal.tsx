// app/components/AnalysisLoadingModal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import CrabSpinner from "./CrabSpinner";

interface AnalysisLoadingModalProps {
  isOpen: boolean;
  status: 'generating' | 'ready' | 'error';
  resultUrl: string | null;
  errorMsg: string | null;
  onClose: () => void;
}

export default function AnalysisLoadingModal({
  isOpen,
  status,
  resultUrl,
  errorMsg,
  onClose
}: AnalysisLoadingModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-md bg-zinc-900 border border-orange-900/40 rounded-sm shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
        
        {/* --- STATE: GENERATING --- */}
        {status === 'generating' && (
          <div className="py-8 space-y-6">
            <CrabSpinner text="DEPLOYING AGENT..." size="lg" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-orange-50 animate-pulse">
                PINCHING ALPHA
              </h3>
              <p className="text-zinc-500 text-sm font-mono max-w-xs mx-auto">
                Scanning orderbook, parsing news, and calculating EV. This may take up to a few minutes. Please keep this page open.
              </p>
            </div>
          </div>
        )}

        {/* --- STATE: READY --- */}
        {status === 'ready' && resultUrl && (
          <div className="py-4 space-y-6 w-full">
            <div className="w-16 h-16 rounded-full bg-emerald-900/20 border border-emerald-500/50 flex items-center justify-center text-3xl mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              ☢️
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">
                INTELLIGENCE ACQUIRED
              </h3>
              <p className="text-zinc-400 text-sm font-mono">
                Report generated successfully.
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <Link 
                href={resultUrl} 
                target="_blank"
                onClick={onClose}
                className="block w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-lg uppercase tracking-widest rounded-sm shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02]"
              >
                Open Report ↗
              </Link>
              
              <button 
                onClick={onClose}
                className="text-xs text-zinc-600 hover:text-zinc-400 font-mono underline decoration-zinc-800 underline-offset-4"
              >
                CLOSE AND STAY HERE
              </button>
            </div>
          </div>
        )}

        {/* --- STATE: ERROR --- */}
        {status === 'error' && (
           <div className="py-4 space-y-6">
             <div className="text-4xl">💀</div>
             <div className="space-y-2">
               <h3 className="text-xl font-bold text-rose-500">MISSION FAILED</h3>
               <p className="text-zinc-400 text-sm font-mono max-w-xs mx-auto">
                 {errorMsg || "Unknown error occurred during deployment."}
               </p>
             </div>
             <button
               onClick={onClose}
               className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-sm border border-zinc-700"
             >
               DISMISS
             </button>
           </div>
        )}

      </div>
    </div>,
    document.body
  );
}