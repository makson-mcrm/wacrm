export type PriorityDeal = {
  id: string;
  title: string;
  next_action?: string | null;
  next_action_at?: string | null;
  blocker?: string | null;
  stage?: { name?: string | null } | null;
  document_requirements?: { status?: string | null }[] | null;
  bank_processes?:
    { progress?: number | null; status?: string | null }[] | null;
};

export type SuggestedPriority = {
  title: string;
  deal_id: string | null;
  score: number;
  reason: string;
};

export function buildPrioritySuggestions(
  deals: PriorityDeal[],
  now: Date,
  callsToday: number,
  limit = 6
): SuggestedPriority[] {
  const today = localDay(now);
  const ranked = deals.map((deal) => {
    const stage = deal.stage?.name?.toLocaleLowerCase('pl-PL') ?? '';
    const deadline = deal.next_action_at ? new Date(deal.next_action_at) : null;
    const missing =
      deal.document_requirements?.filter((row) =>
        ['brak', 'poproszono', 'do_poprawy'].includes(row.status ?? '')
      ).length ?? 0;
    let score = 0;
    const reasons: string[] = [];

    if (deadline && deadline < now) {
      score += 120;
      reasons.push('termin minął');
    } else if (deadline && localDay(deadline) === today) {
      score += 100;
      reasons.push('termin jest dzisiaj');
    }
    if (deal.blocker) {
      score += 90;
      reasons.push('sprawa ma bloker');
    }
    if (stage.includes('uruchomienie') || stage.includes('fv')) {
      score += 85;
      reasons.push('sprawa blisko uruchomienia lub prowizji');
    } else if (stage.includes('wnioski') || stage.includes('decyzja')) {
      score += 75;
      reasons.push('wnioski lub decyzja');
    } else if (stage.includes('kompletacja') || stage.includes('oferta')) {
      score += 60;
      reasons.push('kompletacja lub oferta');
    }
    if (missing > 0) {
      score += 55 + Math.min(missing, 5);
      reasons.push(`${missing} brakujących dokumentów`);
    }
    if (!deal.next_action || !deadline) {
      score += 45;
      reasons.push('brak kompletnego następnego kroku');
    }

    return {
      title: deal.next_action?.trim() || `Ustal następny krok: ${deal.title}`,
      deal_id: deal.id,
      score,
      reason: reasons.join(', ') || 'aktywna sprawa',
    };
  });

  ranked.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const suggestions: SuggestedPriority[] = ranked.slice(
    0,
    Math.max(0, limit - 1)
  );

  if (callsToday < 10) {
    suggestions.push({
      title: `Blok NOWE/KONTAKT — wykonaj ${10 - callsToday} z 10 telefonów`,
      deal_id: null,
      score: 95,
      reason: 'codzienny cel kontaktów',
    });
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
}

function localDay(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
