// app/components/TokenSelector.tsx
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { SupportedAsset } from "../types/bridge";
import { getChainIcon, getTokenIcon } from "../lib/icons";

interface TokenSelectorProps {
  assets: SupportedAsset[];
  selectedAsset: SupportedAsset | null;
  onSelect: (asset: SupportedAsset) => void;
  label: string;
}

// Internal helper for handling broken images
function IconWithFallback({ src, alt, className, fallback }: { src: string, alt: string, className: string, fallback: string }) {
    const [error, setError] = useState(false);

    // FIX: Reset error state when the image source changes so it tries to load the new one
    useEffect(() => {
        setError(false);
    }, [src]);

    // If the image fails to load, render a centered emoji in a colored box
    if (error) {
        return (
            <div className={`${className} flex items-center justify-center bg-orange-900/20 text-zinc-400 select-none leading-none overflow-hidden`} title={alt}>
                <span className={className.includes("w-4") ? "text-[8px]" : "text-sm"}>
                    {fallback}
                </span>
            </div>
        );
    }

    return (
        <img 
            src={src} 
            alt={alt} 
            className={className} 
            onError={() => setError(true)} 
        />
    );
}

export default function TokenSelector({ assets, selectedAsset, onSelect, label }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"CHAIN" | "TOKEN">("CHAIN");
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setStep("CHAIN");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const chains = useMemo(() => {
    const uniqueChains = new Map();
    assets.forEach(asset => {
      if (!uniqueChains.has(asset.chainId)) {
        uniqueChains.set(asset.chainId, {
            id: asset.chainId,
            name: asset.chainName
        });
      }
    });
    return Array.from(uniqueChains.values());
  }, [assets]);

  const tokensOnChain = useMemo(() => {
    if (!selectedChainId) return [];
    
    const allOnChain = assets.filter(a => a.chainId === selectedChainId);
    
    // Deduplicate by Symbol (Fix for double BTC)
    const uniqueMap = new Map();
    allOnChain.forEach(asset => {
        if (!uniqueMap.has(asset.token.symbol)) {
            uniqueMap.set(asset.token.symbol, asset);
        }
    });

    return Array.from(uniqueMap.values());
  }, [assets, selectedChainId]);

  const handleChainSelect = (chainId: string) => {
    setSelectedChainId(chainId);
    setStep("TOKEN");
  };

  const handleAssetSelect = (asset: SupportedAsset) => {
    onSelect(asset);
    setIsOpen(false);
    setStep("CHAIN");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
        {label}
      </label>
      
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-950 border border-orange-900/20 hover:border-slate-700 rounded-sm px-4 py-3 flex items-center justify-between transition-colors"
      >
        {selectedAsset ? (
          <div className="flex items-center gap-3">
             <div className="relative">
                <IconWithFallback
                    src={getTokenIcon(selectedAsset.token.symbol)} 
                    alt={selectedAsset.token.symbol}
                    className="w-8 h-8 rounded-full bg-zinc-900"
                    fallback="🪙"
                />
                <div className="absolute -bottom-1 -right-1 rounded-full border border-zinc-950 bg-zinc-900">
                    <IconWithFallback
                        src={getChainIcon(selectedAsset.chainName)} 
                        alt={selectedAsset.chainName}
                        className="w-4 h-4 rounded-full"
                        fallback="🌐"
                    />
                </div>
             </div>
             <div className="text-left">
                <div className="text-sm font-bold text-white">{selectedAsset.token.symbol}</div>
                <div className="text-[10px] text-zinc-400">on {selectedAsset.chainName}</div>
             </div>
          </div>
        ) : (
          <span className="text-slate-500 text-sm">Select Chain & Token</span>
        )}
        <svg className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-zinc-900 border border-orange-900/20 rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            
            {/* Header / Back Button */}
            {step === "TOKEN" && (
                <button 
                    onClick={() => setStep("CHAIN")}
                    className="w-full flex items-center gap-2 px-4 py-3 border-b border-orange-900/20 text-xs text-zinc-400 hover:text-white hover:bg-orange-900/20/50 transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    Back to Networks
                </button>
            )}

            <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                
                {/* VIEW 1: CHAINS */}
                {step === "CHAIN" && (
                    <div className="grid grid-cols-1 gap-1">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase">Select Network</div>
                        {chains.map((chain) => (
                            <button
                                key={chain.id}
                                onClick={() => handleChainSelect(chain.id)}
                                className="flex items-center gap-3 w-full px-3 py-2 rounded-sm hover:bg-orange-900/20 transition-colors group"
                            >
                                <IconWithFallback
                                    src={getChainIcon(chain.name)} 
                                    alt={chain.name}
                                    className="w-6 h-6 rounded-full group-hover:scale-110 transition-transform bg-zinc-900"
                                    fallback="🌐"
                                />
                                <span className="text-sm text-slate-200 font-medium">{chain.name}</span>
                                <svg className="ml-auto w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        ))}
                    </div>
                )}

                {/* VIEW 2: TOKENS */}
                {step === "TOKEN" && (
                    <div className="grid grid-cols-1 gap-1">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase">Select Asset</div>
                        {tokensOnChain.map((asset) => (
                            <button
                                key={asset.token.address}
                                onClick={() => handleAssetSelect(asset)}
                                className="flex items-center gap-3 w-full px-3 py-2 rounded-sm hover:bg-orange-900/20 transition-colors"
                            >
                                <IconWithFallback
                                    src={getTokenIcon(asset.token.symbol)} 
                                    alt={asset.token.symbol}
                                    className="w-6 h-6 rounded-full bg-zinc-900"
                                    fallback="🪙"
                                />
                                <div className="text-left">
                                    <div className="text-sm text-slate-200 font-medium">{asset.token.symbol}</div>
                                    <div className="text-[10px] text-slate-500">{asset.token.name}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}