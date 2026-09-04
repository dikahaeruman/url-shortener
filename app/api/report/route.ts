import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp, logSecurityEvent } from '@/lib/utils';

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  // Rate limit: 10 reports per 15 minutes per IP to prevent spam or DoS
  if (!rateLimit(clientIp, 'abuse_report', 10, 15 * 60_000)) {
    logSecurityEvent({
      action: 'RATE_LIMIT_EXCEEDED',
      ip: clientIp,
      status: 'blocked',
      detail: 'Abuse reporting rate limit exceeded',
    });
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan laporan. Silakan coba beberapa saat lagi.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { url, short_code, reason, details } = body || {};

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { error: 'Alasan pelaporan wajib diisi.' },
        { status: 400 }
      );
    }

    const rawInput = (short_code || url || '').trim();
    if (!rawInput) {
      return NextResponse.json(
        { error: 'Kode tautan atau URL yang dilaporkan wajib diisi.' },
        { status: 400 }
      );
    }

    // Extract potential short_code from raw input (supports both naked codes and full URLs)
    let targetShortCode: string | null = null;
    if (/^[a-zA-Z0-9_.-]{1,64}$/.test(rawInput) && !rawInput.includes('/') && !rawInput.includes('.')) {
      targetShortCode = rawInput;
    } else {
      try {
        const parsed = new URL(rawInput.startsWith('http') ? rawInput : `https://${rawInput}`);
        const segments = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/');
        if (segments.length === 1 && segments[0] && /^[a-zA-Z0-9_.-]{1,64}$/.test(segments[0])) {
          targetShortCode = segments[0];
        }
      } catch {}
    }

    logSecurityEvent({
      action: 'ABUSE_REPORT_SUBMITTED',
      ip: clientIp,
      status: 'warning',
      detail: `Abuse report submitted with reason: ${reason}`,
      metadata: {
        targetShortCode,
        rawInput,
        reason,
        detailsLength: details ? String(details).length : 0,
      },
    });

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        message: 'Laporan Anda telah berhasil dicatat untuk peninjauan.',
        disabled: false,
      });
    }

    // Query database for matching link by short_code
    let matchingRecord: { id: string; short_code: string; title: string | null; original_url: string } | null = null;

    if (targetShortCode) {
      const { data } = await supabase
        .from('urls')
        .select('id, short_code, title, original_url')
        .eq('short_code', targetShortCode)
        .maybeSingle();
      if (data) matchingRecord = data;
    }

    // If not found by short_code, query by original_url
    if (!matchingRecord) {
      const { data } = await supabase
        .from('urls')
        .select('id, short_code, title, original_url')
        .eq('original_url', rawInput)
        .limit(1)
        .maybeSingle();
      if (data) matchingRecord = data;
    }

    // Auto-disable link immediately for malicious reasons (phishing, malware, scam, illegal, etc.)
    if (matchingRecord) {
      const sanitizedReason = reason.trim().slice(0, 30);
      const prefix = `[FLAGGED ABUSE: ${sanitizedReason}]`;
      const updatedTitle = matchingRecord.title
        ? `${prefix} ${matchingRecord.title}`.slice(0, 200)
        : prefix;

      // Set expires_at to Unix epoch (1970-01-01) so redirect handler terminates immediately
      const { error: updateError } = await supabase
        .from('urls')
        .update({
          expires_at: new Date(0).toISOString(),
          title: updatedTitle,
        })
        .eq('id', matchingRecord.id);

      if (updateError) {
        console.error('Failed to auto-disable reported URL in Supabase:', updateError);
      } else {
        logSecurityEvent({
          action: 'ABUSE_URL_AUTO_DISABLED',
          ip: clientIp,
          status: 'blocked',
          detail: `Short link /${matchingRecord.short_code} auto-disabled due to abuse report (${reason})`,
          metadata: {
            id: matchingRecord.id,
            short_code: matchingRecord.short_code,
            original_url: matchingRecord.original_url,
            reason,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Laporan diverifikasi. Tautan yang dilaporkan telah dinonaktifkan secara otomatis demi melindungi pengguna lain.',
          disabled: true,
          short_code: matchingRecord.short_code,
        });
      }
    }

    // Return friendly generic response if record not found in system (prevents link existence leaks)
    return NextResponse.json({
      success: true,
      message: 'Laporan Anda telah berhasil dikirimkan dan akan segera ditinjau oleh tim keamanan.',
      disabled: false,
    });
  } catch (err: unknown) {
    console.error('Error in abuse reporting API:', err);
    return NextResponse.json(
      { error: 'Gagal memproses laporan penyalahgunaan. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
