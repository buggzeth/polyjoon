// app/components/ConnectWalletModal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Connector } from "wagmi";
import { getWalletIcon } from "../lib/icons";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectors: readonly Connector[];
  connect: (args: { connector: Connector }) => void;
}

export default function ConnectWalletModal({
  isOpen,
  onClose,
  connectors,
  connect,
}: ConnectWalletModalProps) {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch and ensure document exists
  useEffect(() => {
    setMounted(true);
    
    // Optional: Lock body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // Use createPortal to render this element at the end of document.body
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
      {/* Click outside to close */}
      <div 
        className="absolute inset-0" 
        onClick={onClose} 
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-zinc-900 border border-orange-900/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-orange-900/20 bg-zinc-900/50">
          <h2 className="text-lg font-bold text-white">Connect Wallet</h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded-md hover:bg-orange-900/20"
          >
            ✕
          </button>
        </div>

        {/* Connector List */}
        <div className="p-5 flex flex-col gap-3">
          {connectors
            .filter((connector) => connector.id !== 'injected') // Filter out generic injected
            .map((connector) => {
              const isReady = !!connector;
              
              return (
                <button
                  key={connector.uid}
                  onClick={() => {
                    connect({ connector });
                    onClose();
                  }}
                  disabled={!isReady}
                  className="flex items-center justify-between w-full p-3 text-left text-sm font-bold text-slate-200 bg-orange-900/20/50 hover:bg-orange-900/20 hover:text-white border border-slate-700/50 hover:border-indigo-500/50 rounded-sm transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <img 
                      src={getWalletIcon(connector.id)} 
                      alt={connector.name}
                      className="w-8 h-8 rounded-sm"
                      onError={(e) => {
                        // Fallback in case icon fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span>{connector.name}</span>
                  </div>
                  <span className="text-slate-600 group-hover:text-orange-400 transition-colors">
                    →
                  </span>
                </button>
              );
            })}

          {connectors.filter((c) => c.id !== 'injected').length === 0 && (
            <div className="text-center text-slate-500 py-4 text-sm">
              No wallets detected
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950/30 text-center border-t border-orange-900/20">
          <p className="text-xs text-slate-500">
            By connecting, you agree to the Terms of Service.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}