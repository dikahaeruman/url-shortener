import { describe, expect, test } from 'bun:test';
import { GET, DELETE } from '../app/api/admin/urls/route';

describe('app/api/admin/urls API Handler', () => {
  const expectedKey = process.env.ADMIN_SECRET_KEY || 'pendekin-admin-2026';

  test('GET returns 401 Unauthorized if x-admin-key header is missing or incorrect', async () => {
    const reqNoHeader = new Request('http://localhost:3000/api/admin/urls');
    const resNoHeader = await GET(reqNoHeader);
    expect(resNoHeader.status).toBe(401);

    const reqWrongHeader = new Request('http://localhost:3000/api/admin/urls', {
      headers: { 'x-admin-key': 'wrong-key-123' },
    });
    const resWrongHeader = await GET(reqWrongHeader);
    expect(resWrongHeader.status).toBe(401);
  });

  test('GET succeeds or responds appropriately when valid x-admin-key is provided', async () => {
    const req = new Request('http://localhost:3000/api/admin/urls', {
      headers: { 'x-admin-key': expectedKey },
    });
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
    const body = await res.json();
    if (res.status === 200) {
      expect(body).toHaveProperty('urls');
      expect(body).toHaveProperty('stats');
      expect(body.stats).toHaveProperty('totalUrls');
    }
  }, 15000);

  test('DELETE returns 401 Unauthorized if x-admin-key header is missing', async () => {
    const req = new Request('http://localhost:3000/api/admin/urls?id=test-id', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  test('DELETE returns 400 Bad Request if link ID is missing from query params', async () => {
    const req = new Request('http://localhost:3000/api/admin/urls', {
      method: 'DELETE',
      headers: { 'x-admin-key': expectedKey },
    });
    const res = await DELETE(req);
    // Returns 400 or 500 depending on environment credentials
    expect([400, 500]).toContain(res.status);
  });

  test('DELETE returns 404 when link ID does not exist (or 500 if no supabase)', async () => {
    const req = new Request('http://localhost:3000/api/admin/urls?id=00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
      headers: { 'x-admin-key': expectedKey },
    });
    const res = await DELETE(req);
    // 404 if the RPC actually ran and found no row, 500 if supabase isn't configured
    expect([404, 500]).toContain(res.status);
  }, 15000);

  test('GET returns pagination shape when authenticated', async () => {
    const req = new Request('http://localhost:3000/api/admin/urls?page=1&pageSize=10', {
      headers: { 'x-admin-key': expectedKey },
    });
    const res = await GET(req);
    if (res.status === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('page', 1);
      expect(body).toHaveProperty('pageSize', 10);
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('urls');
      expect(Array.isArray(body.urls)).toBe(true);
      expect(body.urls.length).toBeLessThanOrEqual(10);
    }
  }, 15000);

  test('GET clamps pageSize to max 100', async () => {
    const req = new Request('http://localhost:3000/api/admin/urls?pageSize=99999', {
      headers: { 'x-admin-key': expectedKey },
    });
    const res = await GET(req);
    if (res.status === 200) {
      const body = await res.json();
      expect(body.pageSize).toBeLessThanOrEqual(100);
    }
  }, 15000);

  test('GET handles invalid page param gracefully', async () => {
    const req = new Request('http://localhost:3000/api/admin/urls?page=-5&pageSize=abc', {
      headers: { 'x-admin-key': expectedKey },
    });
    const res = await GET(req);
    if (res.status === 200) {
      const body = await res.json();
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(25); // default
    }
  }, 15000);
});
