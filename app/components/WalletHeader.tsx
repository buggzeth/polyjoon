// app/components/WalletHeader.tsx
"use client";

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi';
import { formatUnits, erc20Abi } from 'viem'; 
import { useTrading } from '../contexts/TradingContext';
import ConnectWalletModal from './ConnectWalletModal';
import { USDC_E_ADDRESS, POLYGON_CHAIN_ID } from '../lib/constants'; 

const getStepMessage = (step: string) => {
    switch (step) {
        case "checking": return "Checking Safe...";
        case "deploying": return "Deploying Safe...";
        case "approvals": return "Approving Tokens...";
        case "credentials": return "Signing In...";
        default: return "Initializing...";
    }
}

export default function WalletHeader() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  const { isReady, isLoading, initializeSession, error, sessionStep, safeAddress, logout } = useTrading();
  
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Read Balance
  const { data: rawBalance } = useReadContract({
    address: USDC_E_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: safeAddress ? [safeAddress as `0x${string}`] : undefined,
    chainId: POLYGON_CHAIN_ID, 
    query: {
        enabled: !!safeAddress && isReady,
        refetchInterval: 10_000, 
    }
  });

  const copySafeAddress = () => {
    if (safeAddress) {
      navigator.clipboard.writeText(safeAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper to format balance - Round down to 2 decimals
  const formattedBalance = rawBalance 
    ? (Math.floor(parseFloat(formatUnits(rawBalance, 6)) * 100) / 100).toFixed(2)
    : "0.00";

  // 1. CONNECTED STATE
  if (isConnected && address) {
    return (
      <div className="flex flex-col md:flex-row items-center gap-3 md:gap-2 w-full md:w-auto">
        
        {/* TRADING WALLET (SAFE) */}
        {isReady && safeAddress && (
            <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-1 md:gap-2 bg-emerald-950/40 border border-emerald-500/30 rounded-md md:rounded-sm p-1 pr-2 md:p-1 md:pr-3">
                 <button 
                    onClick={copySafeAddress}
                    className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1 hover:bg-lime-900/40 rounded-sm transition-all cursor-copy text-left"
                    title="Click to copy Safe Address"
                >
                    {/* Animated Dot - Desktop Only */}
                    <div className="relative hidden md:block">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-lime-400 blur-sm opacity-50" />
                    </div>

                    <div className="flex flex-col">
                        {/* Label - Visible on Mobile now too, but small */}
                        <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5 whitespace-nowrap">
                            {copied ? "Copied!" : "Trading Safe"}
                        </div>

                        {/* Address & Balance Row */}
                        <div className="flex items-center gap-2">
                             {/* Address */}
                            <span className="text-xs font-mono text-emerald-100">
                                {safeAddress.slice(0, 4)}...{safeAddress.slice(-4)}
                            </span>
                            
                            {/* Balance */}
                            <span className="text-xs font-bold text-lime-400 bg-emerald-500/10 px-1.5 rounded border border-emerald-500/20">
                                ${formattedBalance}
                            </span>
                        </div>
                    </div>
                </button>

                {/* LOGOUT BUTTON */}
                <button 
                    onClick={logout}
                    className="text-[10px] font-bold text-emerald-500 hover:text-rose-400 hover:bg-rose-950/50 border-l border-emerald-500/20 pl-3 py-1 transition-colors flex items-center justify-center h-full"
                    title="End Session"
                >
                   <span>END SESSION</span>
                </button>
            </div>
        )}

        {/* SIGNER WALLET (EOA) & CONTROLS */}
        <div className="flex flex-col md:items-end items-center gap-2 md:gap-1 w-full md:w-auto">
            
            {/* Signer Info - Visible on Mobile now */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end">
                <div className="text-[10px] text-slate-500 font-mono bg-zinc-900 px-2 py-1 rounded border border-orange-900/20">
                    Signer: {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                <button 
                    onClick={() => disconnect()} 
                    className="text-xs text-slate-500 hover:text-rose-400 font-bold transition-colors px-1 p-1 bg-zinc-900 md:bg-transparent rounded border border-zinc-800 md:border-none"
                    aria-label="Disconnect Signer"
                >
                    ✕
                </button>
            </div>

            {/* Enable Trading Button (If not ready) */}
            {!isReady && (
                <button
                    onClick={initializeSession}
                    disabled={isLoading}
                    className="w-full md:w-auto text-xs bg-orange-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md font-bold transition-colors shadow-lg shadow-indigo-900/20 disabled:bg-slate-700 disabled:cursor-wait whitespace-nowrap"
                >
                    {isLoading ? getStepMessage(sessionStep) : "Enable Trading"}
                </button>
            )}
            
            {/* Error Feedback */}
            {error && (
                <div className="text-[10px] text-rose-400 bg-rose-950/30 px-2 py-1 rounded border border-rose-900/50 max-w-[200px] text-center md:text-right">
                    {error}
                </div>
            )}
        </div>
      </div>
    );
  }

  // 2. DISCONNECTED STATE - Full width on mobile
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full md:w-auto bg-slate-100 hover:bg-white text-zinc-900 text-xs font-bold py-2 px-5 rounded-full transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] whitespace-nowrap"
      >
        Connect Wallet
      </button>

      <ConnectWalletModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        connectors={connectors}
        connect={connect}
      />
    </>
  );
}