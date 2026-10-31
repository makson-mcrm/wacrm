import { NextResponse } from 'next/server';
import {
  requireRole,
  UnauthorizedError,
  ForbiddenError,
} from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/flows/admin-client';
import { isQuestionnaireContactId } from '@/lib/questionnaires/crm-context';
import {
  financialQuestionnaireErrorResponse,
  parseFinancialQuestionnaire,
  saveFinancialQuestionnaire,
} from '@/lib/financial-questionnaires';
import {
  isAllowedPublicFormOrigin,
  requestFingerprint,
} from '@/lib/public-leads';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isAllowedPublicFormOrigin(request.headers.get('origin'), request.url)) {
    return NextResponse.json(
      { error: 'Niedozwolone źródło żądania.' },
      { status: 403 }
    );
  }
  try {
    const ctx = await requireRole('agent');
    const contactId = new URL(request.url).searchParams.get('contact');
    if (!isQuestionnaireContactId(contactId)) {
      return NextResponse.json(
        { error: 'Kontakt jest niedostępny.' },
        { status: 404 }
      );
    }
    // Check with the caller's RLS client before the shared writer uses admin.
    const { data: contact, error } = await ctx.supabase
      .from('contacts')
      .select('id')
      .eq('account_id', ctx.accountId)
      .eq('id', contactId)
      .maybeSingle();
    if (error) throw new Error('Contact lookup failed');
    if (!contact)
      return NextResponse.json(
        { error: 'Kontakt jest niedostępny.' },
        { status: 404 }
      );
    const input = parseFinancialQuestionnaire(
      await request.json().catch(() => null)
    );
    const userAgent = request.headers.get('user-agent') ?? '';
    const saved = await saveFinancialQuestionnaire(supabaseAdmin(), input, {
      fingerprint: requestFingerprint(ctx.userId, userAgent),
      userAgent,
      crm: { accountId: ctx.accountId, userId: ctx.userId, contactId },
    });
    return NextResponse.json(
      {
        ok: true,
        status: saved.status,
        missingItems: saved.missingItems,
        preparationItems: saved.preparationItems,
        message: 'Ankieta została zapisana przy kontakcie.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json(
        {
          error: 'Brak uprawnień do zapisu ankiety. Zaloguj się jako doradca.',
        },
        { status: error.status }
      );
    }
    const response = financialQuestionnaireErrorResponse(error);
    return NextResponse.json(
      { error: response.message },
      { status: response.status }
    );
  }
}
