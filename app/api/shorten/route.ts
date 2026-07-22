import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, UrlRecord } from '@/lib/supabase';
import { generateShortCode, isValidCustomCode, validateUrlSafety, fetchTargetTitle } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            'Supabase credentials are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { original_url, custom_code, expires_in } = body;
    const clientId = request.headers.get('x-client-id') || body.client_id || null;
    const currentHost = request.headers.get('host') || request.headers.get('x-forwarded-host') || undefined;

    // Validate URL safety, dangerous protocols, and self-loop attempts
    const safetyCheck = validateUrlSafety(original_url, currentHost);
    if (!safetyCheck.safe || !safetyCheck.normalizedUrl) {
      return NextResponse.json(
        { error: safetyCheck.error || 'Invalid or unsafe URL.' },
        { status: 400 }
      );
    }

    const normalizedUrl = safetyCheck.normalizedUrl;

    // Automatically fetch target page title with fast 3s timeout
    const fetchedTitle = await fetchTargetTitle(normalizedUrl);

    let shortCode = '';

    // Calculate Expiration Timestamp
    let expiresAt: string | null = null;
    if (expires_in && typeof expires_in === 'string') {
      const now = Date.now();
      switch (expires_in) {
        case '1h':
          expiresAt = new Date(now + 60 * 60 * 1000).toISOString();
          break;
        case '24h':
          expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
          break;
        case '7d':
          expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
          expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          expiresAt = null;
      }
    }

    // Handle Custom Short Code if provided
    if (custom_code && typeof custom_code === 'string' && custom_code.trim().length > 0) {
      const trimmedCustom = custom_code.trim();
      const validation = isValidCustomCode(trimmedCustom);

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // Check if custom_code already exists
      const { data: existing } = await supabase
        .from('urls')
        .select('short_code')
        .eq('short_code', trimmedCustom)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: `The custom code "${trimmedCustom}" is already in use. Please choose another.` },
          { status: 409 }
        );
      }

      shortCode = trimmedCustom;
    } else {
      // Auto-generate unique short code
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!isUnique && attempts < maxAttempts) {
        attempts++;
        shortCode = generateShortCode(6);

        const { data: existing } = await supabase
          .from('urls')
          .select('short_code')
          .eq('short_code', shortCode)
          .maybeSingle();

        if (!existing) {
          isUnique = true;
        }
      }

      if (!isUnique) {
        return NextResponse.json(
          { error: 'Failed to generate unique short code. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Insert new URL record into Supabase
    const { data, error } = await supabase
      .from('urls')
      .insert({
        original_url: normalizedUrl,
        short_code: shortCode,
        clicks: 0,
        client_id: clientId,
        expires_at: expiresAt,
        title: fetchedTitle,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Supabase error inserting URL:', error);
      return NextResponse.json(
        { error: 'Failed to store URL in database.' },
        { status: 500 }
      );
    }

    const record = data as UrlRecord;

    // Construct short URL
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
  } catch (err) {
    console.error('Unexpected error in shorten API:', err);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ urls: [], configured: false }, { status: 200 });
    }

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
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase credentials are not configured.' },
        { status: 500 }
      );
    }

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
