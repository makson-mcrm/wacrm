import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContactSpouseLink, SpouseContact } from '@/types';

type ContactSpouseRow = {
  contact_a_id: string;
  contact_b_id: string;
  contact_a: SpouseContact | null;
  contact_b: SpouseContact | null;
};

const SPOUSE_SELECT =
  'contact_a_id,contact_b_id,contact_a:contacts!contact_spouses_contact_a_id_fkey(id,name,phone),contact_b:contacts!contact_spouses_contact_b_id_fkey(id,name,phone)';

export function canonicalSpousePair(firstId: string, secondId: string) {
  if (firstId === secondId)
    throw new Error('Kontakt nie może być własnym współmałżonkiem.');
  return firstId < secondId
    ? { contact_a_id: firstId, contact_b_id: secondId }
    : { contact_a_id: secondId, contact_b_id: firstId };
}

export function normalizeSpouseLinks(
  rows: ContactSpouseRow[],
  subjectIds: string[]
): ContactSpouseLink[] {
  const subjects = new Set(subjectIds);
  const links = new Map<string, ContactSpouseLink>();

  for (const row of rows) {
    if (subjects.has(row.contact_a_id) && row.contact_b) {
      links.set(`${row.contact_a_id}:${row.contact_b_id}`, {
        contactId: row.contact_a_id,
        spouse: row.contact_b,
      });
    }
    if (subjects.has(row.contact_b_id) && row.contact_a) {
      links.set(`${row.contact_b_id}:${row.contact_a_id}`, {
        contactId: row.contact_b_id,
        spouse: row.contact_a,
      });
    }
  }

  return [...links.values()];
}

export async function loadSpouseLinks(
  db: SupabaseClient,
  contactIds: string[]
): Promise<ContactSpouseLink[]> {
  const ids = [...new Set(contactIds.filter(Boolean))];
  if (!ids.length) return [];

  const [asFirst, asSecond] = await Promise.all([
    db.from('contact_spouses').select(SPOUSE_SELECT).in('contact_a_id', ids),
    db.from('contact_spouses').select(SPOUSE_SELECT).in('contact_b_id', ids),
  ]);
  const error = asFirst.error ?? asSecond.error;
  if (error) throw error;

  const rows = [
    ...(asFirst.data ?? []),
    ...(asSecond.data ?? []),
  ] as unknown as ContactSpouseRow[];
  return normalizeSpouseLinks(rows, ids);
}
