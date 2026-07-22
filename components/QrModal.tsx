'use client';

import { useState } from 'react';

interface QrModalProps {
  shortUrl: string;
  shortCode: string;
  title?: string | null;
  onClose: () => void;
}

export default function QrModal({ shortUrl, shortCode, title, onClose }: QrModalProps) {
  const [downloading, setDownloading] = useState(false);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    shortUrl
  )}&color=ffffff&bgcolor=09090b`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(qrImageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pendekin-${shortCode}-qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download QR code:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg cursor-pointer"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="space-y-1 pt-1">
          <h3 className="text-base font-bold text-white">QR Code</h3>
          {title && <p className="text-xs text-neutral-400 truncate px-4">{title}</p>}
          <p className="text-xs text-indigo-400 font-mono font-medium truncate px-4">
            /{shortCode}
          </p>
        </div>

        {/* QR Code Image Container */}
        <div className="flex justify-center p-4 bg-neutral-950 border border-neutral-800 rounded-xl">
          {/* eslint-disable-next-html-image-element */}
          <img
            src={qrImageUrl}
            alt={`QR code for ${shortUrl}`}
            className="w-48 h-48 rounded-lg"
          />
        </div>

        {/* Download Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
          >
            {downloading ? (
              <span>Downloading...</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download PNG</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-xl cursor-pointer min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
