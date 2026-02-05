// app/page.tsx
import { fetchEvents } from "./actions/fetchEvents";
import EventFeed from "./components/EventFeed";
// WalletHeader import removed

export const dynamic = 'force-dynamic';

export const maxDuration = 60;

export default async function Home() {
  const initialEvents = await fetchEvents(0, 50);

  return (
  <main className="min-h-screen text-orange-50 p-4 md:p-8 bg-zinc-950">
    <div className="max-w-7xl mx-auto">
      
      <div className="mb-8 py-4 border-b border-orange-900/20">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-2 uppercase">
              <span className="text-orange-600">NUKE</span>.FARM
          </h1>
          <p className="text-zinc-500 text-sm md:text-base max-w-2xl font-mono">
              // OBJECTIVE: PINCH ALPHA. NUKE THE MARKET.
          </p>
      </div>

      <EventFeed initialEvents={initialEvents} />
    </div>
  </main>
);
}