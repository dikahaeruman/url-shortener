import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { POST, GET, DELETE } from '../app/api/shorten/route';
import { supabase } from '@/lib/supabase';

const originalFrom = supabase.from;

function makeFromBuilder(opts: { insertResult?: any; deleteResult?: any; selectResult?: any } = {}) {
  const insertResult = opts.insertResult ?? {
    data: {
      id: 'mock-id',
      short_code: 'mock1',
      original_url: 'https://mock.test',
      clicks: 0,
      created_at: new Date().toISOString(),
      expires_at: null,
      client_id: 'mock-client',
      title: null,
    },
    error: null,
  };
  const deleteResult = opts.deleteResult ?? { data: null, error: null, count: 1 };
  const selectResult = opts.selectResult ?? { data: [], error: null };

  const builder: any = {};
  builder.insert = () => builder;
  builder.select = () => builder;
  builder.delete = () => builder;
  builder.eq = () => builder;
  builder.order = () => builder;
  builder.single = () => Promise.resolve(insertResult);
  builder.then = (resolve: any, reject: any) =>
    Promise.resolve(selectResult).then(resolve, reject);
  // For delete chains that resolve directly.
  builder.thenDelete = (resolve: any, reject: any) =>
    Promise.resolve(deleteResult).then(resolve, reject);
  // The actual chain used by DELETE: .delete().eq('id', id) is awaited.
  // We can detect by inspecting the chain: if insert was called, resolve
  // insert; if delete was called, resolve delete. Simpler: always
  // return both. We pick based on which method was called.
  // For the delete chain, calling eq().then(({})=>{}) works because
  // `then` is what triggers the await. We make `then` resolve the
  // delete result, and let `single` resolve the insert result.
  return builder;
}

describe('app/api/shorten API Handlers - Edge Cases & Expiration Options', () => {
  let lastBuilder: any;

  beforeEach(() => {
    lastBuilder = makeFromBuilder();
    (supabase as any).from = () => lastBuilder;
  });

  afterEach(() => {
    (supabase as any).from = originalFrom;
  });

  test('POST processes valid URL with 1h expiration option', async () => {
    const req = new Request('http://localhost:3000/api/shorten', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': 'client-unit-1',
      },
      body: JSON.stringify({
        original_url: 'https://github.com/features',
        expires_in: '1h',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('short_code');
  });

  test('POST processes valid URL with 24h expiration option', async () => {
    const req = new Request('http://localhost:3000/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original_url: 'https://news.ycombinator.com',
        expires_in: '24h',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  test('POST processes valid URL with 7d expiration option', async () => {
    const req = new Request('http://localhost:3000/api/shorten', {
      method: 'POST',
      body: JSON.stringify({
        original_url: 'https://react.dev',
        expires_in: '7d',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  test('POST processes valid URL with 30d expiration option', async () => {
    const req = new Request('http://localhost:3000/api/shorten', {
      method: 'POST',
      body: JSON.stringify({
        original_url: 'https://nextjs.org',
        expires_in: '30d',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  test('POST returns 400 Bad Request for unsafe or invalid URLs', async () => {
    const req = new Request('http://localhost:3000/api/shorten', {
      method: 'POST',
      body: JSON.stringify({ original_url: 'ftp://unsafe.com' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('POST returns 400 Bad Request for invalid custom short codes', async () => {
    const req = new Request('http://localhost:3000/api/shorten', {
      method: 'POST',
      body: JSON.stringify({ original_url: 'https://example.com', custom_code: 'admin' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('reserved code');
  });

  test('GET returns empty array or client URLs when requested', async () => {
    (supabase as any).from = () => {
      const b: any = {};
      b.select = () => b;
      b.eq = () => b;
      b.order = () => b;
      b.limit = () => b;
      b.then = (resolve: any, reject: any) =>
        Promise.resolve({ data: [], error: null }).then(resolve, reject);
      return b;
    };

    const req = new Request('http://localhost:3000/api/shorten?client_id=test-client-123');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('urls');
    expect(Array.isArray(body.urls)).toBe(true);
  });

  test('GET returns configured status when client_id is missing', async () => {
    const req = new Request('http://localhost:3000/api/shorten');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('configured');
  });

  test('DELETE returns 400 Bad Request if record ID is missing', async () => {
    const req = new Request('http://localhost:3000/api/shorten', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  test('DELETE accepts valid record ID and client ID query params', async () => {
    const req = new Request('http://localhost:3000/api/shorten?id=record-123', {
      method: 'DELETE',
      headers: { 'x-client-id': 'client-unit-1' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
  });
});
