// app/components/TrialInfoModal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";

interface TrialInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextRefill: string | null;
}

export default function TrialInfoModal({ isOpen, onClose, nextRefill }: TrialInfoModalProps) {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-zinc-900 border border-orange-500/30 shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="text-2xl">☢️</div>
                <h2 className="text-lg font-black text-white uppercase tracking-tighter">
                    FUEL
                </h2>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
            The Agent consumes high-performance compute to scan orderbooks and calculate Real-Time EV.
        </p>

        <div className="bg-zinc-950/50 p-4 border border-zinc-800 mb-6 space-y-3">
            <div className="flex items-start gap-3">
                <span className={`font-bold text-xs mt-0.5 ${!session ? "text-lime-400" : "text-zinc-600"}`}>
                    {!session ? "●" : "✓"}
                </span>
                <span className="text-xs text-slate-300">
                    <strong className="text-white block mb-0.5">Guest Mode</strong>
                    1 Free Analysis per 24h
                </span>
            </div>
            
            <div className="flex items-start gap-3">
                <span className={`font-bold text-xs mt-0.5 ${session ? "text-lime-400" : "text-zinc-600"}`}>
                     {session ? "●" : "○"}
                </span>
                <div className="text-xs text-slate-300 w-full">
                    <div className="flex justify-between">
                        <strong className="text-white block mb-0.5">Operator Mode</strong>
                        {!session && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1">RECOMMENDED</span>}
                    </div>
                    Login with your email to receive 5 free generations every 24 hours.
                </div>
            </div>

            <div className="flex items-start gap-3">
                <span className="text-orange-500 font-bold text-xs mt-0.5">→</span>
                <span className="text-xs text-slate-300">
                    <strong className="text-white block mb-0.5">Pay-As-You-Go</strong>
                    Unlimited extra runs for 1 USDC.
                </span>
            </div>
        </div>

        {nextRefill && (
            <div className="bg-orange-950/20 p-3 border border-orange-900/30 text-center mb-4">
                <div className="text-[10px] uppercase text-orange-500/70 font-bold mb-1">Cooldown Active</div>
                <div className="text-xl font-mono text-orange-400 font-bold tracking-widest">{nextRefill}</div>
            </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-zinc-100 hover:bg-white text-black font-bold uppercase tracking-wide text-xs transition-colors"
        >
          Close
        </button>

      </div>
    </div>,
    document.body
  );
}