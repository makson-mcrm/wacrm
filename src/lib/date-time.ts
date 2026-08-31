export const BUSINESS_TIME_ZONE = 'Europe/Warsaw';

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
});

function partsAt(date: Date) {
  return Object.fromEntries(
    partsFormatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
}

export function formatWarsawDateTime(value: string | Date) {
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(typeof value === 'string' ? new Date(value) : value);
}

export function toWarsawDateTimeInput(value: string | Date) {
  const parts = partsAt(typeof value === 'string' ? new Date(value) : value);
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function warsawDateTimeInputToIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('Nieprawidłowa data lub godzina.');
  const [, year, month, day, hour, minute] = match.map(Number);
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = new Date(wallClockUtc);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const shown = partsAt(candidate);
    const shownAsUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second);
    candidate = new Date(candidate.getTime() + wallClockUtc - shownAsUtc);
  }
  return candidate.toISOString();
}

