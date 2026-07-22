import { describe, expect, test } from 'bun:test';
import { isSupabaseConfigured } from '../lib/supabase';

describe('lib/supabase - isSupabaseConfigured', () => {
  test('returns boolean status indicating whether Supabase credentials are valid', () => {
    const isConfigured = isSupabaseConfigured();
    expect(typeof isConfigured).toBe('boolean');
  });
});
