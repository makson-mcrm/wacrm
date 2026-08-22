import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/flows/admin-client';
import {
  financialQuestionnaireErrorResponse,
  parseFinancialQuestionnaire,
  saveFinancialQuestionnaire,
} from '@/lib/financial-questionnaires';
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
  if (!isAllowedPublicFormOrigin(request.headers.get('origin'))) {
    return NextResponse.json(
      { error: 'Niedozwolone źródło żądania.' },
      { status: 403 }
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
  if (!rate.success) return rateLimitResponse(rate);

  try {
    const input = parseFinancialQuestionnaire(
      await request.json().catch(() => null)
    );
    if (input.startedAt && Date.now() - input.startedAt < 1500) {
      return NextResponse.json(
        { error: 'Ankieta została odrzucona.' },
        { status: 400 }
      );
    }
    const saved = await saveFinancialQuestionnaire(supabaseAdmin(), input, {
      fingerprint,
      userAgent: request.headers.get('user-agent') ?? '',
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
      { status: 201 }
    );
  } catch (error) {
    const response = financialQuestionnaireErrorResponse(error);
    return NextResponse.json(
      { error: response.message },
      { status: response.status }
    );
  }
}
