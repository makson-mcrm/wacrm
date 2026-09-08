import {
  inferWorkContext,
  type CalendarBlock,
  type TodayCandidate,
  type WorkContext,
} from './ranking';

type DealRow = {
  id: string;
  title: string;
  contact_id?: string | null;
  company_id?: string | null;
  next_action?: string | null;
  next_action_at?: string | null;
  blocker?: string | null;
  updated_at?: string | null;
  stage?: { name?: string | null; position?: number | null } | null;
};

type ActivityRow = {
  id: string;
  title: string;
  activity_type?: string | null;
  objective_type?: string | null;
  call_type?: string | null;
  call_result?: string | null;
  scheduled_at?: string | null;
  next_action_date?: string | null;
  next_contact_at?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  deal_id?: string | null;
  created_at?: string | null;
  completed?: boolean | null;
};

type QueueRow = {
  id: string;
  source_type: 'STRONA' | 'SZYBKI_WPIS' | 'FOLLOW_UP' | 'ALERT_CRM';
  status: string;
  snoozed_until?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  deal_id?: string | null;
  manual_priority?: number | null;
  created_at?: string | null;
};

type PriorityRow = {
  id?: string;
  position: number;
  title: string;
  completed: boolean;
  deal_id?: string | null;
};

export type ExistingCalendarRow = {
  id: string;
  title: string;
  event_type?: string | null;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  description?: string | null;
  deal_id?: string | null;
};

function activitySignal(row: ActivityRow): TodayCandidate['signal'] {
  const text =
    `${row.objective_type ?? ''} ${row.call_type ?? ''} ${row.call_result ?? ''}`.toLocaleLowerCase(
      'pl-PL'
    );
  if (/nowe[_\s-]*pozyskanie|nowy[_\s-]*realny[_\s-]*temat/.test(text))
    return 'NOWY_TELEFON';
  if (
    /warto[sś]ciow|follow[_\s-]*up|oddzwoni/.test(text) ||
    row.next_contact_at
  )
    return 'WARTOSCIOWY_KONTAKT';
  return 'ZALEGLE';
}

function queueSignal(
  source: QueueRow['source_type']
): TodayCandidate['signal'] {
  if (source === 'STRONA') return 'NOWY_REALNY_TEMAT';
  if (source === 'FOLLOW_UP' || source === 'SZYBKI_WPIS')
    return 'WARTOSCIOWY_KONTAKT';
  return 'ZALEGLE';
}

function isPrivateRhythm(row: ExistingCalendarRow) {
  return /(^|\s)(prywatne|rytm|trening|rodzina|dom)(:|\s|$)/i.test(
    `${row.event_type ?? ''} ${row.title}`
  );
}

function quickActivityHref(context: {
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
}) {
  const params = new URLSearchParams();
  if (context.dealId) params.set('deal', context.dealId);
  if (context.contactId) params.set('contact', context.contactId);
  if (context.companyId) params.set('company', context.companyId);
  const query = params.toString();
  return query ? `/quick-call?${query}` : '/quick-call';
}

export function buildTodayInputs(input: {
  deals: DealRow[];
  activities?: ActivityRow[];
  queue?: QueueRow[];
  priorities?: PriorityRow[];
  calendar?: ExistingCalendarRow[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const candidates = new Map<string, TodayCandidate>();

  for (const deal of input.deals) {
    const stage = Array.isArray(deal.stage) ? deal.stage[0] : deal.stage;
    const stale = deal.updated_at
      ? now.getTime() - new Date(deal.updated_at).getTime() > 14 * 86400000
      : false;
    candidates.set(`deal:${deal.id}`, {
      id: `deal:${deal.id}`,
      source: 'deal',
      title: deal.title,
      action: deal.next_action?.trim() || `Ustal następny krok: ${deal.title}`,
      href: quickActivityHref({
        dealId: deal.id,
        contactId: deal.contact_id,
        companyId: deal.company_id,
      }),
      dealId: deal.id,
      contactId: deal.contact_id,
      companyId: deal.company_id,
      dueAt: deal.next_action_at,
      blocker: deal.blocker,
      stageName: stage?.name,
      stagePosition: stage?.position,
      signal: stale ? 'BRAK_RUCHU' : undefined,
      relatedKey: deal.id,
    });
  }

  for (const row of input.queue ?? []) {
    if (row.status === 'ZALATWIONE') continue;
    const key = row.deal_id ? `deal:${row.deal_id}` : `queue:${row.id}`;
    const existing = candidates.get(key);
    if (existing) {
      candidates.set(key, {
        ...existing,
        manualPriority: Math.max(
          existing.manualPriority ?? 0,
          row.manual_priority ?? 0
        ),
        dueAt: existing.dueAt ?? row.snoozed_until,
      });
      continue;
    }
    candidates.set(key, {
      id: key,
      source: 'queue',
      title:
        row.source_type === 'STRONA'
          ? 'Nowe zgłoszenie do obsługi'
          : row.source_type === 'FOLLOW_UP'
            ? 'Wartościowy kolejny kontakt'
            : 'Pozycja kolejki pracy',
      action: 'Otwórz kolejkę i wykonaj następny krok',
      href: '/notifications',
      dealId: row.deal_id,
      contactId: row.contact_id,
      companyId: row.company_id,
      dueAt: row.snoozed_until,
      createdAt: row.created_at,
      manualPriority: row.manual_priority ?? 0,
      signal: queueSignal(row.source_type),
    });
  }

  for (const row of input.activities ?? []) {
    if (row.completed) continue;
    const key = row.deal_id ? `deal:${row.deal_id}` : `activity:${row.id}`;
    const dueAt =
      row.scheduled_at ?? row.next_action_date ?? row.next_contact_at;
    const existing = candidates.get(key);
    if (existing) {
      candidates.set(key, {
        ...existing,
        action: row.title || existing.action,
        dueAt: dueAt ?? existing.dueAt,
      });
      continue;
    }
    candidates.set(key, {
      id: key,
      source: 'activity',
      title: row.title,
      action: row.title,
      href: quickActivityHref({
        dealId: row.deal_id,
        contactId: row.contact_id,
        companyId: row.company_id,
      }),
      dealId: row.deal_id,
      contactId: row.contact_id,
      companyId: row.company_id,
      dueAt,
      createdAt: row.created_at,
      signal: activitySignal(row),
    });
  }

  for (const row of input.priorities ?? []) {
    if (!row.title.trim() || row.completed) continue;
    const special = /^(t12|prywatne)\b/i.test(row.title);
    const key =
      !special && row.deal_id
        ? `deal:${row.deal_id}`
        : `priority:${row.id ?? row.position}`;
    const existing = candidates.get(key);
    if (existing) {
      candidates.set(key, {
        ...existing,
        action: row.title,
        manualPriority: Math.max(
          existing.manualPriority ?? 0,
          7 - row.position
        ),
      });
      continue;
    }
    candidates.set(key, {
      id: key,
      source: 'priority',
      title: row.title,
      action: row.title.replace(/^(T12|PRYWATNE)\b[:\s-]*/i, ''),
      href: row.deal_id ? quickActivityHref({ dealId: row.deal_id }) : null,
      dealId: row.deal_id,
      manualPriority: 7 - row.position,
      relatedKey: row.deal_id,
    });
  }

  const calendarBlocks: CalendarBlock[] = (input.calendar ?? []).map((row) => {
    const text = `${row.title} ${row.location ?? ''} ${row.description ?? ''}`;
    return {
      id: row.id,
      title: row.title,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      context: inferWorkContext(text),
      privateRhythm: isPrivateRhythm(row),
    };
  });
  for (const row of input.calendar ?? []) {
    if (!isPrivateRhythm(row)) continue;
    candidates.set(`calendar:${row.id}`, {
      id: `calendar:${row.id}`,
      source: 'calendar',
      title: row.title,
      action: row.title,
      href: '/calendar',
      dealId: row.deal_id,
      dueAt: row.starts_at,
      context: inferWorkContext(`${row.title} ${row.location ?? ''}`),
      privateRhythm: true,
    });
  }

  return { candidates: [...candidates.values()], calendarBlocks };
}

export function currentWorkContext(
  blocks: CalendarBlock[],
  now: Date
): WorkContext {
  const active = blocks.find((block) => {
    const starts = new Date(block.startsAt);
    const ends = block.endsAt
      ? new Date(block.endsAt)
      : new Date(starts.getTime() + 60 * 60000);
    return starts <= now && now < ends;
  });
  return active?.context ?? 'DOWOLNY';
}

