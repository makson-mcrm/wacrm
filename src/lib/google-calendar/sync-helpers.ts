export type SyncDecision = 'local' | 'google' | 'conflict' | 'none';

export function chooseSyncDirection(input: {
  localUpdatedAt?: string | null;
  googleUpdatedAt?: string | null;
  lastSyncedAt?: string | null;
  differs: boolean;
}): SyncDecision {
  if (!input.differs) return 'none';
  const last = input.lastSyncedAt ? +new Date(input.lastSyncedAt) : 0;
  const local = input.localUpdatedAt ? +new Date(input.localUpdatedAt) : 0;
  const google = input.googleUpdatedAt ? +new Date(input.googleUpdatedAt) : 0;
  const localChanged = local > last;
  const googleChanged = google > last;
  if (localChanged && googleChanged) return 'conflict';
  if (localChanged) return 'local';
  if (googleChanged) return 'google';
  return google >= local ? 'google' : 'local';
}

export function googleEventBody(event: {
  title: string;
  starts_at: string;
  ends_at?: string | null;
}) {
  return {
    summary: event.title,
    start: { dateTime: event.starts_at, timeZone: 'Europe/Warsaw' },
    end: {
      dateTime:
        event.ends_at ??
        new Date(+new Date(event.starts_at) + 60 * 60 * 1000).toISOString(),
      timeZone: 'Europe/Warsaw',
    },
  };
}

export function googleStart(value?: { dateTime?: string; date?: string }) {
  if (value?.dateTime) return value.dateTime;
  if (value?.date) return `${value.date}T00:00:00+02:00`;
  return null;
}

