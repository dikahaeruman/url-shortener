'use client';

import { useState } from 'react';
import { getOrCreateClientId, getFaviconUrl } from '@/lib/utils';
import QrModal from './QrModal';

interface UrlFormProps {
  onUrlCreated?: () => void;
}

export default function UrlForm({ onUrlCreated }: UrlFormProps) {
  const [url, setUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [expiresIn, setExpiresIn] = useState<'never' | '1h' | '24h' | '7d' | '30d'>('never');
  const [showAlias, setShowAlias] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    short_url: string;
    short_code: string;
    original_url: string;
    expires_at?: string | null;
    title?: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const clientId = getOrCreateClientId();
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId,
        },
        body: JSON.stringify({
          original_url: url.trim(),
          custom_code: customCode.trim() || undefined,
          expires_in: expiresIn !== 'never' ? expiresIn : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to shorten URL.');
      }

      setResult({
        short_url: data.short_url,
        short_code: data.short_code,
        original_url: data.original_url,
        expires_at: data.expires_at,
        title: data.title,
      });
      setUrl('');
      setCustomCode('');
      setExpiresIn('never');

      if (onUrlCreated) {
        onUrlCreated();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.short_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Main Input Box */}
        <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-neutral-900 border border-neutral-800 rounded-xl focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-colors">
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste your long URL here..."
            disabled={loading}
            className="flex-1 bg-transparent px-3.5 py-3 text-base sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none disabled:opacity-50 min-h-[48px]"
            required
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white text-base sm:text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0 min-h-[48px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Shortening...</span>
              </span>
            ) : (
              <span>Shorten</span>
            )}
          </button>
        </div>

        {/* Alias Toggle & Expiration Settings */}
        <div className="px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
          {!showAlias ? (
            <button
              type="button"
              onClick={() => setShowAlias(true)}
              className="text-xs text-neutral-400 hover:text-indigo-400 transition-colors cursor-pointer min-h-[44px] flex items-center gap-1 font-medium"
            >
              + Add custom alias (optional)
            </button>
          ) : (
            <div className="flex items-center gap-2 p-2 bg-neutral-900/80 border border-neutral-800 rounded-lg text-sm sm:text-xs min-h-[48px] flex-1">
              <span className="text-neutral-500 font-mono pl-1 select-none">/</span>
              <input
                type="text"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="custom-alias"
                disabled={loading}
                maxLength={30}
                className="flex-1 bg-transparent text-neutral-200 font-mono placeholder-neutral-600 focus:outline-none py-1 text-base sm:text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  setShowAlias(false);
                  setCustomCode('');
                }}
                className="text-neutral-500 hover:text-neutral-300 px-3 py-1 cursor-pointer min-h-[44px] flex items-center justify-center text-base"
                aria-label="Remove custom alias"
              >
                ✕
              </button>
            </div>
          )}

          {/* Expiration Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 min-h-[44px]">
            <span className="text-neutral-500 shrink-0 font-medium">Expires:</span>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value as any)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer min-h-[40px] transition-colors"
            >
              <option value="never">Never</option>
              <option value="1h">1 Hour</option>
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
            </select>
          </div>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-3.5 bg-red-950/50 border border-red-900/50 rounded-lg text-red-300 text-xs flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3 text-left transition-all duration-200">
          <div className="flex items-center gap-2 truncate">
            {/* eslint-disable-next-html-image-element */}
            <img
              src={getFaviconUrl(result.original_url)}
              alt=""
              className="w-4 h-4 rounded shrink-0 bg-neutral-800"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-sm font-semibold text-neutral-200 truncate">
              {result.title || result.short_code}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-neutral-950 border border-neutral-800/80 rounded-lg">
            <a
              href={result.short_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 font-mono text-base sm:text-sm font-semibold truncate py-1 transition-colors hover:underline"
            >
              {result.short_url}
            </a>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQrModal(true)}
                className="px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-md transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                title="View QR Code"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>QR Code</span>
              </button>
              <button
                onClick={copyToClipboard}
                className={`flex-1 sm:flex-none px-4 py-2.5 text-sm sm:text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 min-h-[44px] flex items-center justify-center ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
          <p className="text-xs text-neutral-500 truncate">
            Target: <span className="text-neutral-400 font-mono">{result.original_url}</span>
            {result.expires_at && (
              <span className="ml-2 text-indigo-400/80 font-mono">
                (Expires: {new Date(result.expires_at).toLocaleString()})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Instant QR Code Modal */}
      {showQrModal && result && (
        <QrModal
          shortUrl={result.short_url}
          shortCode={result.short_code}
          title={result.title}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
}
