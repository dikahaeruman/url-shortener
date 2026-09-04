import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  maybeCleanupExpired,
  _resetCleanupGate,
} from '@/lib/cleanup';
import { supabase } from '@/lib/supabase';

const realRpc = supabase.rpc;

describe('maybeCleanupExpired gate', () => {
  let calls: number;

  beforeEach(() => {
    _resetCleanupGate();
    calls = 0;
    supabase.rpc = (async () => {
      calls += 1;
      return { data: [{ deleted: 0, ran_at: new Date().toISOString() }], error: null };
    }) as any;
  });

  afterEach(() => {
    supabase.rpc = realRpc;
  });

  test('fires RPC on first call', async () => {
    await maybeCleanupExpired();
    expect(calls).toBe(1);
  });

  test('does not fire again within 30d', async () => {
    await maybeCleanupExpired();
    await maybeCleanupExpired();
    await maybeCleanupExpired();
    expect(calls).toBe(1);
  });

  test('deduplicates concurrent calls', async () => {
    const promises = [maybeCleanupExpired(), maybeCleanupExpired(), maybeCleanupExpired()];
    await Promise.all(promises);
    expect(calls).toBe(1);
  });

  test('returns 0 on supabase error without throwing', async () => {
    supabase.rpc = (async () => ({ data: null, error: new Error('boom') })) as any;
    _resetCleanupGate();
    const result = await maybeCleanupExpired();
    expect(result).toBe(0);
  });

  test('returns the deleted count on success', async () => {
    supabase.rpc = (async () => ({
      data: [{ deleted: 7, ran_at: new Date().toISOString() }],
      error: null,
    })) as any;
    _resetCleanupGate();
    const result = await maybeCleanupExpired();
    expect(result).toBe(7);
  });

  test('refires after gate reset', async () => {
    await maybeCleanupExpired();
    expect(calls).toBe(1);
    _resetCleanupGate();
    await maybeCleanupExpired();
    expect(calls).toBe(2);
  });
});
