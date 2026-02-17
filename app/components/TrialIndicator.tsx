// app/components/TrialIndicator.tsx
"use client";
import { useTrialLimit } from "../hooks/useTrialLimit";
import TrialInfoModal from "./TrialInfoModal";
import { useState } from "react";

export default function TrialIndicator() {
  const { remaining, limit, isAvailable, isSubscribed } = useTrialLimit();
  const [showModal, setShowModal] = useState(false);

  // Formatting
  const displayText = isSubscribed 
    ? `${remaining} LEFT` 
    : (isAvailable ? `${remaining}/${limit} DAILY` : `0/${limit}`);

  const styles = isSubscribed 
    ? "text-indigo-400 border-indigo-500/30" 
    : (isAvailable ? "text-lime-400 border-zinc-800" : "text-zinc-500 border-zinc-800");

  return (
    <>
        <div className={`flex items-center gap-1.5 bg-zinc-900 border rounded-full pl-2 pr-1 py-0.5 h-7 ${styles.split(' ')[1]}`}>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold tracking-wider font-mono select-none ${styles.split(' ')[0]}`}>
                <span className={isAvailable ? "animate-pulse" : ""}>
                    {isSubscribed ? "★" : (isAvailable ? "●" : "○")}
                </span>
                <span className="whitespace-nowrap">{displayText}</span>
            </div>
            
            <div className="h-3 w-px bg-zinc-800 mx-0.5"></div>

            <button onClick={() => setShowModal(true)} className="w-4 h-4 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-zinc-700 text-[9px] font-serif">
                i
            </button>
        </div>
        <TrialInfoModal isOpen={showModal} onClose={() => setShowModal(false)} nextRefill={null} />
    </>
  );
}