// app/page.tsx
import { fetchEvents } from "./actions/fetchEvents";
import EventFeed from "./components/EventFeed";
import CuratedZone from "./components/CuratedZone";

export const dynamic = 'force-dynamic';

export const maxDuration = 60;

export default async function Home() {
  // Fetch the generic "All" feed for the bottom infinite scroll section
  const initialEvents = await fetchEvents(0, 20);

  return (
    <main className="min-h-screen text-orange-50 p-4 md:p-8 bg-zinc-950">
      <div className="max-w-7xl mx-auto">
        
        {/* --- Header Section --- */}
        <div className="mb-12 py-6 border-b border-orange-900/20 flex flex-col md:flex-row justify-between md:items-end gap-6">
            <div>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-2 uppercase">
                    <span className="text-orange-600">NUKE</span>.FARM
                </h1>
                <p className="text-zinc-500 text-sm md:text-base max-w-2xl font-mono border-l-2 border-orange-900/50 pl-3">
                    // OBJECTIVE: PINCH ALPHA. NUKE THE MARKET.
                </p>
            </div>
            
            {/* System Status Indicator (Decorative) */}
            <div className="text-right hidden md:block font-mono text-xs">
                <div className="text-zinc-600 mb-1">SYSTEM STATUS</div>
                <div className="flex items-center justify-end gap-2 text-emerald-500">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    OPERATIONAL
                </div>
            </div>
        </div>

        {/* --- 1. NEW: Curated Categories (Expandable Zones) --- */}
        {/* This section loads specific categories like Politics/Sports separately */}
        <section className="mb-16">
            <CuratedZone />
        </section>

        {/* --- 2. Main Feed Header --- */}
        <div className="flex items-center gap-3 mb-6 px-1 border-l-4 border-zinc-800 pl-4 py-1">
            <h2 className="text-xl md:text-2xl font-black text-slate-200 uppercase tracking-tighter">
                Global Feed
            </h2>
        </div>

        {/* --- 3. Existing Infinite Scroll Feed --- */}
        <EventFeed initialEvents={initialEvents} />

      </div>
    </main>
  );
}