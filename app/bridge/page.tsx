// app/bridge/page.tsx
"use client";

import BridgeWidget from "../components/BridgeWidget";
import { useAccount } from "wagmi";

export default function BridgePage() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
                Asset Bridge
            </h1>
            <p className="text-zinc-400 text-sm max-w-xl mx-auto">
                Seamlessly move assets between external chains (Ethereum, Solana, Bitcoin) and your PolyAI Trading Safe (Polygon).
            </p>
        </div>

        {/* Content */}
        {isConnected ? (
             <BridgeWidget />
        ) : (
            <div className="text-center py-20 bg-zinc-900/50 border border-orange-900/20 rounded-2xl">
                <p className="text-zinc-400 font-bold">Please connect your wallet to use the Bridge.</p>
            </div>
        )}

        {/* FAQs / Info */}
        <div className="mt-12 grid md:grid-cols-3 gap-6 text-xs text-slate-500">
            <div className="bg-zinc-900/30 p-4 rounded-sm border border-orange-900/20/50">
                <strong className="text-slate-300 block mb-1">How it works</strong>
                Deposits are automatically swapped to USDC.e and credited to your Trading Safe on Polygon.
            </div>
            <div className="bg-zinc-900/30 p-4 rounded-sm border border-orange-900/20/50">
                <strong className="text-slate-300 block mb-1">Withdrawals</strong>
                You can withdraw your USDC.e profits to any supported chain. The bridge handles the conversion and gas.
            </div>
            <div className="bg-zinc-900/30 p-4 rounded-sm border border-orange-900/20/50">
                <strong className="text-slate-300 block mb-1">Wait Times</strong>
                Most bridges complete in 2-5 minutes. Large amounts may require extra confirmation time.
            </div>
        </div>

      </div>
    </main>
  );
}