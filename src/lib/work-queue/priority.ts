export type PriorityInput = {
  sourceType: 'STRONA' | 'SZYBKI_WPIS' | 'FOLLOW_UP' | 'ALERT_CRM';
  blocker?: string | null;
  stagePosition?: number | null;
  nextActionAt?: string | null;
  deadline?: string | null;
  now?: Date;
};

export type PriorityResult = { score: number; reason: string };

function sameWarsawDay(a: Date, b: Date) {
  const parts = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  return parts(a) === parts(b);
}

export function calculateWorkQueuePriority(
  input: PriorityInput
): PriorityResult {
  const now = input.now ?? new Date();
  const deadline = input.deadline ? new Date(input.deadline) : null;
  const nextAction = input.nextActionAt ? new Date(input.nextActionAt) : null;
  const closeToMoney = (input.stagePosition ?? -1) >= 4;
  if (input.blocker && closeToMoney)
    return { score: 700, reason: 'Bloker blisko przychodu' };
  if (closeToMoney) return { score: 600, reason: 'Blisko decyzji' };
  if ((deadline && deadline < now) || (nextAction && nextAction < now))
    return { score: 500, reason: 'Zaległe' };
  if (
    (deadline && sameWarsawDay(deadline, now)) ||
    (nextAction && sameWarsawDay(nextAction, now))
  )
    return { score: 400, reason: 'Termin dziś' };
  if (input.sourceType === 'ALERT_CRM' && !input.nextActionAt)
    return { score: 300, reason: 'Brak następnego kroku' };
  if (input.sourceType === 'STRONA')
    return { score: 200, reason: 'Nowe zgłoszenie' };
  return {
    score: 100,
    reason:
      input.sourceType === 'FOLLOW_UP' ? 'Follow-up' : 'Działanie sprzedażowe',
  };
}

export function compareWorkQueuePriority<
  T extends {
    manual_priority: number;
    priorityScore: number;
    deadline?: string | null;
    created_at: string;
  },
>(a: T, b: T) {
  if (a.manual_priority !== b.manual_priority)
    return b.manual_priority - a.manual_priority;
  if (a.priorityScore !== b.priorityScore)
    return b.priorityScore - a.priorityScore;
  const ad = a.deadline ? +new Date(a.deadline) : Number.MAX_SAFE_INTEGER;
  const bd = b.deadline ? +new Date(b.deadline) : Number.MAX_SAFE_INTEGER;
  return ad - bd || +new Date(a.created_at) - +new Date(b.created_at);
}

