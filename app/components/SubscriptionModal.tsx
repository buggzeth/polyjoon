// app/components/SubscriptionModal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CREDIT_PACKAGES, PackageId } from "../types/subscription"; // Updated import
import { useTrading } from "../contexts/TradingContext";
import { purchaseCredits } from "../actions/subscription"; // Updated action
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
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handlePurchase = async (pkgId: string) => {
    if (!session) {
        alert("Please sign in first.");
        return;
    }

    const pkg = CREDIT_PACKAGES[pkgId];
    setProcessingId(pkgId);

    try {
      if (!isReady) await initializeSession();

      console.log(`Initiating purchase for ${pkg.name}...`);
      const txHash = await transferUSDC(pkg.price);

      await purchaseCredits(pkgId as PackageId, txHash);

      onClose();
      router.refresh();
      window.dispatchEvent(new Event("trial_updated")); 
      
    } catch (e: any) {
      console.error(e);
      alert(`Purchase failed: ${e.message}`);
    } finally {
      setProcessingId(null);
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
            <div className="text-orange-500 font-bold tracking-widest text-xs mb-2">STORE</div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-4 uppercase italic leading-none">
              Top Up<br/>Credits
            </h2>
            <p className="text-zinc-400 text-xs leading-relaxed mb-4">
              Credits never expire. Purchase in bulk to save on gas fees and ensure uninterrupted agent uptime.
            </p>
          </div>
          <div className="text-[10px] text-zinc-600 font-mono mt-4">
            Balance updates instantly after confirmation.
          </div>
        </div>

        {/* Packages Grid */}
        <div className="p-6 md:w-2/3 bg-zinc-900/50 overflow-y-auto custom-scrollbar">
          <div className="grid gap-4">
            {Object.values(CREDIT_PACKAGES).map((pkg) => (
              <div 
                key={pkg.id}
                className={`
                  relative p-4 rounded-xl border transition-all duration-200
                  ${processingId === pkg.id ? 'border-orange-500 bg-orange-950/10' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                      <h3 className="text-base font-bold text-white uppercase">{pkg.name}</h3>
                      <div className="text-xs text-zinc-500">{pkg.description}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-mono font-bold text-white">${pkg.price}</span>
                  </div>
                </div>

                <div className="w-full h-px bg-zinc-800 my-3"></div>

                <div className="flex items-center justify-between">
                    <div className="text-sm font-mono text-zinc-300">
                        <span className="text-white font-bold">{pkg.credits}</span> Credits
                        <span className="text-[10px] text-zinc-500 ml-2">(${(pkg.price / pkg.credits).toFixed(2)} / unit)</span>
                    </div>
                    <button
                        onClick={() => handlePurchase(pkg.id)}
                        disabled={!!processingId || !session}
                        className={`
                            px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all
                            ${processingId === pkg.id 
                            ? 'bg-orange-600 text-white animate-pulse' 
                            : 'bg-white text-black hover:bg-orange-500 hover:text-white disabled:bg-zinc-800 disabled:text-zinc-600'}
                        `}
                    >
                        {processingId === pkg.id ? 'Confirming...' : 'Buy'}
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