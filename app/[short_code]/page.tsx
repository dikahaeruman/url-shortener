import { redirect } from 'next/navigation';
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
    redirect('/?error=not_found');
  }

  const { data, error } = await supabase
    .from('urls')
    .select('id, original_url, clicks, short_code, expires_at')
    .eq('short_code', short_code)
    .maybeSingle();

  const record = data as Pick<UrlRecord, 'id' | 'original_url' | 'clicks' | 'short_code' | 'expires_at'> | null;

  if (error || !record || !record.original_url) {
    redirect('/?error=not_found');
  }

  // Check TTL Expiration
  if (record.expires_at) {
    const isExpired = new Date(record.expires_at).getTime() < Date.now();
    if (isExpired) {
      return <ExpiredLink shortCode={record.short_code} />;
    }
  }

  // Increment click count in background
  supabase
    .from('urls')
    .update({ clicks: (record.clicks || 0) + 1 })
    .eq('id', record.id)
    .then(() => {});

  return (
    <RedirectCountdown
      targetUrl={record.original_url}
      shortCode={record.short_code}
    />
  );
}
