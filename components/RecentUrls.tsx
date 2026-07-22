'use client';

import { useEffect, useState } from 'react';
import type { UrlRecord } from '@/lib/supabase';
import { getOrCreateClientId } from '@/lib/utils';
import QrModal from './QrModal';
import UrlItemRow from './UrlItemRow';
import { useCurrentTime } from '@/hooks/useCurrentTime';
import { useOrigin } from '@/hooks/useOrigin';

interface RecentUrlsProps {
  refreshTrigger?: number;
}

export default function RecentUrls({ refreshTrigger = 0 }: RecentUrlsProps) {
  const [urls, setUrls] = useState<UrlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrRecord, setQrRecord] = useState<UrlRecord | null>(null);

  const now = useCurrentTime();
  const origin = useOrigin();

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

  const handleDelete = async (id: string) => {
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
      }
    } catch (err) {
      console.error('Error deleting link:', err);
    }
  };

  // Silent Loading: Do not render any skeleton boxes or layout jumpers while loading
  if (loading || urls.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-xl mx-auto mt-8 text-left animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
          Your Links
        </span>
        <span className="text-xs text-neutral-400 font-mono">{urls.length} links</span>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800/70 overflow-hidden">
        {urls.map((record) => (
          <UrlItemRow
            key={record.id}
            record={record}
            now={now}
            origin={origin}
            onDelete={handleDelete}
            onOpenQr={setQrRecord}
          />
        ))}
      </div>

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
