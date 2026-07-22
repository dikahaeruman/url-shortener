'use client';

import { useState } from 'react';
import type { UrlRecord } from '@/lib/supabase';
import { getFaviconUrl } from '@/lib/utils';
import FaviconImage from './FaviconImage';

interface UrlItemRowProps {
  record: UrlRecord;
  now: number;
  origin: string;
  onDelete: (id: string) => Promise<void>;
  onOpenQr: (record: UrlRecord) => void;
  showClientId?: boolean;
}

export default function UrlItemRow({
  record,
  now,
  origin,
  onDelete,
  onOpenQr,
  showClientId = false,
}: UrlItemRowProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isExpired = record.expires_at ? new Date(record.expires_at).getTime() < now : false;
  const faviconUrl = getFaviconUrl(record.original_url);
  const shortUrl = origin ? `${origin}/${record.short_code}` : `/${record.short_code}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(record.id);
      setIsConfirming(false);
    } catch (err) {
      console.error('Failed to delete link:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`p-3.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-800/40 transition-colors ${
        isExpired ? 'opacity-60' : ''
      }`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 truncate">
          <FaviconImage src={faviconUrl} />
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

          {showClientId && record.client_id && (
            <span className="text-[10px] text-neutral-400 font-mono bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800" title={record.client_id}>
              Client: {record.client_id.substring(0, 8)}...
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-400 truncate font-mono">
          {record.original_url}
        </p>
      </div>

      {/* Touch Optimized Actions Bar (Minimum 44px Touch Targets) */}
      <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0 pt-1 sm:pt-0">
        <button
          onClick={() => onOpenQr(record)}
          className="px-2.5 py-2 text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors cursor-pointer min-h-[44px] flex items-center justify-center"
          title="View / Download QR Code"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </button>

        <button
          onClick={copyToClipboard}
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
              onClick={handleConfirmDelete}
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
              onClick={() => setIsConfirming(false)}
              disabled={isDeleting}
              className="px-3 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 cursor-pointer min-h-[44px] flex items-center justify-center"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsConfirming(true)}
            className="px-3 py-2 text-xs font-medium text-neutral-400 hover:text-red-400 transition-colors cursor-pointer min-h-[44px] flex items-center justify-center rounded-md border border-neutral-800 sm:border-transparent"
            title="Delete"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
