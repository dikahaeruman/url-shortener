import { redirect } from 'next/navigation';
import WarningInterstitial from '@/components/WarningInterstitial';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isBlockedHostname } from '@/lib/utils';

interface ResolvedWarning {
  targetUrl: string;
  hostname: string;
}

async function resolveWarningDestination(
  code?: string,
  target?: string
): Promise<ResolvedWarning | null> {
  let resolvedTarget = target;

  // If target URL is not supplied in query params, fetch from database by code
  if (!resolvedTarget && code && isSupabaseConfigured()) {
    const { data } = await supabase
      .from('urls')
      .select('original_url, expires_at')
      .eq('short_code', code)
      .maybeSingle();

    if (data?.expires_at) {
      const expiresTime = new Date(data.expires_at).getTime();
      if (expiresTime < Date.now()) {
        redirect(`/expired?code=${encodeURIComponent(code)}`);
      }
    }

    if (data?.original_url) {
      resolvedTarget = data.original_url;
    }
  }

  if (!resolvedTarget) {
    return null;
  }

  try {
    const parsed = new URL(resolvedTarget);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    if (isBlockedHostname(parsed.hostname.toLowerCase())) {
      return null;
    }

    return {
      targetUrl: parsed.toString(),
      hostname: parsed.hostname,
    };
  } catch {
    return null;
  }
}

export default async function WarningPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; target?: string }>;
}) {
  const { code, target } = await searchParams;
  const destination = await resolveWarningDestination(code, target);

  if (!destination) {
    redirect('/not-found');
  }

  return (
    <WarningInterstitial
      shortCode={code || ''}
      targetUrl={destination.targetUrl}
      hostname={destination.hostname}
    />
  );
}
