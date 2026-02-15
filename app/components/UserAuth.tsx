// app/components/UserAuth.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import AuthModal from "./AuthModal";
import { useTrialLimit } from "../hooks/useTrialLimit";

export default function UserAuth() {
  const { data: session } = useSession();
  
  // UI States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Data Hook
  const { remaining, limit, percent, nextRefillText } = useTrialLimit();
  
  // Click Outside Logic
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. LOGGED IN STATE
  if (session?.user) {
    return (
      <div className="relative pl-3 border-l border-zinc-800">
        
        {/* AVATAR TRIGGER */}
        <div className="flex items-center gap-3">
            <div className="text-right">
                <div className="text-[10px] uppercase text-zinc-500 font-bold">Welcome</div>
                <div className="text-xs font-bold text-slate-200">{session.user.name}</div>
            </div>
            
            <button 
                ref={buttonRef}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`
                    relative w-8 h-8 rounded-full overflow-hidden border transition-all duration-200
                    ${isMenuOpen ? "border-orange-500 ring-2 ring-orange-500/20" : "border-zinc-700 hover:border-orange-500"}
                `}
            >
                {session.user.image ? (
                    <Image 
                        src={session.user.image} 
                        alt="User" 
                        fill 
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 font-bold">
                        {session.user.name?.charAt(0) || "U"}
                    </div>
                )}
            </button>
        </div>

        {/* USER MENU (Dropdown/Modal) */}
        {isMenuOpen && (
            <>
                {/* Mobile Backdrop (closes menu) */}
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMenuOpen(false)} />

                <div 
                    ref={menuRef}
                    className={`
                        z-50 bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col
                        
                        fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                        w-[90%] max-w-sm rounded-2xl 
                        animate-in zoom-in-95 duration-200

                        md:absolute md:top-full md:right-0 md:left-auto md:translate-x-0 md:translate-y-0 
                        md:mt-4 md:w-72 md:max-w-none md:rounded-xl 
                        md:origin-top-right md:animate-in md:fade-in md:zoom-in-95
                    `}
                >
                    {/* Header */}
                    <div className="p-4 bg-zinc-900/50 border-b border-zinc-800 flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full overflow-hidden relative border border-zinc-700 shrink-0">
                            {session.user.image && <Image src={session.user.image} alt="User" fill className="object-cover" />}
                         </div>
                         <div className="overflow-hidden min-w-0">
                             <div className="text-sm font-bold text-white truncate">{session.user.name}</div>
                             <div className="text-[10px] font-mono text-zinc-500 truncate">{session.user.email}</div>
                         </div>
                    </div>

                    {/* Body: Stats */}
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Daily Fuel</span>
                                <span className="text-xs font-mono font-bold text-orange-400">{remaining}/{limit}</span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${remaining === 0 ? "bg-red-500" : "bg-gradient-to-r from-orange-600 to-yellow-500"}`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <div className="text-[9px] text-zinc-600 text-right font-mono uppercase">
                                <span className="text-zinc-400">{nextRefillText}</span>
                            </div>
                        </div>

                        <div className="p-3 bg-zinc-900 rounded border border-zinc-800/50">
                             <div className="flex items-center gap-2 mb-1">
                                <span className="text-emerald-500 text-xs">●</span>
                                <span className="text-xs font-bold text-zinc-300">Operator Tier</span>
                             </div>
                             <p className="text-[10px] text-zinc-500 leading-relaxed">
                                You have access to extended compute and 5 daily generations.
                             </p>
                        </div>
                    </div>

                    {/* Footer: Actions */}
                    <div className="p-2 bg-zinc-900 border-t border-zinc-800 grid grid-cols-1">
                        <button 
                            onClick={() => {
                                setIsMenuOpen(false);
                                setShowLogoutConfirm(true);
                            }}
                            className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                            SIGN OUT
                        </button>
                    </div>
                </div>
            </>
        )}

        {/* LOGOUT CONFIRMATION MODAL (Always Fixed Centered) */}
        {showLogoutConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-xs bg-zinc-900 border border-red-900/50 shadow-2xl p-6 rounded-lg animate-in zoom-in-95 text-center">
                    <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" x2="12" y1="2" y2="12"/></svg>
                    </div>
                    
                    <h3 className="text-lg font-bold text-white mb-2">End Session?</h3>
                    <p className="text-xs text-zinc-400 mb-6">
                        You will need to sign in again to access your operator dashboard.
                    </p>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowLogoutConfirm(false)}
                            className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded transition-colors"
                        >
                            CANCEL
                        </button>
                        <button 
                            onClick={() => signOut()}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded transition-colors shadow-lg shadow-red-900/20"
                        >
                            CONFIRM
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    );
  }

  // 2. GUEST STATE (Login Button)
  return (
    <>
      <button 
        onClick={() => setIsAuthModalOpen(true)}
        className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold py-1.5 px-3 rounded border border-zinc-700 transition-all whitespace-nowrap"
      >
        <span className="text-orange-500">G</span> Sign In
      </button>
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
}