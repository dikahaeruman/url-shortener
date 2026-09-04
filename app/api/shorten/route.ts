import { supabase, isSupabaseConfigured, UrlRecord } from '@/lib/supabase';
import { isValidCustomCode } from '@/lib/utils';
import { validateUrlSafety, fetchTargetTitleSafe, checkSafeBrowsing } from '@/lib/url-safety-server';
import { rateLimit } from '@/lib/rateLimit';
import { insertUrl } from '@/lib/url-storage';
import { NextResponse } from 'next/server';

function getClientIp(request: Request): string {
  // ponytail: trust x-real-ip (set by NPM/nginx from $remote_addr) over
  // x-forwarded-for — the client can forge the first XFF entry and
  // rotate it to bypass per-IP rate limits.
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}

// ponytail: one place to gate on Supabase config. Returns either a
// 500 response (caller should return it) or null (continue).
function requireSupabase(): NextResponse | null {
  if (isSupabaseConfigured()) return null;
  return NextResponse.json(
    { error: 'Supabase credentials are not configured.' },
    { status: 500 }
  );
}

export async function POST(request: Request) {
  try {
    // ponytail: rate limit on writes only — reads stay open.
    if (!rateLimit(getClientIp(request))) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // ponytail: 4KB hard cap on the body. Short code + URL + a few
    // headers can't legitimately exceed this; anything bigger is junk
    // or a DoS attempt. 413 = Payload Too Large.
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > 4096) {
      return NextResponse.json(
        { error: 'Request body too large.' },
        { status: 413 }
      );
    }

    const supabaseError = requireSupabase();
    if (supabaseError) return supabaseError;

    const body = await request.json();
    const { original_url, custom_code, expires_in } = body;
    const clientId = request.headers.get('x-client-id') || body.client_id || null;
    const currentHost = request.headers.get('host') || request.headers.get('x-forwarded-host') || undefined;

    // Validate URL safety, dangerous protocols, and self-loop attempts
    const safetyCheck = await validateUrlSafety(original_url, currentHost);
    if (!safetyCheck.safe || !safetyCheck.normalizedUrl) {
      return NextResponse.json(
        { error: safetyCheck.error || 'Invalid or unsafe URL.' },
        { status: 400 }
      );
    }

    // ponytail: phishing/malware screen via Google Safe Browsing v4.
    // Fail-open — without GOOGLE_SAFE_BROWSING_API_KEY (or on Google API
    // errors) the check is skipped so creation never hard-fails. Flagged
    // URLs are rejected at creation, before the link goes live.
    const safeBrowsing = await checkSafeBrowsing(safetyCheck.normalizedUrl);
    if (!safeBrowsing.safe) {
      return NextResponse.json(
        { error: safeBrowsing.error || 'URL blocked by Google Safe Browsing.' },
        { status: 400 }
      );
    }

    // Validate custom code if provided
    let trimmedCustom: string | undefined;
    if (custom_code && typeof custom_code === 'string' && custom_code.trim().length > 0) {
      trimmedCustom = custom_code.trim();
      const validation = isValidCustomCode(trimmedCustom);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Compute expiry
    const expiresAt = computeExpiresAt(expires_in);

    // Insert (handles unique-violation retry internally)
    const result = await insertUrl({
      original_url: safetyCheck.normalizedUrl,
      client_id: clientId,
      expires_at: expiresAt,
      custom_code: trimmedCustom,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return finishCreate(request, result.record, safetyCheck.normalizedUrl);
  } catch (err) {
    console.error('Unexpected error in shorten API:', err);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}

function computeExpiresAt(expiresIn: unknown): string | null {
  if (!expiresIn || typeof expiresIn !== 'string') return null;
  const now = Date.now();
  switch (expiresIn) {
    case '1h':  return new Date(now + 60 * 60 * 1000).toISOString();
    case '24h': return new Date(now + 24 * 60 * 60 * 1000).toISOString();
    case '7d':  return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d': return new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
    default:    return null;
  }
}

// ponytail: extracted so the create handler can return early from
// multiple success branches without duplicating the URL-construction
// and background-title-fetch logic.
async function finishCreate(
  request: Request,
  record: UrlRecord,
  normalizedUrl: string
) {
  // ponytail: title fetch in the background so the create response is
  // not gated on a 3s HTML GET. Failure is non-fatal; the row is
  // already saved. Upgrade: use a queue + retry if titles become a
  // first-class product feature.
  if (record.id) {
    const rowId = record.id;
    void fetchTargetTitleSafe(normalizedUrl).then((fetchedTitle) => {
      if (!fetchedTitle) return;
      return supabase
        .from('urls')
        .update({ title: fetchedTitle })
        .eq('id', rowId);
    });
  }

  const origin = request.headers.get('origin') || request.headers.get('host') || '';
  const protocol = origin.includes('localhost') || origin.includes('127.0.0.1') ? 'http' : 'https';
  const baseUrl = origin ? (origin.startsWith('http') ? origin : `${protocol}://${origin}`) : '';
  const shortUrl = `${baseUrl}/${record.short_code}`;

  return NextResponse.json(
    {
      id: record.id,
      original_url: record.original_url,
      short_code: record.short_code,
      short_url: shortUrl,
      clicks: record.clicks,
      created_at: record.created_at,
      expires_at: record.expires_at,
      title: record.title,
    },
    { status: 201 }
  );
}

export async function GET(request: Request) {
  try {
    const supabaseError = requireSupabase();
    if (supabaseError) return NextResponse.json({ urls: [], configured: false }, { status: 200 });

    const { searchParams } = new URL(request.url);
    const clientId = request.headers.get('x-client-id') || searchParams.get('client_id');

    if (!clientId) {
      return NextResponse.json({ urls: [], configured: true }, { status: 200 });
    }

    const { data, error } = await supabase
      .from('urls')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Supabase error fetching client URLs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch URLs.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ urls: (data as UrlRecord[]) || [], configured: true }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error fetching client URLs:', err);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabaseError = requireSupabase();
    if (supabaseError) return supabaseError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clientId = request.headers.get('x-client-id') || searchParams.get('client_id');

    if (!id) {
      return NextResponse.json(
        { error: 'Record ID is required.' },
        { status: 400 }
      );
    }

    let query = supabase.from('urls').delete().eq('id', id);
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { error } = await query;

    if (error) {
      console.error('Supabase error deleting URL:', error);
      return NextResponse.json(
        { error: 'Failed to delete URL from database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error deleting URL:', err);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
