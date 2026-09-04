'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Logo from './Logo';
import ReportAbuseModal from './ReportAbuseModal';
import { getFaviconUrl } from '@/lib/utils';

interface WarningInterstitialProps {
  shortCode?: string;
  targetUrl: string;
  hostname: string;
}

export default function WarningInterstitial({
  shortCode = '',
  targetUrl,
  hostname,
}: WarningInterstitialProps) {
  const TOTAL_DURATION_MS = 2000;
  const TICK_INTERVAL_MS = 50;

  const [remainingMs, setRemainingMs] = useState(TOTAL_DURATION_MS);
  const [isPaused, setIsPaused] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  const redirectingRef = useRef(false);

  const proceedToDestination = useCallback(() => {
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    setHasRedirected(true);
    window.location.replace(targetUrl);
  }, [targetUrl]);

  useEffect(() => {
    if (isPaused || isReportModalOpen || hasRedirected) return;

    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - TICK_INTERVAL_MS;
        if (next <= 0) {
          clearInterval(interval);
          proceedToDestination();
          return 0;
        }
        return next;
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isPaused, isReportModalOpen, hasRedirected, proceedToDestination]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy target URL:', err);
    }
  };

  const handleReportClick = () => {
    setIsPaused(true);
    setIsReportModalOpen(true);
  };

  const secondsDisplay = (Math.max(0, remainingMs) / 1000).toFixed(1);
  const progressPercent = Math.max(0, Math.min(100, (remainingMs / TOTAL_DURATION_MS) * 100));
  const favicon = getFaviconUrl(targetUrl);

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-neutral-950 text-neutral-100 font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
      <header className="w-full max-w-xl flex items-center justify-between py-4">
        <Link href="/">
          <Logo size="md" />
        </Link>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-950/70 border border-amber-800/80 text-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          Peringatan Domain Luar
        </span>
      </header>

      {/* Main Interstitial Card */}
      <main className="w-full max-w-lg my-auto space-y-6">
        <div className="p-6 sm:p-8 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl space-y-6 text-center">
          {/* Animated Shield Warning Icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-950/70 border border-amber-800/80 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-950/40">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Peringatan: Tautan Eksternal
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              Domain tujuan belum termasuk dalam daftar whitelist tepercaya Pendekin. Pastikan Anda mengenali situs ini sebelum melanjutkan.
            </p>
          </div>

          {/* Destination URL Box */}
          <div className="p-4 bg-neutral-950/90 border border-neutral-800 rounded-xl text-left space-y-2">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
              <span className="uppercase tracking-wider">Tujuan URL Pengalihan:</span>
              {shortCode && <span className="text-neutral-500">/{shortCode}</span>}
            </div>

            <div className="flex items-center gap-3">
              <img
                src={favicon}
                alt=""
                className="w-5 h-5 rounded shrink-0 bg-neutral-800 p-0.5"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white font-mono truncate">
                  {hostname}
                </p>
                <p className="text-xs text-neutral-400 truncate font-mono">
                  {targetUrl}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Salin URL tujuan"
                title="Salin URL tujuan"
                className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors shrink-0"
              >
                {isCopied ? (
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* 2-Second Countdown Display & Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isPaused ? (
                  <span className="text-amber-300 font-medium">Pengalihan otomatis dijeda</span>
                ) : hasRedirected ? (
                  <span className="text-emerald-300 font-medium">Mengarahkan sekarang...</span>
                ) : (
                  <span>
                    Mengarahkan otomatis dalam <b className="font-mono text-white text-sm">{secondsDisplay} detik</b>
                  </span>
                )}
              </span>

              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="text-[11px] font-medium text-neutral-400 hover:text-neutral-200 underline decoration-dotted transition-colors"
              >
                {isPaused ? 'Lanjutkan Countdown' : 'Jeda'}
              </button>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
              <div
                className={`h-full transition-all duration-75 ${
                  isPaused ? 'bg-amber-600/50' : 'bg-gradient-to-r from-amber-500 to-indigo-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={proceedToDestination}
              className="w-full sm:w-1/2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-1.5"
            >
              <span>Lanjut Sekarang</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>

            <Link
              href="/"
              className="w-full sm:w-1/2 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl transition-colors text-center"
            >
              Batal & Kembali
            </Link>
          </div>

          {/* Abuse Reporting Trigger */}
          <div className="pt-2 border-t border-neutral-800/80">
            <button
              type="button"
              onClick={handleReportClick}
              className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Mencurigakan? Laporkan Tautan Ini (Report Phishing/Abuse)</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-neutral-400 font-mono">
        Pendekin — Domain & Reputation Protection
      </footer>

      {/* Report Abuse Modal */}
      <ReportAbuseModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        initialShortCode={shortCode}
        initialUrl={targetUrl}
      />
    </div>
  );
}
