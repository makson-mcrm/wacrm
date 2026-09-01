import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent');
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const description = [body.templateTitle, body.body].filter((value): value is string => typeof value === 'string' && value.trim().length > 0).join('\n\n');
    const { error } = await supabaseAdmin().from('sales_activities').insert({
      account_id: ctx.accountId,
      user_id: ctx.userId,
      activity_type: 'wiadomosc',
      activity_status: null,
      contact_id: typeof body.contactId === 'string' ? body.contactId : null,
      company_id: typeof body.companyId === 'string' ? body.companyId : null,
      deal_id: typeof body.dealId === 'string' ? body.dealId : null,
      title: 'PRZYGOTOWANO_SMS',
      description: description || null,
      occurred_at: new Date().toISOString(),
      completed: true,
    });
    if (error) throw error;
    return NextResponse.json({ status: 'PRZYGOTOWANO_SMS' }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

