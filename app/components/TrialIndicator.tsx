// app/components/TrialIndicator.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import TrialInfoModal from "./TrialInfoModal";
import { useTrialLimit } from "../hooks/useTrialLimit";

export default function TrialIndicator() {
  const { data: session } = useSession();
  const { remaining, limit, isAvailable, nextRefillText } = useTrialLimit();
  const [showModal, setShowModal] = useState(false);

  // Format text based on availability
  const displayText = isAvailable 
    ? `${remaining}/${limit} DAILY` 
    : (session ? `0/${limit}` : nextRefillText);

  return (
    <>
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full pl-2 pr-1 py-0.5 h-7">
            {/* Status Pill */}
            <div className={`
                flex items-center gap-1.5 text-[10px] font-bold tracking-wider font-mono select-none
                ${isAvailable ? "text-lime-400" : "text-zinc-500"}
            `}>
                <span className={isAvailable ? "animate-pulse" : ""}>
                    {isAvailable ? "●" : "○"}
                </span>
                <span className="whitespace-nowrap">
                    {displayText}
                </span>
            </div>

            <div className="h-3 w-px bg-zinc-800 mx-0.5"></div>

            <button 
                onClick={() => setShowModal(true)}
                className="w-4 h-4 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-zinc-700 text-[9px] font-serif transition-colors"
                aria-label="Trial Info"
            >
                i
            </button>
        </div>

        <TrialInfoModal 
            isOpen={showModal} 
            onClose={() => setShowModal(false)} 
            nextRefill={!isAvailable && !session ? nextRefillText : null}
        />
    </>
  );
}