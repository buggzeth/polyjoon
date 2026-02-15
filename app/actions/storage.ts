// app/actions/storage.ts
"use server";

import { supabaseAdmin } from "../lib/supabase";
import { AnalysisResponse } from "../types/ai";

export interface AnalysisRecord {
  id: string;
  event_id: string; 
  user_id?: string; // Add this
  analysis_data: AnalysisResponse;
  created_at: string;
}

// Updated to accept userId
export async function saveAnalysisToDB(eventId: string, data: AnalysisResponse, userId?: string) {
  const payload: any = {
    event_id: eventId,
    analysis_data: data
  };

  // Only add user_id if the column exists in your DB schema. 
  // Ideally, run: ALTER TABLE market_analysis ADD COLUMN user_id text;
  if (userId) {
    payload.user_id = userId;
  }

  const { error } = await supabaseAdmin
    .from('market_analysis')
    .insert(payload);

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

export async function getUserDailyUsage(userId: string): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { count, error } = await supabaseAdmin
    .from('market_analysis')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneDayAgo);

  if (error) {
    console.error("Usage count error:", error);
    // FIX: Fail OPEN instead of closed. If the DB check fails,
    // let the user proceed. Don't block them.
    return 0; 
  }
  
  return count || 0;
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