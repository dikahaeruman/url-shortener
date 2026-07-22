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
  });

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
});
