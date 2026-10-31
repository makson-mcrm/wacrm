import { type NextRequest } from 'next/server';

import { relativeRedirect, safeRedirectPath } from '@/lib/auth/redirect';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const safeNext = safeRedirectPath(next);

  if (!code) {
    return relativeRedirect('/login?error=missing_auth_code');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return relativeRedirect('/login?error=auth_callback_failed');
  }

  return relativeRedirect(safeNext);
}
