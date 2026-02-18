// app/analysis/feed/page.tsx

import { fetchAnalysisPage } from "../../actions/storage";
import AnalysisFeed from "../../components/AnalysisFeed";

export const dynamic = 'force-dynamic';

export default async function AnalysisFeedPage() {
  // Fetch initial batch (first 20)
  const initialRecords = await fetchAnalysisPage(0, 20);

  return (
    <main className="min-h-screen bg-zinc-950 text-orange-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Page Header */}
        <div className="mb-8 py-4">
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-lime-400 to-cyan-500 bg-clip-text text-transparent tracking-tight mb-2">
                Analysis Archive
            </h1>
            <p className="text-zinc-400 text-sm max-w-xl">
                A chronological feed of all AI agent executions. Monitor performance and review historical predictions.
            </p>
        </div>

        {/* Feed Component */}
        <AnalysisFeed initialRecords={initialRecords} />
      </div>
    </main>
  );
}