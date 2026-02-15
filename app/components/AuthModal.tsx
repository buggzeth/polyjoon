// app/components/AuthModal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { signIn } from "next-auth/react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signIn("google");
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-zinc-900  border border-amber-600/50 shadow-2xl p-8 overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
            <span className="text-3xl">☢️</span>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">
            Sign Up For Higher Limits
          </h2>
          <p className="text-sm text-zinc-400">
            Sign in to unlock more power for your agents.
          </p>
        </div>

        <div className="bg-zinc-950/50 p-4 border border-zinc-800 mb-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Guest Limit</span>
                <span className="text-zinc-400 font-mono">1 / Day</span>
            </div>
            <div className="flex items-center justify-between text-sm">
                <span className="text-orange-400 font-bold">Sign-up Bonus</span>
                <span className="text-orange-400 font-bold font-mono">5 / Day</span>
            </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-bold flex items-center justify-center gap-3 transition-colors mb-3"
        >
          {isLoading ? (
            <span className="animate-pulse">Connecting...</span>
          ) : (
            <>
              <span className="font-bold text-lg text-orange-600">G</span>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <button 
            onClick={onClose}
            className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 font-bold uppercase tracking-wider"
        >
            Cancel
        </button>

      </div>
    </div>,
    document.body
  );
}