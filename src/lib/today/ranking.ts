export type TodaySection = 'TERAZ' | 'NASTEPNY_BLOK' | 'POZNIEJ_DZISIAJ';
export type WorkContext = 'DOM_KOMPUTER' | 'RZESZOW_BIURO' | 'DOWOLNY';
export type TodayLane =
  'PRZYCHOD_TERAZ' | 'PRZYCHOD_POZNIEJ' | 'T12' | 'PRYWATNE';
export type TodaySource =
  'deal' | 'activity' | 'queue' | 'priority' | 'calendar';

export type TodayCandidate = {
  id: string;
  source: TodaySource;
  title: string;
  action?: string | null;
  href?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dueAt?: string | null;
  createdAt?: string | null;
  manualPriority?: number;
  stageName?: string | null;
  stagePosition?: number | null;
  blocker?: string | null;
  signal?:
    | 'URUCHOMIENIE'
    | 'FV_PROWIZJA'
    | 'DECYZJA'
    | 'WNIOSEK'
    | 'NOWY_TELEFON'
    | 'WARTOSCIOWY_KONTAKT'
    | 'NOWY_REALNY_TEMAT'
    | 'BRAK_RUCHU'
    | 'ZALEGLE';
  context?: WorkContext;
  durationMinutes?: number | null;
  relatedKey?: string | null;
  privateRhythm?: boolean;
  completed?: boolean;
};

export type CalendarBlock = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  context?: WorkContext;
  privateRhythm?: boolean;
};

export type RankedTodayItem = TodayCandidate & {
  lane: TodayLane;
  score: number;
  reason: string;
  section: TodaySection;
  main: boolean;
};

export type TodayPlan = {
  now: RankedTodayItem[];
  nextBlock: RankedTodayItem[];
  laterToday: RankedTodayItem[];
  mainCount: number;
};

const WARSAW = 'Europe/Warsaw';
const LANE_ORDER: Record<TodayLane, number> = {
  PRZYCHOD_TERAZ: 4,
  PRZYCHOD_POZNIEJ: 3,
  T12: 2,
  PRYWATNE: 1,
};

function warsawDay(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WARSAW,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function contains(value: string | null | undefined, pattern: RegExp) {
  return pattern.test(value?.toLocaleLowerCase('pl-PL') ?? '');
}

function classify(candidate: TodayCandidate, now: Date) {
  const stage = candidate.stageName?.toLocaleLowerCase('pl-PL') ?? '';
  const advanced = (candidate.stagePosition ?? -1) >= 4;
  const due = candidate.dueAt ? new Date(candidate.dueAt) : null;
  const overdue = Boolean(due && due < now);
  const today = Boolean(due && warsawDay(due) === warsawDay(now));
  const signal = candidate.signal;

  if (candidate.source === 'calendar' && candidate.privateRhythm)
    return { lane: 'PRYWATNE' as const, score: 0, reason: 'blok kalendarza' };
  if (candidate.source === 'priority' && /^t12\b[:\s-]*/i.test(candidate.title))
    return { lane: 'T12' as const, score: 100, reason: 'zadanie T12' };
  if (
    candidate.source === 'priority' &&
    /^prywatne\b[:\s-]*/i.test(candidate.title)
  )
    return {
      lane: 'PRYWATNE' as const,
      score: 0,
      reason: 'prywatny rytm dnia',
    };

  if (candidate.blocker && advanced)
    return {
      lane: 'PRZYCHOD_TERAZ' as const,
      score: 1000,
      reason: 'bloker na zaawansowanej sprawie',
    };
  if (
    signal === 'FV_PROWIZJA' ||
    contains(stage, /uruchom|fv|prowizj/) ||
    signal === 'URUCHOMIENIE'
  )
    return {
      lane: 'PRZYCHOD_TERAZ' as const,
      score: 980,
      reason: 'uruchomienie, FV lub prowizja',
    };
  if (signal === 'DECYZJA' || contains(stage, /decyzj/))
    return { lane: 'PRZYCHOD_TERAZ' as const, score: 960, reason: 'decyzja' };
  if (signal === 'WNIOSEK' || contains(stage, /wniosk/))
    return { lane: 'PRZYCHOD_TERAZ' as const, score: 940, reason: 'wniosek' };
  if (advanced && (today || overdue))
    return {
      lane: 'PRZYCHOD_TERAZ' as const,
      score: 920 + (overdue ? 10 : 0),
      reason: overdue
        ? 'zaawansowany Deal ma zaległe działanie'
        : 'zaawansowany Deal wymaga działania dziś',
    };

  const later: Record<
    NonNullable<TodayCandidate['signal']>,
    [number, string]
  > = {
    NOWY_TELEFON: [850, 'nowy telefon buduje przyszły przychód'],
    WARTOSCIOWY_KONTAKT: [840, 'wartościowy kolejny kontakt'],
    NOWY_REALNY_TEMAT: [830, 'nowy realny temat'],
    BRAK_RUCHU: [820, 'Deal bez ruchu'],
    ZALEGLE: [810, 'zaległe działanie'],
    URUCHOMIENIE: [900, 'uruchomienie'],
    FV_PROWIZJA: [900, 'FV lub prowizja'],
    DECYZJA: [900, 'decyzja'],
    WNIOSEK: [900, 'wniosek'],
  };
  if (signal) {
    const [score, reason] = later[signal];
    return { lane: 'PRZYCHOD_POZNIEJ' as const, score, reason };
  }
  if (overdue)
    return {
      lane: 'PRZYCHOD_POZNIEJ' as const,
      score: 810,
      reason: 'zaległe działanie',
    };
  if (candidate.source === 'deal')
    return {
      lane: 'PRZYCHOD_POZNIEJ' as const,
      score: 780,
      reason: 'aktywny Deal do popchnięcia',
    };
  return {
    lane: 'PRZYCHOD_POZNIEJ' as const,
    score: 760,
    reason: today
      ? 'działanie zaplanowane dziś'
      : 'kolejne działanie sprzedażowe',
  };
}

function contextFits(
  required: WorkContext | undefined,
  available: WorkContext
) {
  return (
    !required ||
    required === 'DOWOLNY' ||
    available === 'DOWOLNY' ||
    required === available
  );
}

function sectionFor(
  candidate: TodayCandidate,
  now: Date,
  currentContext: WorkContext,
  nextBlock: CalendarBlock | undefined
): TodaySection {
  if (candidate.dueAt) {
    const due = new Date(candidate.dueAt);
    if (due <= now) return 'TERAZ';
    if (nextBlock && due <= new Date(nextBlock.startsAt))
      return 'NASTEPNY_BLOK';
  }
  if (contextFits(candidate.context, currentContext)) return 'TERAZ';
  if (
    nextBlock &&
    contextFits(candidate.context, nextBlock.context ?? 'DOWOLNY')
  )
    return 'NASTEPNY_BLOK';
  return 'POZNIEJ_DZISIAJ';
}

function compareRanked(a: RankedTodayItem, b: RankedTodayItem) {
  if (LANE_ORDER[a.lane] !== LANE_ORDER[b.lane])
    return LANE_ORDER[b.lane] - LANE_ORDER[a.lane];
  const manual = (b.manualPriority ?? 0) - (a.manualPriority ?? 0);
  if (manual) return manual;
  if (a.score !== b.score) return b.score - a.score;
  const ad = a.dueAt ? +new Date(a.dueAt) : Number.MAX_SAFE_INTEGER;
  const bd = b.dueAt ? +new Date(b.dueAt) : Number.MAX_SAFE_INTEGER;
  return ad - bd || a.title.localeCompare(b.title, 'pl');
}

/**
 * Deterministic M3 planner. It reads existing entities only: no AI call and no
 * persistence. UI may later store the accepted six items in daily_priorities.
 */
export function buildTodayPlan(input: {
  candidates: TodayCandidate[];
  calendarBlocks?: CalendarBlock[];
  now?: Date;
  currentContext?: WorkContext;
  ivyLeeLimit?: number;
}): TodayPlan {
  const now = input.now ?? new Date();
  const currentContext = input.currentContext ?? 'DOWOLNY';
  const blocks = (input.calendarBlocks ?? [])
    .filter((block) => new Date(block.startsAt) > now)
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const nextBlock = blocks[0];

  const ranked = input.candidates
    .filter((candidate) => !candidate.completed)
    .map((candidate) => {
      const classification = classify(candidate, now);
      return {
        ...candidate,
        ...classification,
        section: sectionFor(candidate, now, currentContext, nextBlock),
        main: classification.lane !== 'PRYWATNE',
      } satisfies RankedTodayItem;
    })
    .sort(compareRanked);

  const limit = Math.min(6, Math.max(1, input.ivyLeeLimit ?? 6));
  const revenue = ranked.filter(
    (item) => item.lane === 'PRZYCHOD_TERAZ' || item.lane === 'PRZYCHOD_POZNIEJ'
  );
  const selected: RankedTodayItem[] = revenue.slice(0, limit);
  const remaining = limit - selected.length;
  if (remaining > 0) {
    const t12 = ranked.filter((item) => item.lane === 'T12');
    if (t12[0]) selected.push(t12[0]);
    const first = t12[0];
    const second = t12[1];
    const relatedRevenueKeys = new Set(
      selected
        .filter((item) => item.lane.startsWith('PRZYCHOD'))
        .flatMap(
          (item) => [item.dealId, item.relatedKey].filter(Boolean) as string[]
        )
    );
    if (
      selected.length < limit &&
      first &&
      second &&
      (second.durationMinutes ?? 30) <= 20 &&
      Boolean(
        (second.dealId && relatedRevenueKeys.has(second.dealId)) ||
        (second.relatedKey && relatedRevenueKeys.has(second.relatedKey))
      )
    )
      selected.push(second);
  }

  const visible = [
    ...selected,
    ...ranked
      .filter((item) => item.lane === 'PRYWATNE')
      .map((item) => ({ ...item, main: false })),
  ];
  const section = (name: TodaySection) =>
    visible.filter((item) => item.section === name);
  const nowItems = section('TERAZ').sort(compareRanked);

  // One active sales step at a time. Private/calendar rhythm stays visible beside it.
  const active = nowItems.filter((item) => item.main).slice(0, 1);
  const deferredNow = nowItems
    .filter((item) => item.main)
    .slice(1)
    .map((item) => ({
      ...item,
      section: 'NASTEPNY_BLOK' as const,
    }));
  const rhythmNow = nowItems.filter((item) => !item.main);

  return {
    now: [...active, ...rhythmNow],
    nextBlock: [...section('NASTEPNY_BLOK'), ...deferredNow].sort(
      compareRanked
    ),
    laterToday: section('POZNIEJ_DZISIAJ').sort(compareRanked),
    mainCount: selected.length,
  };
}

export function inferWorkContext(value?: string | null): WorkContext {
  const text = value?.toLocaleLowerCase('pl-PL') ?? '';
  if (/rzesz[oó]w|biuro/.test(text)) return 'RZESZOW_BIURO';
  if (/dom|komputer|online|zdaln/.test(text)) return 'DOM_KOMPUTER';
  return 'DOWOLNY';
}

