import { toWarsawDateTimeInput } from '@/lib/date-time';
import { phoneDigits } from '@/lib/contacts/phone';

export const ACTIVITY_TYPES = ['TELEFON','SPOTKANIE','FOLLOW_UP','WIADOMOSC','ZADANIE','INNY_KONTAKT'] as const;
export const ACTIVITY_STATUSES = ['PLANOWANE','WYKONANE','NIE_ODBYLO_SIE','PRZELOZONE','ANULOWANE'] as const;
export const OBJECTIVE_TYPES = ['NOWE_POZYSKANIE','OBSLUGA_SERWIS','FOLLOW_UP'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];
export type ObjectiveType = (typeof OBJECTIVE_TYPES)[number];
export const activityTypeForDb = (type: ActivityType) => type.toLocaleLowerCase('pl');
export const normalizeActivityPhone = (value: string) => phoneDigits(value) || value.replace(/\D/g, '');
export function phoneSearchStrength(query: string) {
  const size = normalizeActivityPhone(query).length;
  return size >= 6 ? 'strong' : size >= 3 ? 'suggest' : 'none';
}
export function phoneContains(phone: string | null | undefined, query: string) {
  const needle = normalizeActivityPhone(query);
  return needle.length >= 3 && normalizeActivityPhone(phone ?? '').includes(needle);
}
export function nextBusinessDay(from: Date) {
  const result = new Date(from);
  result.setDate(result.getDate() + 1);
  while (result.getDay() === 0 || result.getDay() === 6) result.setDate(result.getDate() + 1);
  result.setHours(9, 0, 0, 0);
  return result;
}
export function suggestedRetryAt(attempt: number, now = new Date()) {
  if (attempt <= 1) return nextBusinessDay(now);
  if (attempt === 2) {
    const result = new Date(now);
    result.setDate(result.getDate() + 7);
    result.setHours(9, 0, 0, 0);
    return result;
  }
  return null;
}
export function toLocalDateTimeValue(date: Date) {
  return toWarsawDateTimeInput(date);
}

