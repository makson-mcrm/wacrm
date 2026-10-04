import Link from 'next/link';
import type { ContactSpouseLink } from '@/types';

export function SpouseLinks({ links }: { links: ContactSpouseLink[] }) {
  const unique = [
    ...new Map(links.map((link) => [link.spouse.id, link.spouse])).values(),
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950">
      <h3 className="flex items-center gap-2 text-sm font-black">
        Współmałżonek
        {unique.length > 1 ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
            {unique.length}
          </span>
        ) : null}
      </h3>
      <div className="mt-2 space-y-1">
        {unique.map((spouse) => (
          <Link
            key={spouse.id}
            href={`/contacts?open=${spouse.id}`}
            className="block min-h-10 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 hover:underline"
          >
            {spouse.name || spouse.phone}
          </Link>
        ))}
        {!unique.length ? (
          <p className="text-sm text-slate-500">Brak powiązania</p>
        ) : null}
      </div>
    </section>
  );
}
