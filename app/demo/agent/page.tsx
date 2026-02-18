// app/demo/page.tsx
export const runtime = 'edge';

import { getMockDashboardData } from "@/app/actions/mock";
import { getLatestReport } from "@/app/actions/performance"; // New
import MockTerminal from "@/app/components/MockTerminal";
import PerformanceSection from "@/app/components/PerformanceSection"; // New


export const dynamic = 'force-dynamic'; // Always fetch fresh stats

export default async function DemoPage() {
  const [mockData, reportStatus] = await Promise.all([
    getMockDashboardData(),
    getLatestReport()
  ]);

  return (
    <main className="min-h-screen bg-black text-orange-50 p-4 md:p-8 font-mono bg-[url('/grid.svg')]">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-10 pt-8 border-b border-zinc-800 pb-8">
            <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">🦀</span>
                <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 uppercase tracking-tighter">
                    NUKE.AGENT
                </h1>
            </div>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl leading-relaxed">
                This agent simulates a "blind follower" strategy. Every time an AI analysis generates a positive EV opportunity, a trade is logged here instantaneously at the recorded market price.
            </p>
            <div className="mt-4 flex gap-4 text-[10px] uppercase font-bold text-zinc-600">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Live Market Data
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Kelly Stake Simulation
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Instant Execution
                </span>
            </div>
        </div>

        <PerformanceSection 
            initialReport={reportStatus.report}
            canGenerate={reportStatus.canGenerate}
            nextGenTime={reportStatus.nextGenTime}
        />

        {/* The Dashboard */}
        <MockTerminal data={mockData} />

        <div className="mt-20 text-center text-zinc-700 text-xs font-mono">
            NUKE.FARM
        </div>
      </div>
    </main>
  );
}