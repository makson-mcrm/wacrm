'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock, MapPin, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type CalendarEvent = {
  id: string;
  title: string;
  event_type: string;
  starts_at: string;
  location?: string;
  deal_id?: string;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const db = createClient();
    void db
      .from('calendar_events')
      .select('*')
      .gte('starts_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .order('starts_at')
      .limit(100)
      .then(({ data }) => setEvents((data ?? []) as CalendarEvent[]));
  }, []);

  const grouped = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const day = new Date(event.starts_at).toLocaleDateString('pl-PL', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    (acc[day] ??= []).push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Kalendarz</h1>
        <p className="mt-1 text-sm text-muted-foreground">Spotkania, telefony i terminy powiązane z Dealami.</p>
      </div>
      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <CalendarDays className="mx-auto mb-3 h-8 w-8" />
          Brak zaplanowanych wydarzeń. Dodasz je z karty Deal.
        </div>
      ) : Object.entries(grouped).map(([day, dayEvents]) => (
        <section key={day} className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-semibold capitalize">{day}</h2>
          <div className="space-y-2">
            {dayEvents.map((event) => (
              <Link key={event.id} href="/pipelines" className="flex items-center gap-3 rounded-lg bg-muted/60 p-3 hover:bg-muted">
                {event.event_type === 'call' ? <Phone className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.starts_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    {event.location ? ` · ${event.location}` : ''}
                  </p>
                </div>
                {event.location && <MapPin className="h-4 w-4 text-muted-foreground" />}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
