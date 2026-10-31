import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/flows/admin-client';
import {
  financialQuestionnaireErrorResponse,
  parseFinancialQuestionnaire,
  saveFinancialQuestionnaire,
} from '@/lib/financial-questionnaires';
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
  if (!isAllowedPublicFormOrigin(request.headers.get('origin'), request.url)) {
    return NextResponse.json(
      { error: 'Niedozwolone źródło żądania.' },
      { status: 403, headers }
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
    `public-questionnaire:${fingerprint}`,
    RATE_LIMITS.publicFinancialQuestionnaire
  );
  if (!rate.success) {
    const response = rateLimitResponse(rate);
    Object.entries(headers).forEach(([key, value]) =>
      response.headers.set(key, value)
    );
    return response;
  }

  try {
    const input = parseFinancialQuestionnaire(
      await request.json().catch(() => null)
    );
    if (input.startedAt && Date.now() - input.startedAt < 1500) {
      return NextResponse.json(
        { error: 'Ankieta została odrzucona.' },
        { status: 400, headers }
      );
    }
    const saved = await saveFinancialQuestionnaire(supabaseAdmin(), input, {
      fingerprint,
      userAgent: request.headers.get('user-agent') ?? '',
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
    });
    return NextResponse.json(
      {
        ok: true,
        status: saved.status,
        missingItems: saved.missingItems,
        preparationItems: saved.preparationItems,
        message:
          saved.status === 'submitted'
            ? 'Dziękujemy. Ankieta została zapisana.'
            : 'Dziękujemy. Ankieta została zapisana z listą informacji do uzupełnienia.',
      },
      { status: 201, headers }
    );
  } catch (error) {
    const response = financialQuestionnaireErrorResponse(error);
    return NextResponse.json(
      { error: response.message },
      { status: response.status, headers }
    );
  }
}
