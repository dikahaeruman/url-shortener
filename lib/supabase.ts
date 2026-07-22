import { createClient } from '@supabase/supabase-js';

export interface UrlRecord {
  id: string;
  original_url: string;
  short_code: string;
  clicks: number;
  created_at: string;
  client_id?: string | null;
  expires_at?: string | null;
  title?: string | null;
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(rawUrl) &&
    (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) &&
    !rawUrl.includes('your_supabase_url') &&
    !rawUrl.includes('placeholder') &&
    Boolean(rawKey) &&
    !rawKey.includes('your_supabase_publishable_key') &&
    !rawKey.includes('your_supabase_anon_key')
  );
}

const supabaseUrl =
  rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    ? rawUrl
    : 'https://placeholder.supabase.co';

const supabasePublishableKey = rawKey || 'placeholder-publishable-key';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
