// app/components/Navbar.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import WalletHeader from "./WalletHeader";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);

  return (
    <>
      {/* Darker Zinc background, Orange border */}
      <nav className="border-b border-orange-900/30 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          
          {/* Left: Logo */}
          <div className="flex items-center gap-8 shrink-0">
              <Link href="/" className="flex items-center gap-2 group">
                  <span className="text-2xl">🦀</span>
                  <div className="flex flex-col">
                      <span className="text-xl font-black bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent tracking-tighter group-hover:animate-pulse">
                          NUKE.FARM
                      </span>
                  </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex gap-6">
                  <NavLink href="/" label="THE_FEED" />
                  <NavLink href="/analysis/feed" label="BRAIN_DUMP" highlight/>
                  <NavLink href="/bridge" label="WORMHOLE"  />
                  <NavLink href="/profile" label="STASH" />
              </div>
          </div>

          {/* Right: Wallet & Mobile Toggle */}
          <div className="flex items-center gap-3 md:gap-4">
              {/* Wallet Header */}
              <WalletHeader />

              {/* Mobile Menu Button */}
              <button 
                  className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Toggle menu"
              >
                  {isMobileMenuOpen ? (
                     // X Icon
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  ) : (
                     // Burger Icon
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
                  )}
              </button>
          </div>
        </div>
      </nav>

      {/* 
          Mobile Menu Overlay - Placed OUTSIDE the <nav>.
          z-40 ensures it sits just below the Navbar (z-50), creating a slide-out effect from under the header.
      */}
      <div className={`
        fixed inset-0 bg-zinc-950 z-40 transition-transform duration-300 ease-in-out pt-20 px-6
        md:hidden flex flex-col gap-6
        ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}
      `}>
         <div className="flex flex-col gap-4 text-lg mt-4">
            <MobileNavLink href="/" label="THE_FEED" />
            <MobileNavLink href="/analysis/feed" label="BRAIN_DUMP" highlight/>
            <MobileNavLink href="/bridge" label="WORMHOLE"  />
            <MobileNavLink href="/profile" label="STASH" />
         </div>

         <div className="mt-auto mb-10 p-4 border border-orange-900/20 rounded-sm bg-zinc-900/50">
            <p className="text-xs text-slate-500 mb-2 font-mono uppercase">System Status</p>
            <div className="flex items-center gap-2 text-sm text-lime-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                AI Agents Active
            </div>
         </div>
      </div>
    </>
  );
}

// Sub-components
function NavLink({ href, label, highlight }: { href: string; label: string; highlight?: boolean }) {
    return (
        <Link 
            href={href} 
            className={`text-xs font-bold transition-colors uppercase tracking-widest ${
                highlight 
                ? "text-orange-500 hover:text-orange-400 shadow-orange-500/20 drop-shadow-sm" 
                : "text-zinc-500 hover:text-zinc-200"
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
            className={`py-3 border-b border-orange-900/20 font-bold ${
                highlight ? "text-orange-400" : "text-slate-200"
            }`}
        >
            {label}
        </Link>
    );
}