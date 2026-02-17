// app/components/PaymentModal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import SubscriptionModal from "./SubscriptionModal"; // Requires SubscriptionModal.tsx to exist

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  amount: number;
  title: string;
  description: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  amount,
  title,
  description
}: PaymentModalProps) {
  const [mounted, setMounted] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    const handleSubscriptionSuccess = () => {
      // Close this parent modal when a subscription is successfully processed
      onClose();
    };

    window.addEventListener("trial_updated", handleSubscriptionSuccess);
    
    return () => {
      window.removeEventListener("trial_updated", handleSubscriptionSuccess);
    };
  }, [onClose]);

  // Handle nested modal closing logic
  const handleSubClose = () => {
      setShowSubModal(false);
      // Optional: If they subscribed successfully, you might want to close the parent modal too
      // But typically we leave that to the user or a success callback
  };

  if (!isOpen || !mounted) return null;

  // Render Subscription Modal on top if active
  if (showSubModal) {
      return <SubscriptionModal isOpen={true} onClose={handleSubClose} />;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="absolute inset-0" 
        onClick={!isProcessing ? onClose : undefined} 
      />

      <div className="relative w-full max-w-sm bg-zinc-900 border border-orange-900/20 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-orange-900/20 bg-zinc-900/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-xl">
               ✨
            </div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {description}
          </p>
        </div>

        {/* --- NEW: Subscription Upsell Section --- */}
        <div className="px-6 mt-4">
            <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-lg p-3 group hover:border-indigo-400/50 transition-colors">
                
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-black text-white uppercase tracking-wider">Upgrade</span>
                            <span className="text-[9px] bg-indigo-500 text-white px-1 rounded font-bold">PRO</span>
                        </div>
                        <div className="text-[10px] text-indigo-200">
                           Unlock up to <span className="text-white font-bold">500 gens/mo</span>.
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowSubModal(true)}
                        className="text-[10px] font-bold bg-white text-indigo-950 hover:bg-indigo-50 px-3 py-1.5 rounded shadow-lg shadow-indigo-900/20 transition-all transform active:scale-95"
                    >
                        VIEW PLANS
                    </button>
                </div>
                
                {/* Decorative sheen */}
                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-indigo-500/20 blur-xl rounded-full"></div>
            </div>
        </div>

        {/* Cost Breakdown (One-off) */}
        <div className="px-6 py-4">
            <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800/50">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">One-Time Run</span>
                    <span className="text-xl font-mono font-bold text-white">{amount} USDC</span>
                </div>
                <div className="text-[10px] text-slate-600 text-right">
                    Polygon Network
                </div>
            </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 rounded-sm text-sm font-bold text-zinc-400 hover:text-white hover:bg-orange-900/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 rounded-sm text-sm font-bold text-white bg-orange-600 hover:bg-indigo-500 disabled:bg-orange-900/20 disabled:text-slate-500 transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
                <>
                    <div className="animate-bounce">🦀</div>
                    <span>Processing...</span>
                </>
            ) : (
                <span>Confirm & Pay</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}