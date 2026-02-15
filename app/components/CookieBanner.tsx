// app/components/CookieBanner.tsx
"use client";

import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user has seen the banner
    const seen = localStorage.getItem("nuke_cookie_seen");
    if (!seen) {
      // Delay slightly for dramatic effect
      setTimeout(() => setIsVisible(true), 1000);

      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("nuke_cookie_seen", "true");
  };

  if (!mounted) return null;

  return (
    <div 
      className={`
        fixed bottom-4 right-4 z-[100] max-w-sm w-[calc(100%-2rem)]
        transform transition-all duration-700 ease-in-out
        ${isVisible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"}
      `}
    >
      <div className="bg-zinc-950 border border-orange-500/30 p-4 rounded-sm shadow-[0_0_30px_-5px_rgba(234,88,12,0.15)] relative overflow-hidden group">
        
        {/* Loading Bar at top */}
        <div className="absolute top-0 left-0 h-0.5 bg-orange-600 animate-[width_8s_linear_forwards] w-full origin-left" />

        <div className="flex items-start gap-4">
          <div className="text-xl animate-pulse">🍪</div>
          
          <div className="flex-1">
            <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">
              Cookie Notice
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              This terminal collects cookies to track your daily free rations and optimize orderbook latency. 
              <br />
              <span className="opacity-50 mt-1 block">Proceeding implies consent.</span>
            </p>
          </div>

          <button 
            onClick={handleDismiss}
            className="text-zinc-500 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>
        
        {/* Background Scanline effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-[-1] opacity-20"></div>
      </div>
    </div>
  );
}