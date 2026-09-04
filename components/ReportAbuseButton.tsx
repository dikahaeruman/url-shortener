'use client';

import { useState } from 'react';
import ReportAbuseModal from './ReportAbuseModal';

interface ReportAbuseButtonProps {
  variant?: 'button' | 'link' | 'header';
  className?: string;
}

export default function ReportAbuseButton({
  variant = 'button',
  className = '',
}: ReportAbuseButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-all ${className}`}
        >
          <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Laporkan Tautan</span>
        </button>
      ) : variant === 'link' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`hover:text-neutral-200 transition-colors underline decoration-neutral-700 underline-offset-4 ${className}`}
        >
          Laporkan Tautan
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-medium text-neutral-300 hover:text-white transition-colors ${className}`}
        >
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Laporkan Tautan Mencurigakan</span>
        </button>
      )}

      <ReportAbuseModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
