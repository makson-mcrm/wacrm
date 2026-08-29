'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

const TABLES = [
  'public_lead_submissions',
  'financial_questionnaire_submissions',
  'public_booking_submissions',
] as const;

export function useUnhandledSubmissions() {
  const db = useMemo(() => createClient(), []);
  const { accountId } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!accountId) return setCount(0);
    const results = await Promise.all(
      TABLES.map((table) =>
        db
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('account_id', accountId)
          .is('handled_at', null)
      )
    );
    setCount(results.reduce((sum, result) => sum + (result.count ?? 0), 0));
  }, [accountId, db]);

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    window.addEventListener('wacrm:submissions-changed', onChanged);
    return () =>
      window.removeEventListener('wacrm:submissions-changed', onChanged);
  }, [refresh]);

  return count;
}
