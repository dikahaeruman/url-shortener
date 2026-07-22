'use client';

import { useEffect, useState } from 'react';
import Logo from './Logo';

interface RedirectCountdownProps {
  targetUrl: string;
  shortCode: string;
}

export default function RedirectCountdown({ targetUrl, shortCode }: RedirectCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(3);

  useEffect(() => {
    if (secondsLeft <= 0) {
      window.location.href = targetUrl;
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft, targetUrl]);

  const handleRedirectNow = () => {
    window.location.href = targetUrl;
  };

  const progressPercent = ((3 - secondsLeft) / 3) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="w-full max-w-xl flex items-center justify-between py-4">
        <a href="/">
          <Logo size="md" />
        </a>
      </header>

      {/* Main Countdown Card */}
      <main className="w-full max-w-md my-auto text-center space-y-6">
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl space-y-6">
          {/* Animated Timer Display */}
          <div className="space-y-3">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              {/* Circular Progress Ring */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-neutral-800"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-indigo-500 transition-all duration-1000 ease-linear"
                  strokeDasharray={`${progressPercent}, 100`}
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-mono text-2xl font-bold text-white">
                {secondsLeft > 0 ? secondsLeft : '0'}
              </span>
            </div>

            <h1 className="text-lg font-bold text-white">
              {secondsLeft > 0 ? `Redirecting in ${secondsLeft} seconds...` : 'Redirecting now...'}
            </h1>
            <p className="text-xs text-neutral-300">
              Holding brief delay to ensure target page loads completely.
            </p>
          </div>

          {/* Target Destination Box */}
          <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-xl space-y-1 text-left">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
              Destination Target
            </span>
            <p className="text-xs text-indigo-400 font-mono truncate font-medium">
              {targetUrl}
            </p>
          </div>

          {/* Manual Redirect Button */}
          <button
            onClick={handleRedirectNow}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Click to Redirect Instantly</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-neutral-400 font-mono">
        Pendekin — Short Code: /{shortCode}
      </footer>
    </div>
  );
}
