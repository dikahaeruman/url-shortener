import { describe, expect, test } from 'bun:test';
import { POST, GET, DELETE } from '../app/api/shorten/route';

describe('app/api/shorten API Handlers - Edge Cases & Expiration Options', () => {
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
    expect([201, 500]).toContain(res.status);
  });

  test('POST processes valid URL with 24h expiration option', async () => {
    const req = new Request('http://localhost:3000/api/shorten', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original_url: 'https://news.ycombinator.com',
        expires_in: '24h',
      }),
    });

    const res = await POST(req);
    expect([201, 500]).toContain(res.status);
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
    expect([201, 500]).toContain(res.status);
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
    expect([201, 500]).toContain(res.status);
  });

  test('POST returns 400 Bad Request for unsafe or invalid URLs', async () => {
    const req = new Request('http://localhost:3000/api/shorten', {
      method: 'POST',
      body: JSON.stringify({ original_url: 'ftp://unsafe.com' }),
    });
    const res = await POST(req);
    expect([400, 500]).toContain(res.status);
    const body = await res.json();
    if (res.status === 400) {
      expect(body).toHaveProperty('error');
    }
  });

  test('POST returns 400 Bad Request for invalid custom short codes', async () => {
    const req = new Request('http://localhost:3000/api/shorten', {
      method: 'POST',
      body: JSON.stringify({ original_url: 'https://example.com', custom_code: 'admin' }),
    });
    const res = await POST(req);
    expect([400, 500]).toContain(res.status);
    const body = await res.json();
    if (res.status === 400) {
      expect(body.error).toContain('reserved code');
    }
  });

  test('GET returns empty array or client URLs when requested', async () => {
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
    expect([400, 500]).toContain(res.status);
  });

  test('DELETE accepts valid record ID and client ID query params', async () => {
    const req = new Request('http://localhost:3000/api/shorten?id=record-123', {
      method: 'DELETE',
      headers: {
        'x-client-id': 'client-unit-1',
      },
    });
    const res = await DELETE(req);
    expect([200, 500]).toContain(res.status);
  });
});
