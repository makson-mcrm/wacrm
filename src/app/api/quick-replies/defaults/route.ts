import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { MCRM_DEFAULT_QUICK_REPLIES } from '@/lib/mcrm/default-quick-replies';

export async function POST() {
  try {
    const ctx = await requireRole('agent');
    const admin = supabaseAdmin();
    const { data: existing, error: readError } = await admin
      .from('quick_replies')
      .select('title')
      .eq('account_id', ctx.accountId);
    if (readError) throw readError;
    const titles = new Set((existing ?? []).map((row) => row.title));
    const missing = MCRM_DEFAULT_QUICK_REPLIES.filter(
      (template) => !titles.has(template.title)
    );
    if (missing.length) {
      const { error } = await admin.from('quick_replies').insert(
        missing.map((template) => ({
          account_id: ctx.accountId,
          user_id: ctx.userId,
          title: template.title,
          kind: 'text',
          content_text: template.content_text,
        }))
      );
      if (error) throw error;
    }
    return NextResponse.json({ created: missing.length });
  } catch (error) {
    return toErrorResponse(error);
  }
}
