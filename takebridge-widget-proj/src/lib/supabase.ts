import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  // Get Supabase URL and anon key from localStorage or environment
  const supabaseUrl = localStorage.getItem('tb_supabase_url') || '';
  const supabaseAnonKey = localStorage.getItem('tb_supabase_anon_key') || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and anon key must be configured in settings');
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

export function resetSupabaseClient() {
  supabaseClient = null;
}

/**
 * Get the current JWT access token from Supabase auth
 * Returns null if user is not authenticated
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Supabase] Error getting session:', error);
      return null;
    }
    
    if (!session) {
      console.warn('[Supabase] No active session found');
      return null;
    }
    
    if (!session.access_token) {
      console.warn('[Supabase] Session exists but no access token');
      return null;
    }
    
    // Log token info for debugging (first 20 chars only)
    console.log('[Supabase] Got access token (first 20 chars):', session.access_token.substring(0, 20) + '...');
    console.log('[Supabase] Token expires at:', new Date(session.expires_at! * 1000).toISOString());
    
    return session.access_token;
  } catch (err) {
    console.error('[Supabase] Error getting access token:', err);
    return null;
  }
}

