'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { UrlRecord } from '@/lib/supabase';
import { getFaviconUrl } from '@/lib/utils';
import { matchesSearch, matchesStatus } from '@/lib/url-filter';
import Logo from '@/components/Logo';
import QrModal from '@/components/QrModal';
import FaviconImage from '@/components/FaviconImage';
import UrlItemRow from '@/components/UrlItemRow';
import { useCurrentTime } from '@/hooks/useCurrentTime';
import { useOrigin } from '@/hooks/useOrigin';

const ADMIN_KEY_STORAGE = 'pendekin_admin_key';

export default function AdminDashboardPage() {
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [adminKey, setAdminKey] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [urls, setUrls] = useState<UrlRecord[]>([]);
  const [stats, setStats] = useState<{
    totalUrls: number;
    totalClicks: number;
    activeUrls: number;
    expiredUrls: number;
  }>({ totalUrls: 0, totalClicks: 0, activeUrls: 0, expiredUrls: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  const now = useCurrentTime();
  const origin = useOrigin();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [qrRecord, setQrRecord] = useState<UrlRecord | null>(null);

  const fetchAdminData = useCallback(async (keyToUse: string, pageNum: number, size: number): Promise<boolean> => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`/api/admin/urls?page=${pageNum}&pageSize=${size}`, {
        headers: {
          'x-admin-key': keyToUse,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      setUrls(data.urls || []);
      setTotal(typeof data.total === 'number' ? data.total : 0);
      setStats(
        data.stats || { totalUrls: 0, totalClicks: 0, activeUrls: 0, expiredUrls: 0 }
      );
      setIsAuthenticated(true);
      sessionStorage.setItem(ADMIN_KEY_STORAGE, keyToUse);
      return true;
    } catch (err: unknown) {
      setIsAuthenticated(false);
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError('Failed to load admin dashboard.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const savedKey = sessionStorage.getItem(ADMIN_KEY_STORAGE);
    if (savedKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAdminData(savedKey, page, pageSize).then((success) => {
        if (isMounted && success) {
          setAdminKey(savedKey);
        }
      }).finally(() => {
        if (isMounted) {
          setIsInitializing(false);
        }
      });
    } else {
      setIsInitializing(false);
    }

    return () => {
      isMounted = false;
    };
    // ponytail: re-fetch on page/size change after initial auth.
  }, [fetchAdminData, page, pageSize]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    setAdminKey(inputKey.trim());
    fetchAdminData(inputKey.trim(), page, pageSize);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminKey('');
    setIsAuthenticated(false);
    setUrls([]);
  };

  const copyToClipboard = async (id: string, shortCode: string) => {
    const shortUrl = origin ? `${origin}/${shortCode}` : `/${shortCode}`;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/urls?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminKey,
        },
      });

      if (res.ok) {
        setUrls((prev) => prev.filter((item) => item.id !== id));
        setConfirmId(null);
        fetchAdminData(adminKey, page, pageSize);
      }
    } catch (err) {
      console.error('Error deleting link in admin dashboard:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUrls = urls.filter(
    (record) =>
      matchesStatus(record, statusFilter, now) &&
      matchesSearch(record, searchQuery)
  );

  // Render Initial Session Verification Screen (Eliminates login page flicker on refresh)
  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500 selection:text-white">
        <div className="flex flex-col items-center gap-3 text-center animate-in fade-in duration-200">
          <Logo size="lg" />
          <div className="flex items-center gap-2 text-xs text-neutral-300 font-mono pt-2">
            <svg className="animate-spin h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render Login Card if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500 selection:text-white">
        <div className="w-full max-w-sm space-y-6 text-center">
          <Logo size="lg" />
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs text-neutral-300">
              Enter your Admin Secret Key to access global link management.
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-5 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Admin Key</label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Enter secret key..."
                disabled={loading}
                className="w-full px-3.5 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-base sm:text-sm text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-indigo-500/80 min-h-[48px]"
                required
              />
              <p className="text-[11px] text-neutral-400 font-mono pt-1">
                Default dev key: <code className="text-neutral-300">pendekin-admin-2026</code>
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-lg text-red-300 text-xs">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !inputKey.trim()}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white text-base sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
            >
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </form>

          <Link href="/" className="inline-block text-xs text-neutral-400 hover:text-neutral-200 min-h-[44px] py-2">
            ← Return to Shortener Main App
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500 selection:text-white p-4 sm:p-8">
      {/* Top Admin Navbar (Touch-Optimized Responsive Stack) */}
      <header className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <span className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-400 border border-indigo-900/60 font-semibold font-mono uppercase tracking-wider">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAdminData(adminKey, page, pageSize)}
            disabled={loading}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[44px] flex items-center gap-1.5"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[44px]"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Admin Dashboard Container */}
      <main className="w-full max-w-6xl mx-auto space-y-5 pt-4 sm:pt-6 flex-1">
        {/* Metric Summary Widgets (2x2 on Mobile, 4x1 on Desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3.5 sm:p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
            <span className="text-[11px] sm:text-xs text-neutral-300 font-medium">Total Links</span>
            <p className="text-xl sm:text-2xl font-extrabold text-white font-mono">{stats.totalUrls}</p>
          </div>
          <div className="p-3.5 sm:p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
            <span className="text-[11px] sm:text-xs text-neutral-300 font-medium">Total Clicks</span>
            <p className="text-xl sm:text-2xl font-extrabold text-indigo-400 font-mono">{stats.totalClicks}</p>
          </div>
          <div className="p-3.5 sm:p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
            <span className="text-[11px] sm:text-xs text-neutral-300 font-medium">Active Links</span>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">{stats.activeUrls}</p>
          </div>
          <div className="p-3.5 sm:p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
            <span className="text-[11px] sm:text-xs text-neutral-300 font-medium">Expired Links</span>
            <p className="text-xl sm:text-2xl font-extrabold text-neutral-400 font-mono">{stats.expiredUrls}</p>
          </div>
        </div>

        {/* Search & Filter Controls (Vertical Stack on Mobile) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search links, title, URL, or Client ID..."
              className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-base sm:text-xs text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-indigo-500/80 min-h-[44px]"
            />
            <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-300 shrink-0 font-medium">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'active' | 'expired'); setPage(1); }}
              className="flex-1 sm:flex-none bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer min-h-[44px]"
            >
              <option value="all">All Links ({stats.totalUrls})</option>
              <option value="active">Active Only ({stats.activeUrls})</option>
              <option value="expired">Expired Only ({stats.expiredUrls})</option>
            </select>
          </div>
        </div>

        {/* Links List: Mobile Responsive Cards (visible on mobile) */}
        <div className="block md:hidden space-y-3">
          {filteredUrls.length === 0 ? (
            <div className="p-6 text-center text-neutral-400 text-xs bg-neutral-900 border border-neutral-800 rounded-xl">
              No shortened links found matching your search filter.
            </div>
          ) : (
            filteredUrls.map((record) => (
              <div key={record.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <UrlItemRow
                  record={record}
                  now={now}
                  origin={origin}
                  onDelete={handleDelete}
                  onOpenQr={setQrRecord}
                  showClientId={true}
                />
              </div>
            ))
          )}
        </div>

        {/* Links Data Table (visible on desktop) */}
        <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
          {filteredUrls.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-neutral-400 text-xs">
              <p>No shortened links found matching your search filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 text-neutral-300 font-mono uppercase tracking-wider text-[11px] border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Webpage / Short Code</th>
                    <th className="py-3 px-4">Original Target URL</th>
                    <th className="py-3 px-4 text-center">Clicks</th>
                    <th className="py-3 px-4">Expiration / Created</th>
                    <th className="py-3 px-4">Client ID</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredUrls.map((record) => {
                    const isCopied = copiedId === record.id;
                    const isDeleting = deletingId === record.id;
                    const isConfirming = confirmId === record.id;
                    const isExpired = record.expires_at ? new Date(record.expires_at).getTime() < now : false;
                    const faviconUrl = getFaviconUrl(record.original_url);

                    return (
                      <tr
                        key={record.id}
                        className={`hover:bg-neutral-800/40 transition-colors ${
                          isExpired ? 'opacity-60' : ''
                        }`}
                      >
                        {/* Title & Short Link */}
                        <td className="py-3 px-4 space-y-0.5 max-w-[200px]">
                          <div className="flex items-center gap-2 truncate">
                            <FaviconImage src={faviconUrl} />
                            <span className="font-semibold text-neutral-200 truncate">
                              {record.title || record.short_code}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`/${record.short_code}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`font-mono text-xs ${
                                isExpired
                                  ? 'text-neutral-400 line-through'
                                  : 'text-indigo-400 hover:underline font-semibold'
                              }`}
                            >
                              /{record.short_code}
                            </a>
                          </div>
                        </td>

                        {/* Destination Target URL */}
                        <td className="py-3 px-4 max-w-[260px]">
                          <p className="font-mono text-neutral-300 truncate" title={record.original_url}>
                            {record.original_url}
                          </p>
                        </td>

                        {/* Total Clicks */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-neutral-200">
                          <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800">
                            {record.clicks}
                          </span>
                        </td>

                        {/* Dates / Expiration */}
                        <td className="py-3 px-4 space-y-0.5">
                          {isExpired ? (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-900/60 font-semibold inline-block">
                              Expired
                            </span>
                          ) : record.expires_at ? (
                            <p className="text-[11px] text-neutral-300 font-mono">
                              Exp: {new Date(record.expires_at).toLocaleDateString()}
                            </p>
                          ) : (
                            <p className="text-[11px] text-neutral-400 font-mono">Never</p>
                          )}
                          <p className="text-[10px] text-neutral-400 font-mono">
                            Added: {new Date(record.created_at).toLocaleDateString()}
                          </p>
                        </td>

                        {/* Client ID */}
                        <td className="py-3 px-4">
                          {record.client_id ? (
                            <span className="font-mono text-[11px] text-neutral-300 bg-neutral-950 px-2 py-1 rounded border border-neutral-800 truncate block max-w-[110px]" title={record.client_id}>
                              {record.client_id.substring(0, 10)}...
                            </span>
                          ) : (
                            <span className="text-neutral-400 font-mono text-[11px]">System</span>
                          )}
                        </td>

                        {/* Actions Bar */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setQrRecord(record)}
                              className="p-1.5 text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded transition-colors cursor-pointer"
                              title="View QR Code"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                              </svg>
                            </button>

                            <button
                              onClick={() => copyToClipboard(record.id, record.short_code)}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                                isCopied
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                              }`}
                            >
                              {isCopied ? 'Copied' : 'Copy'}
                            </button>

                            {isConfirming ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(record.id)}
                                  disabled={isDeleting}
                                  className="px-2 py-1 text-[11px] font-semibold bg-red-600 hover:bg-red-500 disabled:bg-red-900 text-white rounded cursor-pointer"
                                >
                                  {isDeleting ? '...' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setConfirmId(null)}
                                  disabled={isDeleting}
                                  className="px-1.5 py-1 text-[11px] text-neutral-400 hover:text-neutral-200 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmId(record.id)}
                                className="px-2 py-1 text-[11px] font-medium text-neutral-400 hover:text-red-400 transition-colors cursor-pointer rounded border border-neutral-800"
                                title="Delete link"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ponytail: pagination footer. Uses server-side totals so the
            "Showing N of M" is accurate even when search/filter hides
            every row on the current page. */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
            <p className="text-xs text-neutral-400 font-mono">
              Showing <span className="text-neutral-200 font-semibold">{(page - 1) * pageSize + 1}</span>–
              <span className="text-neutral-200 font-semibold">{Math.min(page * pageSize, total)}</span> of{' '}
              <span className="text-neutral-200 font-semibold">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
                className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer min-h-[40px]"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[40px]"
              >
                ← Prev
              </button>
              <span className="text-xs text-neutral-300 font-mono px-2">
                Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
              </span>
              <button
                onClick={() => setPage((p) => (p * pageSize < total ? p + 1 : p))}
                disabled={page * pageSize >= total}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[40px]"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Instant QR Code Modal */}
      {qrRecord && (
        <QrModal
          shortUrl={
            origin
              ? `${origin}/${qrRecord.short_code}`
              : `/${qrRecord.short_code}`
          }
          shortCode={qrRecord.short_code}
          title={qrRecord.title}
          onClose={() => setQrRecord(null)}
        />
      )}
    </div>
  );
}
