import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = 'https://nqwejzbayquzsvcodunl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2VqemJheXF1enN2Y29kdW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTA0MjAsImV4cCI6MjA3Mzk2NjQyMH0.01yifC-tfEbBHD5u315fpb_nZrqMZCbma_UrMacMb78';

console.log('🔧 Supabase client initialization', {
  url: supabaseUrl,
  hasKey: !!supabaseKey,
  keyLength: supabaseKey.length,
  isNative: Capacitor.isNativePlatform(),
  timestamp: new Date().toISOString()
});

// Custom storage adapter for Capacitor to avoid ITP issues
const capacitorStorageAdapter = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Storage getItem failed:', error);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Storage setItem failed:', error);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Storage removeItem failed:', error);
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable for email confirmation redirects
    flowType: 'pkce', // Recommended for security
    storage: capacitorStorageAdapter, // Use custom storage adapter
    debug: process.env.NODE_ENV === 'development' // Enable debug logging in development
  },
  global: {
    headers: {
      'X-Client-Info': 'hyperapp-mimi'
    }
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
