// app/actions/storage.ts
"use server";

import { supabaseAdmin } from "../lib/supabase";
import { AnalysisResponse } from "../types/ai";

export interface AnalysisRecord {
  id: string;
  event_id: string; // The parent event ID
  analysis_data: AnalysisResponse;
  created_at: string;
}

export async function saveAnalysisToDB(eventId: string, data: AnalysisResponse) {
  const { error } = await supabaseAdmin
    .from('market_analysis')
    .insert({
      event_id: eventId,
      analysis_data: data
    });

  if (error) console.error("DB Save Error:", error);
}

export async function getAnalysisHistory(eventId: string): Promise<AnalysisRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('market_analysis')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  
  return data as AnalysisRecord[];
}

export async function getLatestAnalysis(eventId: string): Promise<AnalysisRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('market_analysis')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data as AnalysisRecord;
}

// --- NEW PAGINATION FUNCTION ---
export async function fetchAnalysisPage(offset: number = 0, limit: number = 20): Promise<AnalysisRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('market_analysis')
    .select('*')
    .order('created_at', { ascending: false }) // Newest first
    .range(offset, offset + limit - 1);

  if (error || !data) {
    console.error("Pagination Fetch Error:", error);
    return [];
  }

  return data as AnalysisRecord[];
}

export async function checkAnalysisExists(eventId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('market_analysis')
    .select('*', { count: 'exact', head: true }) // head: true means don't fetch data, just count
    .eq('event_id', eventId);

  if (error) {
    console.error("Check existence error:", error);
    return false;
  }
  
  return (count || 0) > 0;
}