// app/demo/page.tsx
import Link from "next/link";

export const metadata = {
  title: "System Demo",
  description: "Visual confirmation of Nuke Farm protocols.",
};

export default function DemoPage() {
  // 1. REPLACE WITH YOUR VERCEL BLOB URL
  const VIDEO_URL = "https://4iefjamwzwa40h5y.public.blob.vercel-storage.com/demo.mp4"; 
  
  // 2. (OPTIONAL) Add a screenshot of the video to public/demo-thumb.jpg for a better loading experience
  const POSTER_URL = "/demo-thumb.png"; 

  return (
    <main className="min-h-screen text-orange-50 p-4 md:p-8 bg-zinc-950 flex flex-col items-center">
      <div className="max-w-6xl w-full space-y-8">
        
        {/* --- Header Section --- */}
        <div className="border-b border-orange-900/20 pb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-2 uppercase">
                <span className="text-orange-600">MISSION</span> BRIEFING
              </h1>
              <p className="text-zinc-500 text-sm md:text-base font-mono">
                // SYSTEM WALKTHROUGH :: VISUAL CONFIRMATION
              </p>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-900/10 border border-orange-900/30 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
                </span>
                <span className="text-xs font-mono text-lime-400 font-bold tracking-widest">
                    BROADCAST_ONLINE
                </span>
            </div>
          </div>
        </div>

        {/* --- Video Interface Container --- */}
        <div className="relative group">
            
            {/* Decorative Borders/Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-sm opacity-20 blur transition duration-1000 group-hover:opacity-40 group-hover:blur-md"></div>
            
            <div className="relative bg-zinc-900 border border-orange-900/30 p-1 rounded-sm shadow-2xl">
                {/* HUD Top Bar */}
                <div className="bg-black/40 h-8 flex items-center justify-between px-4 mb-1 border-b border-white/5">
                    <div className="text-[10px] font-mono text-zinc-500 flex gap-4">
                        <span>REC :: [00:00:00]</span>
                    </div>
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></div>
                    </div>
                </div>

                {/* THE VIDEO PLAYER */}
                <div className="aspect-video w-full bg-black relative overflow-hidden group/video">
                    <video 
                        controls
                        preload="metadata"
                        poster={POSTER_URL}
                        className="w-full h-full object-cover"
                    >
                        <source src={VIDEO_URL} type="video/mp4" />
                        <p className="text-red-500 p-10">
                            // ERROR: YOUR BROWSER DOES NOT SUPPORT HTML5 VIDEO
                        </p>
                    </video>
                </div>

                 {/* HUD Bottom Bar */}
                 <div className="bg-black/40 h-6 flex items-center justify-between px-4 mt-1 border-t border-white/5">
                    <span className="text-[10px] font-mono text-orange-900/60 uppercase">
                        // SECURE_CONNECTION_ESTABLISHED
                    </span>
                 </div>
            </div>
        </div>

        {/* --- Description & CTA Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            
            {/* Description Box */}
            <div className="md:col-span-2 bg-zinc-900/50 border border-orange-900/20 p-6 rounded-sm backdrop-blur-sm">
                <h3 className="text-xl font-bold text-slate-200 mb-4 font-mono">
                    PROTOCOL OVERVIEW
                </h3>
                <div className="space-y-4 text-slate-400 text-sm leading-relaxed">
                    <p>
                        This demonstration outlines the core capabilities of the NUKE.FARM automated crab agents. 
                        Observe real-time EV analysis, liquidity sniping, and radioactive yield harvesting on the Polymarket protocol.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-zinc-500 font-mono text-xs">
                        <li>Automated Order Execution</li>
                        <li>High-Frequency Market Scanning</li>
                        <li>Risk-Adjusted Position Sizing</li>
                    </ul>
                </div>
            </div>

            {/* Action Panel */}
            <div className="flex flex-col gap-4">
                <div className="bg-orange-950/20 border border-orange-500/20 p-6 rounded-sm flex flex-col justify-center items-center text-center h-full">
                    <p className="text-orange-200 text-sm mb-4 font-bold uppercase tracking-widest">
                        Ready to deploy?
                    </p>
                    <Link 
                        href="/" 
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-6 rounded-sm transition-all duration-300 shadow-[0_0_15px_rgba(234,88,12,0.3)] hover:shadow-[0_0_25px_rgba(234,88,12,0.6)] uppercase tracking-wider text-sm flex items-center justify-center gap-2 group"
                    >
                        <span>Launch Terminal</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </Link>
                </div>
            </div>
        </div>

      </div>
    </main>
  );
}