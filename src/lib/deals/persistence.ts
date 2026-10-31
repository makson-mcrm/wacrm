import type { SupabaseClient } from '@supabase/supabase-js';
import {
  toWarsawDateTimeInput,
  warsawDateTimeInputToIso,
} from '@/lib/date-time';

export function crmErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error)
    return String(error.message);
  return 'Nieznany błąd';
}

export function dealDateTimeInput(value?: string | null): string {
  return value ? toWarsawDateTimeInput(value) : '';
}

export function dealDateTimeIso(value: string): string | null {
  return value ? warsawDateTimeInputToIso(value) : null;
}

/** SELECT + single also detects an UPDATE that RLS filtered down to zero rows.
 * Stage history is written atomically by migration 054's database trigger.
 */
export async function updateDeal(
  db: SupabaseClient,
  id: string,
  payload: Record<string, unknown>
) {
  const { data, error } = await db
    .from('deals')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  if (!data)
    throw new Error('Nie zapisano Deala. Odśwież kartę i sprawdź uprawnienia.');
  return data;
}

export async function saveDealContacts(
  db: SupabaseClient,
  dealId: string,
  accountId: string,
  contactId: string,
  secondContactId: string,
  companyId: string
) {
  const ids = [...new Set([contactId, secondContactId].filter(Boolean))];
  const rows = ids.map((id, index) => ({
    deal_id: dealId,
    account_id: accountId,
    contact_id: id,
    role: index === 0 ? 'Wnioskodawca 1' : 'Wnioskodawca 2',
    is_primary: index === 0,
  }));
  // Keep existing links until their replacements have been accepted.
  if (rows.length) {
    const { error } = await db
      .from('deal_contacts')
      .upsert(rows, { onConflict: 'deal_id,contact_id' });
    if (error) throw error;
  }
  let removal = db.from('deal_contacts').delete().eq('deal_id', dealId);
  if (ids.length)
    removal = removal.not('contact_id', 'in', `(${ids.join(',')})`);
  const { error } = await removal;
  if (error) throw error;
  if (companyId) {
    for (const personId of ids) {
      const result = await db.from('contact_companies').upsert(
        {
          contact_id: personId,
          company_id: companyId,
          account_id: accountId,
          role: 'Osoba w sprawie',
          is_primary: true,
        },
        { onConflict: 'contact_id,company_id' }
      );
      if (result.error) throw result.error;
    }
  }
}
