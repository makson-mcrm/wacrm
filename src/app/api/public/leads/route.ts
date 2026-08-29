import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/flows/admin-client';
import {
  isAllowedPublicFormOrigin,
  parsePublicLead,
  publicLeadErrorResponse,
  requestFingerprint,
  savePublicLead,
} from '@/lib/public-leads';
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';

export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

function corsHeaders(origin: string | null): HeadersInit {
  return origin && isAllowedPublicFormOrigin(origin)
    ? { ...CORS_HEADERS, 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
    : CORS_HEADERS;
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  if (!isAllowedPublicFormOrigin(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!isAllowedPublicFormOrigin(origin)) {
    return NextResponse.json(
      { error: 'Niedozwolone źródło żądania.' },
      { status: 403, headers: corsHeaders(origin) }
    );
  }
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown';
  const fingerprint = requestFingerprint(
    ip,
    request.headers.get('user-agent') ?? ''
  );
  const rate = checkRateLimit(
    `public-lead:${fingerprint}`,
    RATE_LIMITS.publicLeadIntake
  );
  if (!rate.success) return rateLimitResponse(rate);

  try {
    const input = parsePublicLead(await request.json().catch(() => null));
    if (input.startedAt && Date.now() - input.startedAt < 800) {
      return NextResponse.json(
        { error: 'Zgłoszenie zostało odrzucone.' },
        { status: 400 }
      );
    }
    await savePublicLead(supabaseAdmin(), input, {
      fingerprint,
      userAgent: request.headers.get('user-agent') ?? '',
    });
    return NextResponse.json(
      { ok: true, message: 'Dziękujemy. Zgłoszenie zostało zapisane.' },
      { status: 201, headers: corsHeaders(origin) }
    );
  } catch (error) {
    const response = publicLeadErrorResponse(error);
    return NextResponse.json(
      { error: response.message },
      { status: response.status, headers: corsHeaders(origin) }
    );
  }
}

