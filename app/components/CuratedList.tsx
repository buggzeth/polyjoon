// app/components/CuratedList.tsx
"use client";

import { useState } from "react";
import CategoryAccordion from "./CategoryAccordion";
import { PolymarketEvent } from "../types/polymarket";

interface CategoryData {
  title: string;
  icon: string;
  events: PolymarketEvent[];
}

export default function CuratedList({ categories }: { categories: CategoryData[] }) {
  const [showAllSectors, setShowAllSectors] = useState(false);

  // Default to showing top 4, expand to show all if clicked
  const visibleCategories = showAllSectors ? categories : categories.slice(0, 4);
  const hiddenCount = categories.length - 4;

  if (categories.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* List of Accordions */}
      {visibleCategories.map((cat, index) => (
        <CategoryAccordion 
          key={cat.title}
          title={cat.title} 
          icon={cat.icon} 
          events={cat.events} 
          // Only auto-expand the very first one if we are in compact mode
          defaultOpen={index === 0 && !showAllSectors} 
        />
      ))}

      {/* "Reveal More Sectors" Button */}
      {categories.length > 4 && (
        <div className="relative pt-6 pb-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center">
                <button
                    onClick={() => setShowAllSectors(!showAllSectors)}
                    className="bg-zinc-950 px-4 py-2 text-xs font-mono text-orange-500 border border-orange-900/30 rounded hover:bg-orange-900/10 hover:border-orange-500/50 transition-all uppercase tracking-widest flex items-center gap-2 group"
                >
                    {showAllSectors ? (
                        <>
                            <span>[-] CONCEAL SECTORS</span>
                        </>
                    ) : (
                        <>
                            <span>[+] SCAN FOR MORE SECTORS ({hiddenCount})</span>
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}