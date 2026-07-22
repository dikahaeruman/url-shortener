import { notFound } from 'next/navigation';
import { supabase, isSupabaseConfigured, UrlRecord } from '@/lib/supabase';
import RedirectCountdown from '@/components/RedirectCountdown';
import ExpiredLink from '@/components/ExpiredLink';

export default async function ShortCodeRedirectPage({
  params,
}: {
  params: Promise<{ short_code: string }>;
}) {
  const { short_code } = await params;

  if (!short_code || !isSupabaseConfigured()) {
    notFound();
  }

  const { data, error } = await supabase
    .from('urls')
    .select('id, original_url, clicks, short_code, expires_at')
    .eq('short_code', short_code)
    .maybeSingle();

  const record = data as Pick<UrlRecord, 'id' | 'original_url' | 'clicks' | 'short_code' | 'expires_at'> | null;

  if (error || !record || !record.original_url) {
    notFound();
  }

  // Check TTL Expiration
  if (record.expires_at) {
    const expiresTime = new Date(record.expires_at).getTime();
    // eslint-disable-next-line react-hooks/purity
    const nowTime = Date.now();
    if (expiresTime < nowTime) {
      return <ExpiredLink shortCode={record.short_code} />;
    }
  }

  // Atomically increment click count in Database before redirect rendering
  try {
    const { error: rpcError } = await supabase.rpc('increment_url_clicks', { row_id: record.id });
    if (rpcError) {
      await supabase
        .from('urls')
        .update({ clicks: (record.clicks || 0) + 1 })
        .eq('id', record.id);
    }
  } catch (err) {
    console.error('Failed to increment click count:', err);
  }

  return (
    <RedirectCountdown
      targetUrl={record.original_url}
      shortCode={record.short_code}
    />
  );
}
