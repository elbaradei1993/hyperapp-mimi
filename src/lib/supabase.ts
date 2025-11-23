import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nqwejzbayquzsvcodunl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2VqemJheXF1enN2Y29kdW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTA0MjAsImV4cCI6MjA3Mzk2NjQyMH0.01yifC-tfEbBHD5u315fpb_nZrqMZCbma_UrMacMb78';

console.log('🔧 Supabase client initialization', {
  url: supabaseUrl,
  hasKey: !!supabaseKey,
  keyLength: supabaseKey.length,
  timestamp: new Date().toISOString()
});

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Test the connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('🚨 Supabase connection test failed:', error);
  } else {
    console.log('✅ Supabase connection test successful', {
      hasSession: !!data.session,
      timestamp: new Date().toISOString()
    });
  }
}).catch((error) => {
  console.error('🚨 Supabase connection test error:', error);
});

// Export the client type for TypeScript
export type { SupabaseClient };
