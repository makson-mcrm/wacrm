import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import {
  buildActivityAnalytics,
  findMigrationTag,
  serializeActivityAnalytics,
} from '@/lib/sales/activity-analytics';

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent');
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const templateTitle =
      typeof body.templateTitle === 'string' ? body.templateTitle.trim() : '';
    const phoneNumber = typeof body.phone === 'string' ? body.phone.trim() : '';
    const originalNote = typeof body.note === 'string' ? body.note.trim() : '';
    const contactId =
      typeof body.contactId === 'string' ? body.contactId : null;
    const companyId =
      typeof body.companyId === 'string' ? body.companyId : null;
    const dealId = typeof body.dealId === 'string' ? body.dealId : null;
    if (!phoneNumber || !templateTitle) {
      return NextResponse.json(
        { error: 'Brak numeru odbiorcy lub szablonu SMS.' },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();
    const [contactResult, companyResult, dealResult] = await Promise.all([
      contactId
        ? admin
            .from('contacts')
            .select('id,source,source_details,product_category,created_at')
            .eq('account_id', ctx.accountId)
            .eq('id', contactId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      companyId
        ? admin
            .from('companies')
            .select('id,created_at')
            .eq('account_id', ctx.accountId)
            .eq('id', companyId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      dealId
        ? admin
            .from('deals')
            .select(
              'id,source,source_details,product_type,created_at,intake_source,intake_received_at,blocker'
            )
            .eq('account_id', ctx.accountId)
            .eq('id', dealId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    const relationError =
      contactResult.error || companyResult.error || dealResult.error;
    if (relationError) throw relationError;
    if (
      (contactId && !contactResult.data) ||
      (companyId && !companyResult.data) ||
      (dealId && !dealResult.data)
    ) {
      return NextResponse.json(
        { error: 'Wybrana relacja nie należy do bieżącego konta.' },
        { status: 400 }
      );
    }

    const contact = contactResult.data;
    const company = companyResult.data;
    const deal = dealResult.data;
    const productCategory = deal?.product_type || contact?.product_category;
    const customerSource = contact?.source || deal?.source;
    const nowIso = new Date().toISOString();
    const analytics = buildActivityAnalytics({
      recordedAt: nowIso,
      channel: 'wiadomosc',
      activityType: 'wiadomosc',
      contactId,
      companyId,
      dealId,
      originalNote: originalNote || templateTitle,
      result: 'przygotowano_sms',
      blocker: deal?.blocker,
      productCategory,
      customerSource,
      acquiredAt:
        contact?.created_at ||
        deal?.intake_received_at ||
        deal?.created_at ||
        company?.created_at,
      migrationTag: findMigrationTag(
        contact?.source,
        contact?.source_details,
        deal?.source,
        deal?.source_details,
        deal?.intake_source
      ),
    });

    const { data, error } = await admin
      .from('sales_activities')
      .insert({
        account_id: ctx.accountId,
        user_id: ctx.userId,
        activity_type: 'wiadomosc',
        activity_status: 'PRZYGOTOWANO_SMS',
        contact_id: contactId,
        company_id: companyId,
        deal_id: dealId,
        phone_number: phoneNumber,
        title: 'SMS — PRZYGOTOWANO_SMS',
        description: originalNote || templateTitle,
        occurred_at: nowIso,
        completed: true,
        call_result: 'przygotowano_sms',
        call_category: serializeActivityAnalytics(analytics),
        call_product: productCategory || null,
        call_channel: 'wiadomosc',
        source: customerSource || null,
        product_group: productCategory || null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return NextResponse.json(
      { id: data.id, status: 'PRZYGOTOWANO_SMS' },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
