import { getCurrentAccount } from '@/lib/auth/account';
import type { QuestionnaireContact } from './contract';

export function isQuestionnaireContactId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

/** Session + explicit account scope + RLS. Never use the public admin client
 * to resolve a URL parameter. Any inaccessible context becomes public entry. */
export async function loadCrmQuestionnaireContext(contactId: unknown): Promise<{
  contactId: string;
  contact: QuestionnaireContact;
} | null> {
  if (!isQuestionnaireContactId(contactId)) return null;
  try {
    const ctx = await getCurrentAccount();
    const { data, error } = await ctx.supabase
      .from('contacts')
      .select('id,name,phone,email,company')
      .eq('account_id', ctx.accountId)
      .eq('id', contactId)
      .maybeSingle();
    if (error || !data) return null;
    const { data: companies, error: companyError } = await ctx.supabase
      .from('contact_companies')
      .select('company:companies(name)')
      .eq('account_id', ctx.accountId)
      .eq('contact_id', contactId)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (companyError) return null;
    const company = companies?.company as { name?: string } | null;
    return {
      contactId: data.id,
      contact: {
        name: data.name ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        company: company?.name ?? data.company ?? '',
      },
    };
  } catch {
    return null;
  }
}
