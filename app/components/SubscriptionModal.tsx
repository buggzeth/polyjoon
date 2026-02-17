// app/components/SubscriptionModal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SUBSCRIPTION_TIERS, Tier } from "../types/subscription";
import { useTrading } from "../contexts/TradingContext";
import { upgradeSubscription } from "../actions/subscription";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const [mounted, setMounted] = useState(false);
  const { transferUSDC, isReady, initializeSession } = useTrading();
  const { data: session } = useSession();
  const [processingTier, setProcessingTier] = useState<Tier | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleSubscribe = async (tierId: string) => {
    if (!session) {
        alert("Please sign in with Google first.");
        return;
    }

    const tier = SUBSCRIPTION_TIERS[tierId];
    setProcessingTier(tierId as Tier);

    try {
      if (!isReady) await initializeSession();

      // 1. Pay via Gnosis Safe
      console.log(`Initiating subscription for ${tier.name}...`);
      const txHash = await transferUSDC(tier.price);

      // 2. Update Server
      await upgradeSubscription(tierId as Tier, txHash);

      // 3. Refresh UI
      onClose();
      router.refresh();
      window.dispatchEvent(new Event("trial_updated")); // Force hooks to re-fetch
      
    } catch (e: any) {
      console.error(e);
      alert(`Subscription failed: ${e.message}`);
    } finally {
      setProcessingTier(null);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        
        {/* Left Panel */}
        <div className="p-6 md:w-1/3 bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col justify-between shrink-0">
          <div>
            <div className="text-orange-500 font-bold tracking-widest text-xs mb-2">ACCESS CONTROL</div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-4 uppercase italic leading-none">
              Upgrade<br/>Protocol
            </h2>
            <p className="text-zinc-400 text-xs leading-relaxed mb-4">
              Equip your agent with high-frequency capabilities. Subscriptions grant monthly generation quotas valid for 30 days.
            </p>
            {!session && (
                <div className="bg-red-900/20 border border-red-900/50 p-3 rounded text-red-200 text-xs">
                    ⚠️ You must be signed in with Google to subscribe.
                </div>
            )}
          </div>
          <div className="text-[10px] text-zinc-600 font-mono mt-4">
            Payments via Polygon USDC.<br/>Secured by Gnosis Safe.
          </div>
        </div>

        {/* Tiers Grid (Scrollable on mobile) */}
        <div className="p-6 md:w-2/3 bg-zinc-900/50 overflow-y-auto custom-scrollbar">
          <div className="grid gap-4">
            {Object.values(SUBSCRIPTION_TIERS).map((tier) => (
              <div 
                key={tier.id}
                className={`
                  relative p-4 rounded-xl border transition-all duration-200
                  ${processingTier === tier.id ? 'border-orange-500 bg-orange-950/10' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'}
                  ${processingTier && processingTier !== tier.id ? 'opacity-50 grayscale' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                      <h3 className="text-base font-bold text-white uppercase">{tier.name}</h3>
                      <div className="text-xs text-zinc-500">{tier.description}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-mono font-bold text-white">${tier.price}</span>
                    <span className="text-[10px] text-zinc-500 block">/30 DAYS</span>
                  </div>
                </div>

                <div className="w-full h-px bg-zinc-800 my-3"></div>

                <div className="flex items-center justify-between">
                    <div className="text-sm font-mono text-zinc-300">
                        <span className="text-white font-bold">{tier.limit}</span> Gens/Mo
                    </div>
                    <button
                        onClick={() => handleSubscribe(tier.id)}
                        disabled={!!processingTier || !session}
                        className={`
                            px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all
                            ${processingTier === tier.id 
                            ? 'bg-orange-600 text-white animate-pulse' 
                            : 'bg-white text-black hover:bg-orange-500 hover:text-white disabled:bg-zinc-800 disabled:text-zinc-600'}
                        `}
                    >
                        {processingTier === tier.id ? 'Processing...' : 'Select'}
                    </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onClose} className="w-full mt-4 text-center text-xs text-zinc-500 hover:text-white underline">
            Cancel
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}