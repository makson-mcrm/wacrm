import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent');
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const templateTitle = typeof body.templateTitle === 'string' ? body.templateTitle.trim() : '';
    const phoneNumber = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (!phoneNumber || !templateTitle) {
      return NextResponse.json({ error: 'Brak numeru odbiorcy lub szablonu SMS.' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin().from('sales_activities').insert({
      account_id: ctx.accountId,
      user_id: ctx.userId,
      activity_type: 'wiadomosc',
      activity_status: 'PRZYGOTOWANO_SMS',
      contact_id: typeof body.contactId === 'string' ? body.contactId : null,
      company_id: typeof body.companyId === 'string' ? body.companyId : null,
      deal_id: typeof body.dealId === 'string' ? body.dealId : null,
      phone_number: phoneNumber,
      title: 'SMS — PRZYGOTOWANO_SMS',
      description: templateTitle,
      occurred_at: new Date().toISOString(),
      completed: true,
    }).select('id').single();
    if (error) throw error;
    return NextResponse.json({ id: data.id, status: 'PRZYGOTOWANO_SMS' }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

