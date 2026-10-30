import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Polityka prywatności mCRM AI',
};

export default function LegalPage() {
  return (
    <main
      lang="pl"
      className="bg-background text-foreground min-h-screen px-4 py-8 sm:py-12"
    >
      <Card className="border-border bg-card mx-auto w-full max-w-3xl">
        <CardHeader className="border-border gap-3 border-b">
          <p className="text-primary text-sm font-medium">mCRM AI</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Polityka prywatności mCRM AI
          </h1>
          <p className="text-muted-foreground text-sm">
            Wersja robocza 0.1 — <time dateTime="2026-10-30">30.10.2026</time>.{' '}
            Projekt do akceptacji właściciela przed publikacją.
          </p>
        </CardHeader>
        <CardContent className="[&_a]:text-primary space-y-5 text-sm leading-7 sm:text-base [&_a]:underline [&_a]:underline-offset-4 [&_code]:break-words [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
          <p>
            Dokument roboczy sporządzony 30.10.2026 na podstawie rzeczywistego
            działania aplikacji mCRM AI (repozytorium{' '}
            <code>makson-mcrm/wacrm</code>, wdrożenie{' '}
            <code>https://test.makson.space</code>). Nie jest opinią prawną.
            Publikacja dopiero po akceptacji właściciela.
          </p>
          <h2>1. Administrator danych</h2>
          <p>
            Administratorem danych jest <strong>Tomasz Maksoń</strong>,
            prowadzący jednoosobową działalność gospodarczą, NIP{' '}
            <strong>8171644748</strong>, adres{' '}
            <strong>Długa 10a, 39-300 Mielec</strong>, e-mail{' '}
            <strong>
              <a href="mailto:biuro@makson.space">biuro@makson.space</a>
            </strong>
            , telefon <strong>+48 605 737 500</strong>.
          </p>
          <h2>2. Jakie dane przetwarzamy</h2>
          <ol>
            <li>
              <strong>Dane klientów i kontrahentów</strong>: imię i nazwisko,
              telefon, e-mail, adres, NIP, informacje o sprawie (nieruchomość,
              finansowanie, zobowiązania), notatki, zadania, terminy.
            </li>
            <li>
              <strong>Treść korespondencji</strong>: wiadomości wymieniane przez
              WhatsApp (w tym historia rozmów przeniesiona z aplikacji WhatsApp
              Business w trybie Coexistence), wiadomości SMS/e-mail, załączniki
              i nagrania przesłane przez klienta.
            </li>
            <li>
              <strong>Dane techniczne</strong>: identyfikator konta, znaczniki
              czasu, adres IP, dziennik zdarzeń aplikacji.
            </li>
            <li>
              <strong>Dane użytkowników panelu</strong>{' '}
              (pracownicy/współpracownicy): imię, e-mail, rola w systemie.
            </li>
          </ol>
          <h2>3. Cele i podstawy prawne (RODO art. 6)</h2>
          <ul>
            <li>
              <strong>Art. 6 ust. 1 lit. b</strong> — wykonanie umowy lub
              działania przed jej zawarciem (prowadzenie sprawy, kontakt,
              przygotowanie oferty).
            </li>
            <li>
              <strong>Art. 6 ust. 1 lit. c</strong> — obowiązki prawne
              (przechowywanie dokumentacji, przepisy podatkowe).
            </li>
            <li>
              <strong>Art. 6 ust. 1 lit. f</strong> — prawnie uzasadniony
              interes administratora (obsługa reklamacji, dochodzenie roszczeń,
              bezpieczeństwo systemu, archiwizacja korespondencji).
            </li>
            <li>
              <strong>Art. 6 ust. 1 lit. a</strong> — zgoda, gdy jest wyrażana
              (np. kontakt marketingowy) — można ją wycofać w każdej chwili.
            </li>
          </ul>
          <h2>4. Odbiorcy danych i podmioty przetwarzające</h2>
          <ul>
            <li>
              <strong>Supabase</strong> — baza danych i uwierzytelnianie
              aplikacji.
            </li>
            <li>
              <strong>Hostinger</strong> — hosting aplikacji i poczty.
            </li>
            <li>
              <strong>Meta Platforms</strong> — kanał WhatsApp Business
              (przesyłanie i odbiór wiadomości).
            </li>
            <li>
              <strong>Google</strong> — kalendarz i dysk, jeśli konto jest
              podłączone.
            </li>
            <li>
              Funkcje AI — dane osobowe klientów, rozmowy i dokumenty finansowe
              mogą być przetwarzane wyłącznie lokalnie w kontrolowanym,
              odizolowanym środowisku. Nie przekazujemy ich do chmurowych modeli
              AI. Gdy bezpieczne przetwarzanie lokalne jest niedostępne, funkcja
              AI odmawia wykonania zadania.
            </li>
          </ul>
          <p>
            Dane mogą być powierzane dostawcom IT wyłącznie na podstawie umowy
            powierzenia i w zakresie niezbędnym. Poza EOG dane mogą być
            przekazywane wyłącznie do dostawców zapewniających odpowiednie
            zabezpieczenia (SCC / decyzja o adekwatności) — zakres i regiony do
            potwierdzenia w umowach z dostawcami.
          </p>
          <h2>5. Okres przechowywania</h2>
          <ul>
            <li>
              Dane klientów i sprawy — przez czas obsługi oraz{' '}
              <strong>6 lat</strong> od zakończenia sprawy (przedawnienie
              roszczeń i obowiązki podatkowe), o ile przepisy nie wymagają
              dłuższego okresu.
            </li>
            <li>
              Korespondencja — jw.; wiadomości czysto techniczne i logi — do{' '}
              <strong>12 miesięcy</strong>.
            </li>
            <li>
              Dane kandydatów/leadów bez dalszego kontaktu — do{' '}
              <strong>12 miesięcy</strong> od ostatniego kontaktu.
            </li>
          </ul>
          <h2>6. Prawa osoby, której dane dotyczą</h2>
          <p>
            Dostęp do danych, sprostowanie, usunięcie, ograniczenie
            przetwarzania, sprzeciw, przenoszenie danych, wycofanie zgody.
            Żądania:{' '}
            <strong>
              <a href="mailto:biuro@makson.space">biuro@makson.space</a>
            </strong>{' '}
            lub telefonicznie <strong>+48 605 737 500</strong>. Odpowiedź w
            ciągu miesiąca. Przysługuje skarga do <strong>Prezesa UODO</strong>{' '}
            (ul. Stawki 2, 00-193 Warszawa).
          </p>
          <h2>7. Bezpieczeństwo</h2>
          <p>
            Dostęp do panelu chroniony kontem i hasłem, połączenie szyfrowane
            (HTTPS), dane w bazie z ograniczeniem dostępu na poziomie konta,
            kopie zapasowe, kontrola dostępu użytkowników i ról.
          </p>
          <h2>8. Pliki cookies</h2>
          <p>
            Panel mCRM używa plików cookies wyłącznie do utrzymania sesji
            logowania i zapamiętania ustawień interfejsu. Nie stosujemy cookies
            reklamowych ani profilowania w panelu.
          </p>
          <h2>9. Zmiany dokumentu</h2>
          <p>
            Zmiany publikowane na tej stronie wraz z datą wejścia w życie; o
            istotnych zmianach informujemy klientów kanałem, którym prowadzona
            jest obsługa.
          </p>
        </CardContent>
        <footer className="border-border space-y-4 border-t px-6 pt-6 text-sm">
          <p>
            Kontakt:{' '}
            <a
              href="mailto:biuro@makson.space"
              className="text-primary underline underline-offset-4"
            >
              biuro@makson.space
            </a>
          </p>
          <nav
            aria-label="Pozostałe dokumenty prawne"
            className="flex flex-wrap gap-x-6 gap-y-3"
          >
            <Link
              href="/regulamin"
              className="text-primary hover:text-primary/80 underline underline-offset-4"
            >
              Regulamin usługi mCRM AI
            </Link>
            <Link
              href="/usuwanie-danych"
              className="text-primary hover:text-primary/80 underline underline-offset-4"
            >
              Instrukcja usuwania danych — mCRM AI
            </Link>
          </nav>
        </footer>
      </Card>
    </main>
  );
}
