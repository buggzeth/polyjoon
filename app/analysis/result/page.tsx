// app/analysis/result/page.tsx
import { getAnalysisHistory } from "../../actions/storage";
import AnalysisView from "../../components/AnalysisView";

export const maxDuration = 60; 

// Note: In Next.js App Router, searchParams is passed as a prop
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AnalysisResultPage({ searchParams }: PageProps) {
  // Await params in newer Next.js versions
  const params = await searchParams;
  const eventId = typeof params.eventId === "string" ? params.eventId : null;

  if (!eventId) {
    return (
      <main className="min-h-screen bg-zinc-950 text-orange-50 p-10 flex justify-center items-center">
        <div className="text-rose-400">Error: No Event ID provided</div>
      </main>
    );
  }

  // SERVER SIDE FETCHING HAPPENS HERE
  // This uses the Secret Key via the server action
  const history = await getAnalysisHistory(eventId);

  return (
    <main className="min-h-screen bg-zinc-950 text-orange-50 p-4 md:p-8">
      <AnalysisView eventId={eventId} initialHistory={history} />
    </main>
  );
}