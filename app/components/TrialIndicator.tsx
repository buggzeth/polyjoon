// app/components/TrialIndicator.tsx
"use client";
import { useTrialLimit } from "../hooks/useTrialLimit";
import TrialInfoModal from "./TrialInfoModal";
import { useState } from "react";

export default function TrialIndicator() {
  const { mode, credits, remaining, limit, isAvailable, statusText } = useTrialLimit();
  const [showModal, setShowModal] = useState(false);

  // Helper to determine active state style
  const isCreditMode = mode === 'credits';

  // Formatting logic
  let displayText = "";
  if (isCreditMode) {
    displayText = `${credits} CR`; // Show Credit Balance
  } else {
    // Show Daily Limit (e.g. "4/5")
    displayText = `${remaining}/${limit}`; 
  }

  // Styling logic
  const styles = isCreditMode 
    ? "text-indigo-400 border-indigo-500/30" // Premium/Credit look
    : (isAvailable ? "text-lime-400 border-zinc-800" : "text-zinc-500 border-zinc-800"); // Standard/Empty

  return (
    <>
        <div className={`flex items-center gap-1.5 bg-zinc-900 border rounded-full pl-2 pr-1 py-0.5 h-7 ${styles.split(' ')[1]}`}>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold tracking-wider font-mono select-none ${styles.split(' ')[0]}`}>
                <span className={isAvailable || isCreditMode ? "animate-pulse" : ""}>
                    {isCreditMode ? "★" : (isAvailable ? "●" : "○")}
                </span>
                <span className="whitespace-nowrap">{displayText}</span>
            </div>
            
            <div className="h-3 w-px bg-zinc-800 mx-0.5"></div>

            <button 
                onClick={() => setShowModal(true)} 
                className="w-4 h-4 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-zinc-700 text-[9px] font-serif"
            >
                i
            </button>
        </div>
        
        {/* Pass statusText as nextRefill for the modal */}
        <TrialInfoModal isOpen={showModal} onClose={() => setShowModal(false)} nextRefill={statusText} />
    </>
  );
}