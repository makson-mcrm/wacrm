export function formatCrmDate(value: string) {
  return new Date(value).toLocaleString('pl-PL', {
    timeZone: 'Europe/Warsaw',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
