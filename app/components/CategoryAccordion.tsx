// app/components/CategoryAccordion.tsx
"use client";

import { useState } from "react";
import { PolymarketEvent } from "../types/polymarket";
import EventCard from "./EventCard";

interface CategoryAccordionProps {
  title: string;
  icon: string;
  events: PolymarketEvent[];
  defaultOpen?: boolean;
}

export default function CategoryAccordion({ title, icon, events, defaultOpen = false }: CategoryAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  if (!events || events.length === 0) return null;

  const INITIAL_COUNT = 3;
  const displayedEvents = showAll ? events : events.slice(0, INITIAL_COUNT);
  const hiddenCount = events.length - INITIAL_COUNT;

  return (
    <div className="border border-orange-900/30 bg-black/40 rounded-sm overflow-hidden mb-4 transition-all duration-300">
      
      {/* Header Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-zinc-900/80 hover:bg-zinc-800 transition-all border-b border-orange-900/10 group"
      >
        <div className="flex items-center gap-3">
            <span className="text-xl filter grayscale group-hover:grayscale-0 transition-all">{icon}</span>
            <h3 className="font-mono font-bold text-lg text-slate-300 group-hover:text-orange-400 uppercase tracking-widest">
                {title}
            </h3>
            {/* Shows total available in this category, not just what's visible */}
            <span className="text-[10px] bg-orange-900/20 text-orange-500 px-2 py-0.5 rounded border border-orange-900/30 font-mono">
                {events.length} ACTIVE
            </span>
        </div>
        
        <div className="font-mono text-orange-500 text-sm">
            {isOpen ? "[-]" : "[+]"}
        </div>
      </button>

      {/* Accordion Body */}
      {isOpen && (
        <div className="p-4 md:p-6 bg-zinc-950/50 border-t border-orange-900/20 animate-in fade-in slide-in-from-top-2 duration-200">
           
           {/* Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedEvents.map(event => (
                  <div key={event.id} className="origin-top">
                    <EventCard event={event} />
                  </div>
              ))}
           </div>

           {/* Show More / Show Less Button */}
           {events.length > INITIAL_COUNT && (
             <div className="mt-8 flex justify-center border-t border-dashed border-zinc-800 pt-4">
                <button 
                  onClick={() => setShowAll(!showAll)}
                  className="group flex flex-col items-center gap-1 text-xs font-mono text-zinc-500 hover:text-orange-400 transition-colors uppercase tracking-widest"
                >
                  <span>
                    {showAll 
                      ? `COLLAPSE TERMINAL` 
                      : `SHOW ${hiddenCount} MORE EVENTS`}
                  </span>
                  <span className={`text-lg leading-none transition-transform duration-300 ${showAll ? "rotate-180" : ""}`}>
                    ⌄
                  </span>
                </button>
             </div>
           )}

        </div>
      )}
    </div>
  );
}