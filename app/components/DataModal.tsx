// app/components/DataModal.tsx
"use client";

import { useEffect, useState } from "react";
import { getEventById } from "../actions/fetchEvents";
import { PolymarketEvent } from "../types/polymarket";
import RecursiveDataView from "./RecursiveDataView"; // <--- Import this

interface DataModalProps {
  eventId: string;
  onClose: () => void;
}

export default function DataModal({ eventId, onClose }: DataModalProps) {
  const [data, setData] = useState<PolymarketEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const result = await getEventById(eventId);
        if (isMounted) {
            if (result) setData(result);
            else setError("Failed to fetch raw data.");
        }
      } catch (e) {
        if (isMounted) setError("Network error occurred.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    document.body.style.overflow = "hidden";
    return () => {
      isMounted = false;
      document.body.style.overflow = "unset";
    };
  }, [eventId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-orange-900/20 w-full max-w-5xl h-[85vh] rounded-sm shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-orange-900/20 bg-zinc-900">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <h3 className="text-slate-200 font-bold text-sm">Event Data Inspector</h3>
              <p className="text-[10px] text-slate-500 font-mono">ID: {eventId}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white hover:bg-orange-900/20 px-3 py-1 rounded transition-colors text-sm font-bold"
          >
            ✕ Close
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-zinc-950">
          {loading ? (
            <div className="flex h-full items-center justify-center text-orange-400 gap-2 flex-col">
              <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-xs mt-2">Fetching fresh data from Chain/API...</span>
            </div>
          ) : error ? (
            <div className="text-rose-400 font-mono p-4 border border-rose-900 bg-rose-950/20 rounded text-center">
              Error: {error}
            </div>
          ) : (
            // --- USE THE NEW COMPONENT HERE ---
            <div className="max-w-4xl mx-auto">
                <RecursiveDataView data={data} label="ROOT_EVENT" />
            </div>
          )}
        </div>
      </div>
      
      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}