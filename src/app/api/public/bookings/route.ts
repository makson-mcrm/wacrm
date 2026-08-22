import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/flows/admin-client';
import {
  parsePublicBooking,
  publicBookingErrorResponse,
  savePublicBooking,
} from '@/lib/public-bookings';
import {
  isAllowedPublicFormOrigin,
  requestFingerprint,
} from '@/lib/public-leads';
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isAllowedPublicFormOrigin(request.headers.get('origin')))
    return NextResponse.json(
      { error: 'Niedozwolone źródło żądania.' },
      { status: 403 }
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
  if (!rate.success) return rateLimitResponse(rate);
  try {
    const input = parsePublicBooking(await request.json().catch(() => null));
    if (input.startedAt && Date.now() - input.startedAt < 800)
      return NextResponse.json(
        { error: 'Rezerwacja została odrzucona.' },
        { status: 400 }
      );
    await savePublicBooking(supabaseAdmin(), input, {
      fingerprint,
      userAgent: request.headers.get('user-agent') ?? '',
    });
    return NextResponse.json(
      { ok: true, message: 'Termin został zapisany w kalendarzu CRM.' },
      { status: 201 }
    );
  } catch (error) {
    const response = publicBookingErrorResponse(error);
    return NextResponse.json(
      { error: response.message },
      { status: response.status }
    );
  }
}
