import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/flows/admin-client';
import {
  parsePublicBooking,
  publicBookingErrorResponse,
  savePublicBooking,
} from '@/lib/public-bookings';
import {
  isAllowedPublicFormOrigin,
  publicFormCorsHeaders,
  publicFormOptionsResponse,
  requestFingerprint,
} from '@/lib/public-leads';
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function OPTIONS(request: Request) {
  return publicFormOptionsResponse(request);
}

export async function POST(request: Request) {
  const headers = publicFormCorsHeaders(request);
  if (!isAllowedPublicFormOrigin(request.headers.get('origin'), request.url))
    return NextResponse.json(
      { error: 'Niedozwolone źródło żądania.' },
      { status: 403, headers }
    );
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown';
  const fingerprint = requestFingerprint(
    ip,
    request.headers.get('user-agent') ?? ''
  );
  const rate = checkRateLimit(
    `public-booking:${fingerprint}`,
    RATE_LIMITS.publicLeadIntake
  );
  if (!rate.success) {
    const response = rateLimitResponse(rate);
    Object.entries(headers).forEach(([key, value]) =>
      response.headers.set(key, value)
    );
    return response;
  }
  try {
    const input = parsePublicBooking(await request.json().catch(() => null));
    if (input.startedAt && Date.now() - input.startedAt < 800)
      return NextResponse.json(
        { error: 'Rezerwacja została odrzucona.' },
        { status: 400, headers }
      );
    await savePublicBooking(supabaseAdmin(), input, {
      fingerprint,
      userAgent: request.headers.get('user-agent') ?? '',
    });
    return NextResponse.json(
      { ok: true, message: 'Termin został zapisany w kalendarzu CRM.' },
      { status: 201, headers }
    );
  } catch (error) {
    const response = publicBookingErrorResponse(error);
    return NextResponse.json(
      { error: response.message },
      { status: response.status, headers }
    );
  }
}
