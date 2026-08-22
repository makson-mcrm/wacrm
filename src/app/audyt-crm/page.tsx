"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  FileImage,
  Link2,
  Printer,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";

type Result = "ok" | "partial" | "broken" | "unknown" | "na" | "";
type Priority = "blocker" | "important" | "later" | "idea" | "";

type AuditItem = {
  id: string;
  title: string;
  expectation: string;
};

type AuditSection = {
  id: string;
  title: string;
  description: string;
  items: AuditItem[];
};

type Attachment = {
  id: string;
  name: string;
  dataUrl: string;
};

type Answer = {
  result: Result;
  priority: Priority;
  observed: string;
  expected: string;
  link: string;
  comment: string;
  attachments: Attachment[];
};

type AuditState = {
  caseLabel: string;
  biginLink: string;
  crmLink: string;
  device: "komputer" | "telefon" | "oba";
  caseNotes: string;
  answers: Record<string, Answer>;
  updatedAt: string;
};

const STORAGE_KEY = "makson:mcrm-audit:v1";

const EMPTY_ANSWER: Answer = {
  result: "",
  priority: "",
  observed: "",
  expected: "",
  link: "",
  comment: "",
  attachments: [],
};

const SECTIONS: AuditSection[] = [
  {
    id: "wejscie",
    title: "1. Wejście klienta i rezerwacja",
    description: "Sprawdź faktyczną drogę od strony do potwierdzonego terminu.",
    items: [
      { id: "www-cta", title: "Przejście z właściwego przycisku", expectation: "Przycisk prowadzi do odpowiedniej usługi i formularza, bez ślepej uliczki." },
      { id: "www-form", title: "Wysłanie formularza", expectation: "Formularz przyjmuje dane, pokazuje zrozumiałe błędy i potwierdza przyjęcie zgłoszenia." },
      { id: "www-calendar", title: "Wybór i potwierdzenie terminu", expectation: "Klient wybiera realnie dostępny termin, miejsce lub online i otrzymuje potwierdzenie." },
      { id: "www-crm", title: "Zgłoszenie widoczne w CRM", expectation: "Powstaje lub zostaje odnaleziony Kontakt. Formularz nie tworzy automatycznie Deala." },
    ],
  },
  {
    id: "kontakt",
    title: "2. Kontakt główny",
    description: "Jeden człowiek, wiele tematów — bez powielania danych.",
    items: [
      { id: "contact-top", title: "Najważniejsze dane na górze", expectation: "Telefon, e-mail, krótki opis, źródło, ostatnia aktywność i następny kontakt są widoczne bez szukania." },
      { id: "contact-dedupe", title: "Brak duplikatu Kontaktu", expectation: "Ponowne zgłoszenie tego samego numeru otwiera istniejący Kontakt zamiast tworzyć kopię." },
      { id: "contact-relations", title: "Powiązane Firma i Deale", expectation: "Na karcie widać Firmę oraz oba osobne Deale klienta." },
      { id: "contact-income", title: "Dochód przedsiębiorcy — ryczałt", expectation: "Forma dochodu i sposób rozliczenia są dostępne, ale szczegóły wnioskowe nie zaśmiecają góry karty." },
    ],
  },
  {
    id: "malzonka",
    title: "3. Drugi Kontakt — żona",
    description: "Drugi wnioskodawca tylko tam, gdzie rzeczywiście uczestniczy.",
    items: [
      { id: "wife-card", title: "Osobna karta Kontaktu", expectation: "Żona ma własny Kontakt z telefonem, e-mailem i notatkami." },
      { id: "wife-mortgage", title: "Powiązanie z Dealem hipotecznym", expectation: "Żona jest drugim wnioskodawcą w hipotece." },
      { id: "wife-company", title: "Brak błędnego powiązania z firmowym Dealem", expectation: "Żona nie jest automatycznie uczestnikiem wcześniejszego kredytu firmowego męża." },
    ],
  },
  {
    id: "firma",
    title: "4. Firma",
    description: "Firma jest osobną kartoteką, nie pojedynczym polem tekstowym.",
    items: [
      { id: "company-card", title: "Karta Firmy", expectation: "Nazwa, NIP, forma działalności, ryczałt, główny Kontakt i opis są zapisane w jednym miejscu." },
      { id: "company-navigation", title: "Przejścia Kontakt ↔ Firma ↔ Deal", expectation: "Każde powiązanie można otworzyć jednym kliknięciem w obie strony." },
      { id: "company-context", title: "Dane firmy dostępne przy hipotece", expectation: "Dochód z działalności jest dostępny do analizy hipoteki bez łączenia dwóch Deali." },
    ],
  },
  {
    id: "deal-firma",
    title: "5. Deal 1 — kredyt firmowy",
    description: "Wcześniejszy produkt pozostaje osobną sprawą z własną historią.",
    items: [
      { id: "deal1-core", title: "Osobna karta i produkt", expectation: "Kredyt firmowy ma własny etap, kwotę, Firmę, bank i opis celu." },
      { id: "deal1-history", title: "Historia, dokumenty i notatki", expectation: "Materiały firmowe nie mieszają się z hipoteką." },
      { id: "deal1-close", title: "Uruchomienie, prowizja i archiwum", expectation: "Można zapisać wynik, rozliczenie, fakturę oraz dane archiwizacji." },
    ],
  },
  {
    id: "deal-hipoteka",
    title: "6. Deal 2 — kredyt hipoteczny",
    description: "Nowa sprawa dwóch wnioskodawców, oparta także na dochodzie z firmy.",
    items: [
      { id: "deal2-core", title: "Góra karty Deala", expectation: "Widać oboje wnioskodawców, cel, kwotę, etap, termin, następny krok, bloker i ostatnią notatkę." },
      { id: "deal2-finance", title: "Dane hipoteczne", expectation: "Wkład własny, nieruchomość, dochody obojga, zobowiązania i BIK są w logicznych sekcjach niżej." },
      { id: "deal2-separation", title: "Rozdzielenie dwóch produktów", expectation: "Hipoteka i wcześniejszy kredyt firmowy mają oddzielne statusy, dokumenty, notatki i wyniki." },
    ],
  },
  {
    id: "notatki",
    title: "7. Notatka po rozmowie",
    description: "Notatka musi trafić dokładnie do właściwej sprawy.",
    items: [
      { id: "note-text", title: "Notatka tekstowa", expectation: "Można szybko wpisać lub wkleić podsumowanie i przypisać je do Kontaktu albo wybranego Deala." },
      { id: "note-audio", title: "Notatka głosowa", expectation: "Na telefonie można nagrać, zapisać i później odtworzyć notatkę z datą i autorem." },
      { id: "note-transcript", title: "Transkrypcja i widoczność", expectation: "Transkrypcja jest robocza, nie miesza Deali i ostatnia notatka jest widoczna na górze właściwej karty." },
    ],
  },
  {
    id: "agent",
    title: "8. Agent — analiza przypadku",
    description: "Agent wkracza po zapisaniu notatki i wskazaniu produktu.",
    items: [
      { id: "agent-context", title: "Właściwy kontekst", expectation: "Agent pobiera właściwy Kontakt, żonę, Firmę i hipoteczny Deal, ale nie miesza wyniku firmowego z nową hipoteką." },
      { id: "agent-source", title: "Wyłącznie wskazane źródła", expectation: "Analiza korzysta tylko ze wskazanego folderu banku, podaje nazwę pliku, datę i odnośnik." },
      { id: "agent-output", title: "Wynik zapisany przy Dealu", expectation: "Agent wskazuje możliwości, braki i ryzyka, zapisuje roboczą analizę przy hipotece i czeka na zatwierdzenie." },
    ],
  },
  {
    id: "banki",
    title: "9. Procesy bankowe",
    description: "Jeden Deal może mieć kilka niezależnych ścieżek bankowych.",
    items: [
      { id: "banks-multiple", title: "Kilka banków na jednym Dealu", expectation: "Można dodać do trzech procesów z osobnymi statusami bez powielania Deala." },
      { id: "banks-fields", title: "Pola procesu bankowego", expectation: "Bank, produkt, sposób obsługi, data złożenia, numer wniosku, uzupełnienia, decyzja, podpisanie i uruchomienie są dostępne." },
      { id: "banks-drive", title: "Odnośniki do instrukcji i druków", expectation: "Każdy proces ma odnośnik do właściwego folderu, aktualnej instrukcji, wniosku i checklisty." },
    ],
  },
  {
    id: "kompletacja",
    title: "10. Kompletacja i komunikacja",
    description: "System pokazuje, co przyszło, czego brakuje i kiedy wrócić do klienta.",
    items: [
      { id: "docs-status", title: "Status każdego dokumentu", expectation: "Brakuje, poproszono, otrzymano, do poprawy i zaakceptowano — osobno dla właściwego banku." },
      { id: "docs-missing", title: "Aktualna lista braków", expectation: "CRM tworzy czytelne podsumowanie braków bez ręcznego przepisywania całej listy." },
      { id: "docs-message", title: "WhatsApp i e-mail", expectation: "Powstaje robocza wiadomość z brakami, którą można sprawdzić, poprawić i wysłać ręcznie." },
      { id: "docs-followup", title: "Termin ponowienia", expectation: "Lista braków ma następne działanie, termin i widoczne opóźnienie." },
    ],
  },
  {
    id: "sterowanie",
    title: "11. Sterowanie sprzedażą",
    description: "Sprawa ma być gotowa do odczytania przez Ciebie i przyszłego Szefa Sprzedaży.",
    items: [
      { id: "sales-stage", title: "Etap lejka i następny krok", expectation: "Etap, termin, właściciel, bloker i następne działanie są jednoznaczne." },
      { id: "sales-priority", title: "Priorytet sprawy", expectation: "Na podstawie danych można rozpoznać, czy sprawa jest blisko wniosku, decyzji, uruchomienia lub prowizji." },
      { id: "sales-mobile", title: "Obsługa z telefonu", expectation: "Najczęstsze działania da się wykonać wygodnie bez przechodzenia przez wiele ekranów." },
    ],
  },
];

const RESULT_OPTIONS: { value: Exclude<Result, "">; label: string; tone: string }[] = [
  { value: "ok", label: "Działa prawidłowo", tone: "border-emerald-500 bg-emerald-50 text-emerald-900" },
  { value: "partial", label: "Działa częściowo", tone: "border-amber-500 bg-amber-50 text-amber-900" },
  { value: "broken", label: "Nie działa — do poprawy", tone: "border-red-500 bg-red-50 text-red-900" },
  { value: "unknown", label: "Nie mogę sprawdzić", tone: "border-slate-400 bg-slate-50 text-slate-800" },
  { value: "na", label: "Nie dotyczy", tone: "border-slate-300 bg-white text-slate-600" },
];

const PRIORITY_OPTIONS: { value: Exclude<Priority, "">; label: string }[] = [
  { value: "blocker", label: "Blokuje poniedziałek" },
  { value: "important", label: "Ważne, ale nie blokuje" },
  { value: "later", label: "Do poprawienia później" },
  { value: "idea", label: "Dobry pomysł do rozwoju" },
];

function initialState(): AuditState {
  return {
    caseLabel: "",
    biginLink: "",
    crmLink: "",
    device: "oba",
    caseNotes: "",
    answers: {},
    updatedAt: "",
  };
}

function download(name: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
}

function reportHtml(state: AuditState) {
  const rows = SECTIONS.flatMap((section) =>
    section.items.map((item) => ({ section: section.title, item, answer: state.answers[item.id] ?? EMPTY_ANSWER })),
  ).filter(({ answer }) => answer.result || answer.observed || answer.comment);

  const rowHtml = rows
    .map(({ section, item, answer }) => {
      const result = RESULT_OPTIONS.find((option) => option.value === answer.result)?.label ?? "Bez oceny";
      const priority = PRIORITY_OPTIONS.find((option) => option.value === answer.priority)?.label ?? "Bez priorytetu";
      const images = answer.attachments.map((attachment) => `<img src="${attachment.dataUrl}" alt="${escapeHtml(attachment.name)}">`).join("");
      return `<article><div class="eyebrow">${escapeHtml(section)}</div><h2>${escapeHtml(item.title)}</h2><p><b>Ocena:</b> ${result} · <b>Priorytet:</b> ${priority}</p><p><b>Powinno działać:</b> ${escapeHtml(item.expectation)}</p>${answer.observed ? `<p><b>Co widzę:</b> ${escapeHtml(answer.observed)}</p>` : ""}${answer.expected ? `<p><b>Jak powinno być:</b> ${escapeHtml(answer.expected)}</p>` : ""}${answer.comment ? `<p><b>Uwagi:</b> ${escapeHtml(answer.comment)}</p>` : ""}${answer.link ? `<p><b>Link:</b> <a href="${escapeHtml(answer.link)}">${escapeHtml(answer.link)}</a></p>` : ""}<div class="images">${images}</div></article>`;
    })
    .join("");

  return `<!doctype html><html lang="pl"><meta charset="utf-8"><title>Audyt mCRM — ${escapeHtml(state.caseLabel || "sprawa")}</title><style>body{font:15px/1.5 Arial,sans-serif;color:#173025;max-width:900px;margin:40px auto;padding:0 24px}h1{font-size:32px;color:#1b46f2}h2{font-size:20px;margin:4px 0}.meta,article{border:1px solid #ccd3f5;border-radius:14px;padding:18px;margin:18px 0}.eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#1f6b4f;font-weight:700}.images{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.images img{max-width:100%;border:1px solid #ddd;border-radius:8px}@media print{body{margin:0}.no-print{display:none}article{break-inside:avoid}}</style><body><h1>Audyt ścieżki klienta mCRM 4.0</h1><div class="meta"><b>Sprawa:</b> ${escapeHtml(state.caseLabel || "—")}<br><b>Urządzenie:</b> ${state.device}<br><b>Ostatni zapis:</b> ${escapeHtml(state.updatedAt || "—")}<br><b>Uwagi do przypadku:</b> ${escapeHtml(state.caseNotes || "—")}</div>${rowHtml || "<p>Brak wypełnionych punktów.</p>"}<p class="no-print">Otwórz ten plik w przeglądarce i wybierz Drukuj → Zapisz jako PDF.</p></body></html>`;
}

async function compressImage(file: File): Promise<Attachment> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = reject;
    element.src = source;
  });
  const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    dataUrl: canvas.toDataURL("image/jpeg", 0.72),
  };
}

export default function CrmAuditPage() {
  const [state, setState] = useState<AuditState>(initialState);
  const [ready, setReady] = useState(false);
  const [savedLabel, setSavedLabel] = useState("Jeszcze nie zapisano");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ wejscie: true });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.documentElement.dataset.mode = "light";
    document.documentElement.dataset.theme = "cobalt";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) queueMicrotask(() => setState(JSON.parse(raw) as AuditState));
    } catch {
      queueMicrotask(() => setSavedLabel("Nie udało się odczytać poprzedniego zapisu"));
    }
    queueMicrotask(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const updatedAt = new Date().toLocaleString("pl-PL");
      const next = { ...state, updatedAt };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSavedLabel(`Zapisano: ${updatedAt}`);
      } catch {
        setSavedLabel("Brak miejsca na zapis — pobierz raport i usuń część załączników");
      }
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, ready]);

  const total = SECTIONS.reduce((sum, section) => sum + section.items.length, 0);
  const completed = useMemo(
    () => Object.values(state.answers).filter((answer) => answer.result).length,
    [state.answers],
  );
  const percent = Math.round((completed / total) * 100);

  function patchAnswer(id: string, patch: Partial<Answer>) {
    setState((current) => ({
      ...current,
      answers: {
        ...current.answers,
        [id]: { ...(current.answers[id] ?? EMPTY_ANSWER), ...patch },
      },
    }));
  }

  async function addFiles(id: string, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    const existing = state.answers[id]?.attachments ?? [];
    const room = Math.max(0, 3 - existing.length);
    const attachments = await Promise.all(files.slice(0, room).map(compressImage));
    patchAnswer(id, { attachments: [...existing, ...attachments] });
    event.target.value = "";
  }

  function saveNow() {
    const updatedAt = new Date().toLocaleString("pl-PL");
    const next = { ...state, updatedAt };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setState(next);
      setSavedLabel(`Zapisano: ${updatedAt}`);
    } catch {
      setSavedLabel("Brak miejsca na zapis — pobierz raport i usuń część załączników");
    }
  }

  function exportJson() {
    saveNow();
    download(`audyt-mcrm-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), "application/json");
  }

  function exportHtml() {
    saveNow();
    download(`audyt-mcrm-${new Date().toISOString().slice(0, 10)}.html`, reportHtml(state), "text/html");
  }

  function resetAudit() {
    if (!window.confirm("Usunąć cały lokalny audyt z tej przeglądarki? Najpierw pobierz raport, jeśli chcesz go zachować.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setState(initialState());
    setSavedLabel("Audyt wyczyszczony");
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#173025]">
      <header className="border-b border-[#cbd3f8] bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1f6b4f]">mCRM 4.0 · ankieta zwrotna</p>
            <h1 className="mt-1 text-2xl font-bold text-[#1b46f2] md:text-3xl">Audyt całej ścieżki klienta</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={saveNow} className="inline-flex items-center gap-2 rounded-full bg-[#1f6b4f] px-4 py-2 text-sm font-semibold text-white"><Save size={16} /> Zapisz teraz</button>
            <button onClick={exportJson} className="inline-flex items-center gap-2 rounded-full border border-[#1b46f2] px-4 py-2 text-sm font-semibold text-[#1b46f2]"><Download size={16} /> Kopia danych</button>
            <button onClick={exportHtml} className="inline-flex items-center gap-2 rounded-full border border-[#1b46f2] px-4 py-2 text-sm font-semibold text-[#1b46f2]"><Printer size={16} /> Raport do PDF</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <section className="rounded-[28px] bg-[#1b46f2] p-6 text-white shadow-sm md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_280px] md:items-end">
            <div>
              <h2 className="text-2xl font-bold md:text-4xl">Jedna prawdziwa sprawa. Jeden pełny raport.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50 md:text-base">Nie wpisuj tutaj PESEL-u, numerów dokumentów, rachunków ani pełnych danych finansowych. Dane klienta zapisuj w CRM. Tutaj oceniasz działanie systemu i wklejasz odnośniki do właściwych rekordów.</p>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm font-semibold"><span>Postęp</span><span>{completed}/{total} · {percent}%</span></div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-[#d5f47c] transition-all" style={{ width: `${percent}%` }} /></div>
              <p className="mt-2 text-xs text-blue-100">{savedLabel}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 rounded-[24px] border border-[#cbd3f8] bg-white p-5 md:grid-cols-2 md:p-6">
          <label className="grid gap-2 text-sm font-semibold">Nazwa robocza sprawy <input value={state.caseLabel} onChange={(event) => setState({ ...state, caseLabel: event.target.value })} placeholder="Np. przedsiębiorca + hipoteka z żoną" className="rounded-xl border border-[#cbd3f8] px-3 py-3 font-normal outline-none focus:border-[#1b46f2]" /></label>
          <label className="grid gap-2 text-sm font-semibold">Urządzenie <select value={state.device} onChange={(event) => setState({ ...state, device: event.target.value as AuditState["device"] })} className="rounded-xl border border-[#cbd3f8] px-3 py-3 font-normal outline-none focus:border-[#1b46f2]"><option value="oba">Komputer i telefon</option><option value="komputer">Komputer</option><option value="telefon">Telefon</option></select></label>
          <label className="grid gap-2 text-sm font-semibold">Odnośnik do rekordu w Bigin <input type="url" value={state.biginLink} onChange={(event) => setState({ ...state, biginLink: event.target.value })} placeholder="https://…" className="rounded-xl border border-[#cbd3f8] px-3 py-3 font-normal outline-none focus:border-[#1b46f2]" /></label>
          <label className="grid gap-2 text-sm font-semibold">Odnośnik do rekordu w CRM <input type="url" value={state.crmLink} onChange={(event) => setState({ ...state, crmLink: event.target.value })} placeholder="https://…" className="rounded-xl border border-[#cbd3f8] px-3 py-3 font-normal outline-none focus:border-[#1b46f2]" /></label>
          <label className="grid gap-2 text-sm font-semibold md:col-span-2">Opis przypadku bez danych wrażliwych <textarea value={state.caseNotes} onChange={(event) => setState({ ...state, caseNotes: event.target.value })} placeholder="Np. przedsiębiorca na ryczałcie, wcześniejszy kredyt firmowy, obecnie hipoteka z żoną, kilka banków…" rows={3} className="resize-y rounded-xl border border-[#cbd3f8] px-3 py-3 font-normal outline-none focus:border-[#1b46f2]" /></label>
        </section>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2 print:hidden" aria-label="Etapy audytu">
          {SECTIONS.map((section) => {
            const sectionDone = section.items.filter((item) => state.answers[item.id]?.result).length;
            return <button key={section.id} onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="shrink-0 rounded-full border border-[#cbd3f8] bg-white px-3 py-2 text-xs font-semibold text-[#1b46f2]">{section.title.split(". ")[0]}. {sectionDone}/{section.items.length}</button>;
          })}
        </nav>

        <div className="mt-4 space-y-5">
          {SECTIONS.map((section) => {
            const isOpen = openSections[section.id] ?? false;
            const sectionDone = section.items.filter((item) => state.answers[item.id]?.result).length;
            return (
              <section id={section.id} key={section.id} className="scroll-mt-5 overflow-hidden rounded-[24px] border border-[#cbd3f8] bg-white shadow-sm">
                <button type="button" onClick={() => setOpenSections((current) => ({ ...current, [section.id]: !isOpen }))} className="flex w-full items-center justify-between gap-4 p-5 text-left md:p-6">
                  <div><h2 className="text-xl font-bold text-[#1b46f2] md:text-2xl">{section.title}</h2><p className="mt-1 text-sm text-slate-600">{section.description}</p></div>
                  <div className="flex shrink-0 items-center gap-3"><span className="rounded-full bg-[#eef3ef] px-3 py-1 text-xs font-bold text-[#1f6b4f]">{sectionDone}/{section.items.length}</span>{isOpen ? <ChevronUp /> : <ChevronDown />}</div>
                </button>
                {isOpen && <div className="border-t border-[#e4e7f7] p-4 md:p-6">{section.items.map((item, index) => {
                  const answer = state.answers[item.id] ?? EMPTY_ANSWER;
                  return (
                    <article key={item.id} className="mb-5 rounded-2xl border border-[#dfe3f5] bg-[#fbfbf8] p-4 last:mb-0 md:p-5">
                      <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d5dbf8] text-xs font-bold text-[#1b46f2]">{index + 1}</span><div><h3 className="font-bold text-[#173025]">{item.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{item.expectation}</p></div></div>
                      <fieldset className="mt-4"><legend className="text-xs font-bold uppercase tracking-wide text-slate-500">Wynik</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{RESULT_OPTIONS.map((option) => <label key={option.value} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold transition ${answer.result === option.value ? option.tone : "border-slate-200 bg-white text-slate-600 hover:border-[#1b46f2]"}`}><input type="radio" name={`result-${item.id}`} value={option.value} checked={answer.result === option.value} onChange={() => patchAnswer(item.id, { result: option.value })} className="mr-2 accent-[#1b46f2]" />{option.label}</label>)}</div></fieldset>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="grid gap-1 text-xs font-bold text-slate-600">Co faktycznie widzę? <textarea rows={3} value={answer.observed} onChange={(event) => patchAnswer(item.id, { observed: event.target.value })} className="resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-[#173025] outline-none focus:border-[#1b46f2]" /></label>
                        <label className="grid gap-1 text-xs font-bold text-slate-600">Jak powinno działać? <textarea rows={3} value={answer.expected} onChange={(event) => patchAnswer(item.id, { expected: event.target.value })} className="resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-[#173025] outline-none focus:border-[#1b46f2]" /></label>
                        <label className="grid gap-1 text-xs font-bold text-slate-600"><span className="flex items-center gap-1"><Link2 size={13} /> Link do rekordu lub błędu</span><input type="url" value={answer.link} onChange={(event) => patchAnswer(item.id, { link: event.target.value })} placeholder="https://…" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-[#173025] outline-none focus:border-[#1b46f2]" /></label>
                        <label className="grid gap-1 text-xs font-bold text-slate-600">Dodatkowy komentarz <input value={answer.comment} onChange={(event) => patchAnswer(item.id, { comment: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-[#173025] outline-none focus:border-[#1b46f2]" /></label>
                      </div>
                      <fieldset className="mt-4"><legend className="text-xs font-bold uppercase tracking-wide text-slate-500">Ważność</legend><div className="mt-2 flex flex-wrap gap-2">{PRIORITY_OPTIONS.map((option) => <label key={option.value} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold ${answer.priority === option.value ? "border-[#1f6b4f] bg-[#eef3ef] text-[#1f6b4f]" : "border-slate-200 bg-white text-slate-600"}`}><input type="radio" name={`priority-${item.id}`} checked={answer.priority === option.value} onChange={() => patchAnswer(item.id, { priority: option.value })} className="mr-2 accent-[#1f6b4f]" />{option.label}</label>)}</div></fieldset>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-[#1b46f2] px-3 py-2 text-xs font-bold text-[#1b46f2]"><FileImage size={15} /> Dodaj zrzut (maks. 3)<input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => addFiles(item.id, event)} /></label>
                        {answer.attachments.map((attachment) => <div key={attachment.id} className="group relative"><img src={attachment.dataUrl} alt={attachment.name} className="h-16 w-24 rounded-lg border border-slate-200 object-cover" /><button type="button" aria-label={`Usuń ${attachment.name}`} onClick={() => patchAnswer(item.id, { attachments: answer.attachments.filter((entry) => entry.id !== attachment.id) })} className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white"><Trash2 size={12} /></button></div>)}
                      </div>
                    </article>
                  );
                })}</div>}
              </section>
            );
          })}
        </div>

        <section className="mt-6 rounded-[24px] bg-[#eef3ef] p-6 md:p-8">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-1 shrink-0 text-[#1f6b4f]" /><div><h2 className="text-xl font-bold text-[#1f6b4f]">Zakończenie audytu</h2><p className="mt-2 text-sm leading-6 text-slate-700">Najpierw zapisz kopię danych. Następnie pobierz raport do PDF. Plik HTML zawiera oceny, komentarze i załączone zrzuty; możesz go otworzyć w nowym oknie i wybrać Drukuj → Zapisz jako PDF.</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={exportJson} className="inline-flex items-center gap-2 rounded-full bg-[#1f6b4f] px-4 py-2 text-sm font-semibold text-white"><Download size={16} /> Pobierz kopię danych</button><button onClick={exportHtml} className="inline-flex items-center gap-2 rounded-full border border-[#1f6b4f] px-4 py-2 text-sm font-semibold text-[#1f6b4f]"><Printer size={16} /> Pobierz raport do PDF</button></div></div></div>
        </section>

        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5 text-xs text-slate-500 print:hidden"><span>Wszystko zapisuje się lokalnie w tej przeglądarce.</span><button onClick={resetAudit} className="inline-flex items-center gap-1 text-red-700"><AlertTriangle size={14} /> Wyczyść audyt</button></div>
      </div>
    </main>
  );
}
