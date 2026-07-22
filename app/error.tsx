'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="w-full max-w-xl flex items-center justify-between py-4">
        <Link href="/">
          <Logo size="md" />
        </Link>
      </header>

      {/* Main Error Card */}
      <main className="w-full max-w-md my-auto text-center space-y-6">
        <div className="p-6 sm:p-8 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-900/60 flex items-center justify-center mx-auto text-red-400 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-red-400 px-3 py-1 rounded-full bg-red-950/80 border border-red-900/60 inline-block">
              Application Error
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Something Went Wrong</h1>
            <p className="text-xs text-neutral-300 max-w-xs mx-auto">
              An unexpected error occurred while processing your request. Please try again or return home.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <button
              onClick={reset}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer min-h-[48px]"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm font-semibold rounded-xl transition-colors min-h-[48px] flex items-center justify-center"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-neutral-400 font-mono">
        Pendekin — System Error Handler
      </footer>
    </div>
  );
}
