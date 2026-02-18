// app/market/[slug]/page.tsx
export const runtime = 'edge';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAnalysisBySlug, getAnalysisHistory } from '@/app/actions/storage';
import AnalysisView from '@/app/components/AnalysisView';

// 1. Generate SEO Metadata dynamically
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const analysis = await getAnalysisBySlug(slug);

  if (!analysis) {
    return { title: 'Market Not Found | NUKE.FARM' };
  }

  const data = analysis.analysis_data;
  const topOpp = data.opportunities[0]; // Grab the best bet for the title
  const evPercent = (topOpp?.expectedValue * 100).toFixed(0);

  return {
    title: `${topOpp?.headline || 'Market Analysis'} (${evPercent}% EV) | NUKE.FARM`,
    description: data.summary.slice(0, 160) + '...',
    openGraph: {
      title: `Analysis: ${topOpp?.marketQuestion}`,
      description: `AI Prediction: ${topOpp?.recommendation} ${topOpp?.selectedOutcome} with ${topOpp?.confidenceScore}% confidence.`,
      type: 'article',
      // If you implement OG image generation later:
      // images: [`/og?title=${encodeURIComponent(topOpp?.headline)}&ev=${evPercent}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${topOpp?.headline} | ${evPercent}% EV`,
      description: `AI Prediction: ${topOpp?.recommendation} ${topOpp?.selectedOutcome}`,
    }
  };
}

export default async function MarketSEOPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 1. Fetch the specific analysis by slug
  const latestRecord = await getAnalysisBySlug(slug);

  if (!latestRecord) {
    return notFound(); 
  }

  // 2. Fetch history using the ID found in the record (for the history dropdown compatibility)
  const history = await getAnalysisHistory(latestRecord.event_id);

  // 3. Inject Structured Data for AI Agents (JSON-LD)
  // This tells Google "This is a prediction"
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": latestRecord.analysis_data.opportunities[0]?.headline,
    "datePublished": latestRecord.created_at,
    "author": {
      "@type": "Organization",
      "name": "NUKE.FARM AI Oracle"
    },
    "description": latestRecord.analysis_data.summary
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-orange-50 p-4 md:p-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      {/* 
          Reuse your existing AnalysisView. 
          It handles the heavy lifting of displaying the terminal.
      */}
      <AnalysisView 
        eventId={latestRecord.event_id} 
        initialHistory={history.length > 0 ? history : [latestRecord]} 
      />
    </main>
  );
}