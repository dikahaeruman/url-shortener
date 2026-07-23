import { supabase, UrlRecord } from './supabase';
import { generateShortCode } from './utils';

export interface InsertUrlInput {
  original_url: string;
  client_id: string | null;
  expires_at: string | null;
  custom_code?: string;
}

export type InsertUrlResult =
  | { ok: true; record: UrlRecord }
  | { ok: false; status: number; error: string };

/**
 * Insert a URL row, retrying on Postgres unique-constraint (23505) when
 * generating the short code. With a custom code, no retry — the
 * conflict becomes a 409 to the caller.
 *
 * ponytail: single insert per attempt (no SELECT-then-INSERT race) and
 * up to 5 attempts on auto-generated codes. 57B keyspace means
 * collisions are rare; if 5 fails, keyspace is exhausted, return 500.
 */
export async function insertUrl(input: InsertUrlInput): Promise<InsertUrlResult> {
  const baseRow = {
    original_url: input.original_url,
    clicks: 0,
    client_id: input.client_id,
    expires_at: input.expires_at,
    title: null,
  };

  if (input.custom_code) {
    const { data, error } = await supabase
      .from('urls')
      .insert({ ...baseRow, short_code: input.custom_code })
      .select()
      .single();

    if (error?.code === '23505') {
      return {
        ok: false,
        status: 409,
        error: `The custom code "${input.custom_code}" is already in use. Please choose another.`,
      };
    }
    if (error || !data) {
      console.error('Supabase error inserting URL:', error);
      return { ok: false, status: 500, error: 'Failed to store URL in database.' };
    }
    return { ok: true, record: data as UrlRecord };
  }

  const MAX_ATTEMPTS = 5;
  let lastError: unknown = null;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const candidate = generateShortCode(6);
    const { data, error } = await supabase
      .from('urls')
      .insert({ ...baseRow, short_code: candidate })
      .select()
      .single();

    if (!error && data) {
      return { ok: true, record: data as UrlRecord };
    }
    if (error?.code !== '23505') {
      console.error('Supabase error inserting URL:', error);
      return { ok: false, status: 500, error: 'Failed to store URL in database.' };
    }
    lastError = error;
  }

  console.error('Exhausted short-code retries:', lastError);
  return {
    ok: false,
    status: 500,
    error: 'Failed to generate unique short code. Please try again.',
  };
}
