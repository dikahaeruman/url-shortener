'use client';

import { useEffect, useState } from 'react';
import type { UrlRecord } from '@/lib/supabase';
import { getOrCreateClientId, getFaviconUrl } from '@/lib/utils';
import QrModal from './QrModal';

interface RecentUrlsProps {
  refreshTrigger?: number;
}

export default function RecentUrls({ refreshTrigger = 0 }: RecentUrlsProps) {
  const [urls, setUrls] = useState<UrlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [qrRecord, setQrRecord] = useState<UrlRecord | null>(null);
  const [now] = useState<number>(() => Date.now());

  useEffect(() => {
    let isMounted = true;

    const fetchRecentUrls = async () => {
      try {
        const clientId = getOrCreateClientId();
        const res = await fetch('/api/shorten', {
          headers: {
            'x-client-id': clientId,
          },
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setUrls(data.urls || []);
        }
      } catch (err) {
        console.error('Error fetching recent URLs:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRecentUrls();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const copyToClipboard = async (id: string, shortCode: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shortUrl = `${origin}/${shortCode}`;
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
      const clientId = getOrCreateClientId();
      const res = await fetch(`/api/shorten?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-client-id': clientId,
        },
      });

      if (res.ok) {
        setUrls((prev) => prev.filter((item) => item.id !== id));
        setConfirmId(null);
      }
    } catch (err) {
      console.error('Error deleting link:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto mt-8 text-left space-y-2 animate-pulse">
        <div className="h-3 w-24 bg-neutral-800 rounded"></div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="h-4 bg-neutral-800 rounded w-3/4"></div>
          <div className="h-3 bg-neutral-800/60 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (urls.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-xl mx-auto mt-8 text-left">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
          Your Links
        </span>
        <span className="text-xs text-neutral-400 font-mono">{urls.length} links</span>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800/70 overflow-hidden">
        {urls.map((record) => {
          const isCopied = copiedId === record.id;
          const isDeleting = deletingId === record.id;
          const isConfirming = confirmId === record.id;
          const isExpired = record.expires_at ? new Date(record.expires_at).getTime() < now : false;
          const faviconUrl = getFaviconUrl(record.original_url);

          return (
            <div
              key={record.id}
              className={`p-3.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-800/40 transition-colors ${
                isExpired ? 'opacity-60' : ''
              }`}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 truncate">
                  <img
                    src={faviconUrl}
                    alt=""
                    className="w-4 h-4 rounded shrink-0 bg-neutral-800"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {record.title ? (
                    <span className="text-xs font-semibold text-neutral-200 truncate">
                      {record.title}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-neutral-300 font-mono truncate">
                      {record.short_code}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={`/${record.short_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-mono text-base sm:text-sm font-semibold transition-colors ${
                      isExpired ? 'text-neutral-400 line-through' : 'text-indigo-400 hover:text-indigo-300 hover:underline'
                    }`}
                  >
                    /{record.short_code}
                  </a>
                  <span className="text-xs text-neutral-300 font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800">
                    {record.clicks} clicks
                  </span>
                  {isExpired ? (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-900/60 font-semibold">
                      Expired
                    </span>
                  ) : record.expires_at ? (
                    <span className="text-[11px] font-mono text-neutral-400">
                      Expires: {new Date(record.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-neutral-400 truncate font-mono">
                  {record.original_url}
                </p>
              </div>

              {/* Touch Optimized Actions Bar */}
              <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0 pt-1 sm:pt-0">
                <button
                  onClick={() => setQrRecord(record)}
                  className="px-2.5 py-2 text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors cursor-pointer min-h-[44px] flex items-center justify-center"
                  title="View / Download QR Code"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </button>

                <button
                  onClick={() => copyToClipboard(record.id, record.short_code)}
                  className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer min-h-[44px] flex items-center justify-center ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  }`}
                >
                  {isCopied ? 'Copied' : 'Copy'}
                </button>

                {isConfirming ? (
                  <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                    <button
                      onClick={() => handleDelete(record.id)}
                      disabled={isDeleting}
                      className="flex-1 sm:flex-none px-3 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:bg-red-900 text-white rounded-md cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                    >
                      {isDeleting ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <span>Confirm</span>
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      disabled={isDeleting}
                      className="px-3 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 cursor-pointer min-h-[44px] flex items-center justify-center"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(record.id)}
                    className="px-3 py-2 text-xs font-medium text-neutral-400 hover:text-red-400 transition-colors cursor-pointer min-h-[44px] flex items-center justify-center rounded-md border border-neutral-800 sm:border-transparent"
                    title="Delete"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Instant QR Code Modal */}
      {qrRecord && (
        <QrModal
          shortUrl={
            typeof window !== 'undefined'
              ? `${window.location.origin}/${qrRecord.short_code}`
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
