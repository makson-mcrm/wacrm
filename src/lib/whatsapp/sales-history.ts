import type { SupabaseClient } from '@supabase/supabase-js';

export interface WhatsAppDealContext {
  dealId: string | null;
  companyId: string | null;
  requiresAssignment: boolean;
}

interface ActiveDealRow {
  id: string;
  company_id: string | null;
  contact_id: string | null;
}

export async function resolveWhatsAppDealContext(
  db: SupabaseClient,
  accountId: string,
  contactId: string,
  requestedDealId?: string | null
): Promise<WhatsAppDealContext> {
  if (requestedDealId) {
    const { data, error } = await db
      .from('deals')
      .select('id,company_id,contact_id')
      .eq('account_id', accountId)
      .eq('id', requestedDealId)
      .eq('contact_id', contactId)
      .maybeSingle();

    if (error || !data) {
      throw new Error('Wybrany Deal nie należy do tego klienta.');
    }

    const deal = data as ActiveDealRow;
    return {
      dealId: deal.id,
      companyId: deal.company_id,
      requiresAssignment: false,
    };
  }

  const { data, error } = await db
    .from('deals')
    .select('id,company_id,contact_id')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .eq('status', 'open')
    .order('updated_at', { ascending: false })
    .limit(2);

  if (error) throw error;
  const activeDeals = (data ?? []) as ActiveDealRow[];
  if (activeDeals.length === 1) {
    return {
      dealId: activeDeals[0].id,
      companyId: activeDeals[0].company_id,
      requiresAssignment: false,
    };
  }

  return {
    dealId: null,
    companyId: null,
    requiresAssignment: activeDeals.length > 1,
  };
}

export function whatsappActivityTitle(direction: 'outbound' | 'inbound') {
  return direction === 'outbound'
    ? 'WhatsApp — wysłano wiadomość'
    : 'WhatsApp — wiadomość przychodząca';
}

export function whatsappActivityDescription(
  contentText: string | null | undefined,
  contentType: string
) {
  return contentText?.trim() || `[${contentType}]`;
}
