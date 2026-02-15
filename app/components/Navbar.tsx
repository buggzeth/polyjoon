// app/components/Navbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image"; 
import { useState, useEffect, ReactNode } from "react"; // Added ReactNode
import WalletHeader from "./WalletHeader";
import TrialIndicator from "./TrialIndicator";
import { usePathname } from "next/navigation";

// ADDED userAuthSlot prop
export default function Navbar({ userAuthSlot }: { userAuthSlot: ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);

  return (
    <>
      <nav className="border-b border-orange-900/30 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 md:px-6 h-14 flex items-center justify-between">
          
          {/* LEFT: Logo & Links */}
          <div className="flex items-center gap-4 shrink-0">
              <Link href="/" className="flex items-center gap-2 group">
                  <div className="relative w-8 h-8 transition-transform group-hover:rotate-12">
                    <Image 
                      src="/logo.png" 
                      alt="Logo" 
                      fill 
                      className="object-contain"
                      sizes="64px"
                    />
                  </div>
                  
                  <div className="hidden sm:flex flex-col">
                      <span className="text-lg font-black bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent tracking-tighter">
                          NUKE
                      </span>
                  </div>
              </Link>

              <div className="hidden md:block w-px h-6 bg-zinc-800 mx-1"></div>

              <div className="hidden md:flex gap-3">
                  <NavLink href="/" label="MARKETS" />
                  <NavLink href="/analysis/feed" label="FEED" highlight/>
                  <NavLink href="/bridge" label="BRIDGE"  />
                  <NavLink href="/profile" label="BETS" />
                  <NavLink href="/demo/agent" label="DEMO" />
              </div>
          </div>

          {/* RIGHT: Trial, Wallet, Auth, Mobile Toggle */}
          <div className="flex items-center gap-2">
              
              <div className="hidden sm:block">
                 <TrialIndicator />
              </div>

              {/* Wallet Header */}
              <div className="hidden md:block">
                <WalletHeader />
              </div>

              {/* --- NEW: Social Auth Slot --- */}
              <div className="hidden md:block">
                  {userAuthSlot}
              </div>

              {/* Mobile Menu Button */}
              <button 
                  className="md:hidden p-1.5 text-zinc-400 hover:text-white transition-colors"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                  {isMobileMenuOpen ? (
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
                  )}
              </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`
        fixed inset-0 bg-zinc-950 z-40 transition-transform duration-300 ease-in-out pt-16 px-6
        md:hidden flex flex-col gap-6
        ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}
      `}>
         <div className="flex flex-col gap-4 text-sm mt-4">
            <MobileNavLink href="/" label="MARKETS" />
            <MobileNavLink href="/analysis/feed" label="ANALYSIS FEED" highlight/>
            <MobileNavLink href="/bridge" label="BRIDGE FUNDS"  />
            <MobileNavLink href="/profile" label="MY BETS" />
            <MobileNavLink href="/demo/agent" label="DEMO" />
         </div>

         <div className="py-4 border-t border-b border-orange-900/20 flex justify-between items-center sm:hidden">
             <span className="text-xs font-bold text-zinc-500 uppercase">Daily Free Gen</span>
             <TrialIndicator />
         </div>
         
         {/* Mobile Auth Slot */}
         <div className="flex justify-center py-2">
            {userAuthSlot}
         </div>

         <div className="mt-auto mb-10 w-full flex flex-col items-center justify-center p-4 bg-zinc-900/20 rounded-t-xl border-t border-orange-900/20">
            <WalletHeader />
         </div>
      </div>
    </>
  );
}

function NavLink({ href, label, highlight }: { href: string; label: string; highlight?: boolean }) {
    return (
        <Link 
            href={href} 
            className={`text-[10px] font-bold transition-colors uppercase tracking-widest px-2 py-1 rounded hover:bg-zinc-900 ${
                highlight 
                ? "text-orange-500 hover:text-orange-400" 
                : "text-zinc-500 hover:text-zinc-300"
            }`}
        >
            {label}
        </Link>
    );
}

function MobileNavLink({ href, label, highlight }: { href: string; label: string; highlight?: boolean }) {
    return (
        <Link 
            href={href} 
            className={`py-3 border-b border-orange-900/10 font-bold uppercase tracking-wide ${
                highlight ? "text-orange-400" : "text-slate-300"
            }`}
        >
            {label}
        </Link>
    );
}