'use client';

import { useState, useEffect, type FormEvent } from 'react';

interface ReportAbuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShortCode?: string;
  initialUrl?: string;
  onReportSuccess?: () => void;
}

const REPORT_REASONS = [
  { id: 'phishing', label: '🎣 Phishing / Pencurian Akun', desc: 'Meniru situs resmi untuk mencuri login, sandi, atau data kartu kredit' },
  { id: 'malware', label: '🦠 Malware / Virus / File Berbahaya', desc: 'Mengunduh software berbahaya, ransomware, atau APK tak resmi' },
  { id: 'scam', label: '💸 Penipuan Finansial / Scam', desc: 'Investasi bodong, undian palsu, atau penipuan uang digital' },
  { id: 'illegal', label: '🚫 Konten Ilegal / Judi Online', desc: 'Promosi judi online, pornografi, atau konten yang melanggar hukum' },
  { id: 'spam', label: '📢 Spam / Penipuan Iklan', desc: 'Tautan redirect berulang, popup agresif, atau spam massal' },
  { id: 'other', label: '⚠️ Pelanggaran Lainnya', desc: 'Penyalahgunaan lain yang melanggar ketentuan layanan Pendekin' },
];

interface ReportAbuseFormProps {
  initialShortCode: string;
  initialUrl: string;
  onClose: () => void;
  onReportSuccess?: () => void;
}

function ReportAbuseForm({
  initialShortCode,
  initialUrl,
  onClose,
  onReportSuccess,
}: ReportAbuseFormProps) {
  const [urlOrCode, setUrlOrCode] = useState(initialShortCode || initialUrl || '');
  const [reason, setReason] = useState('phishing');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    disabled?: boolean;
  } | null>(null);

  // Close modal when user presses Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!urlOrCode.trim()) {
      setStatusMessage({ type: 'error', text: 'Silakan masukkan tautan atau kode yang ingin dilaporkan.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          short_code: urlOrCode.trim(),
          url: urlOrCode.trim(),
          reason,
          details: details.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim laporan.');
      }

      setStatusMessage({
        type: 'success',
        text: data.message || 'Laporan berhasil dikirim.',
        disabled: data.disabled,
      });

      if (onReportSuccess) {
        onReportSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 text-neutral-100 space-y-5">
      {/* Modal Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-950/80 border border-red-800/60 text-red-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <h2 id="report-modal-title" className="text-lg font-bold text-white">
              Laporkan Tautan Bermasalah
            </h2>
          </div>
          <p className="text-xs text-neutral-400">
            Bantu kami melindungi pengguna. Tautan phishing & malware langsung dinonaktifkan secara otomatis.
          </p>
        </div>
        <button
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Tutup"
          className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Status Notification */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
              : 'bg-red-950/60 border-red-800/80 text-red-300'
          }`}
        >
          <div className="flex items-start gap-2">
            {statusMessage.type === 'success' ? (
              <svg className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mt-0.5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="space-y-1">
              <p className="font-semibold">{statusMessage.text}</p>
              {statusMessage.disabled && (
                <p className="text-[11px] text-emerald-400/90 font-mono">
                  Status: Dinonaktifkan (Auto-disabled) demi keamanan domain.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {statusMessage?.type === 'success' ? (
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input URL or Short Code */}
          <div className="space-y-1.5">
            <label htmlFor="report-url-input" className="block text-xs font-medium text-neutral-300">
              Tautan Pendekin / URL yang Dilaporkan <span className="text-red-400">*</span>
            </label>
            <input
              id="report-url-input"
              type="text"
              value={urlOrCode}
              onChange={(e) => setUrlOrCode(e.target.value)}
              placeholder="misal: pendekin.link/contoh atau kode pendek"
              required
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/80 font-mono transition-all"
            />
          </div>

          {/* Select Reason */}
          <div className="space-y-1.5">
            <label htmlFor="report-reason-select" className="block text-xs font-medium text-neutral-300">
              Kategori Pelanggaran <span className="text-red-400">*</span>
            </label>
            <select
              id="report-reason-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/80 transition-all"
            >
              {REPORT_REASONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-400 italic">
              {REPORT_REASONS.find((r) => r.id === reason)?.desc}
            </p>
          </div>

          {/* Details Textarea */}
          <div className="space-y-1.5">
            <label htmlFor="report-details-input" className="block text-xs font-medium text-neutral-300">
              Keterangan Tambahan <span className="text-neutral-400 font-normal">(Opsional)</span>
            </label>
            <textarea
              id="report-details-input"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Contoh: Mengaku sebagai login bank resmi dan meminta OTP..."
              className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/80 transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-red-950/50"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" stroke="currentColor" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Mengirim Laporan...</span>
                </>
              ) : (
                <span>Kirim Laporan & Nonaktifkan Tautan</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ReportAbuseModal({
  isOpen,
  onClose,
  initialShortCode = '',
  initialUrl = '',
  onReportSuccess,
}: ReportAbuseModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <ReportAbuseForm
        key={`${initialShortCode}_${initialUrl}`}
        initialShortCode={initialShortCode}
        initialUrl={initialUrl}
        onClose={onClose}
        onReportSuccess={onReportSuccess}
      />
    </div>
  );
}
