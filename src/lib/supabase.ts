import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nqwejzbayquzsvcodunl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2VqemJheXF1enN2Y29kdW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTA0MjAsImV4cCI6MjA3Mzk2NjQyMH0.01yifC-tfEbBHD5u315fpb_nZrqMZCbma_UrMacMb78';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Export the client type for TypeScript
export type { SupabaseClient };
