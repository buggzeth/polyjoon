// app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseSecretKey) {
  throw new Error("Missing SUPABASE_SECRET_KEY in environment variables.");
}

// ⚠️ THIS CLIENT HAS FULL ADMIN ACCESS (BYPASSES RLS)
// IT MUST NEVER BE IMPORTED INTO CLIENT COMPONENTS
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false, // Server actions don't need persistent sessions
    autoRefreshToken: false,
  }
});