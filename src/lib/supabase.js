import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        '🚨 CRITICAL: Missing Supabase Environment Variables!\n' +
        'Check your .env.local file or Hosting Dashboard settings.\n' +
        'URL:', supabaseUrl ? 'Found' : 'MISSING', '\n' +
        'Key:', supabaseAnonKey ? 'Found' : 'MISSING'
    );
}

// Create client - will not throw immediately if keys are empty strings, 
// allowing the app to boot and show standard error states.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
