// app/components/PaymentModal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

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

        {/* Cost Breakdown */}
        <div className="p-6 bg-zinc-950/30">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total Cost</span>
                <span className="text-2xl font-mono font-bold text-white">{amount} USDC</span>
            </div>
            <div className="text-xs text-slate-600 text-right">
                Polygon Network
            </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-4 flex gap-3">
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
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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