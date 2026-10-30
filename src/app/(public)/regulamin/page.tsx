import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Regulamin usługi mCRM AI',
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
            Regulamin usługi mCRM AI
          </h1>
          <p className="text-muted-foreground text-sm">
            Wersja robocza 0.1 — <time dateTime="2026-10-30">30.10.2026</time>.{' '}
            Projekt do akceptacji właściciela przed publikacją.
          </p>
        </CardHeader>
        <CardContent className="[&_a]:text-primary space-y-5 text-sm leading-7 sm:text-base [&_a]:underline [&_a]:underline-offset-4 [&_code]:break-words [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
          <p>
            Dokument roboczy 30.10.2026. Opisuje rzeczywisty sposób działania
            aplikacji i kanału WhatsApp w firmie Tomasz Maksoń. Nie jest opinią
            prawną. Publikacja po akceptacji właściciela.
          </p>
          <h2>§ 1. Definicje</h2>
          <ol>
            <li>
              <strong>Usługodawca</strong> — Tomasz Maksoń, JDG, NIP 8171644748,
              Długa 10a, 39-300 Mielec, e-mail{' '}
              <a href="mailto:biuro@makson.space">biuro@makson.space</a>, tel.
              +48 605 737 500.
            </li>
            <li>
              <strong>Usługa</strong> — dostęp do aplikacji mCRM AI (panel do
              obsługi klientów, spraw, zadań i korespondencji) oraz komunikacja
              przez kanał WhatsApp Business pod numerem +48 605 737 500.
            </li>
            <li>
              <strong>Użytkownik</strong> — osoba korzystająca z panelu w
              imieniu Usługodawcy lub zaproszona przez niego.
            </li>
            <li>
              <strong>Klient</strong> — osoba, której sprawa jest prowadzona za
              pośrednictwem Usługi.
            </li>
          </ol>
          <h2>§ 2. Zakres usługi</h2>
          <ol>
            <li>
              Usługa służy do prowadzenia obsługi klientów: rejestracji
              kontaktów, spraw, notatek, zadań, terminów i korespondencji
              (WhatsApp, e-mail, SMS) w jednym miejscu.
            </li>
            <li>
              Usługa <strong>nie jest</strong> usługą doradztwa finansowego,
              inwestycyjnego ani prawniczego i nie zastępuje decyzji banku,
              notariusza ani doradcy. Usługodawca nie gwarantuje uzyskania
              kredytu, dotacji ani zawarcia transakcji.
            </li>
            <li>
              Kanał WhatsApp służy do komunikacji w sprawie; wiadomości mogą być
              dostarczane z opóźnieniem wynikającym z działania operatora lub
              Meta Platforms.
            </li>
          </ol>
          <h2>§ 3. Warunki korzystania</h2>
          <ol>
            <li>
              Dostęp do panelu wymaga konta i zachowania poufności danych
              logowania.
            </li>
            <li>
              Użytkownik nie może udostępniać konta osobom trzecim ani
              wykorzystywać Usługi do treści bezprawnych.
            </li>
            <li>
              Klient podaje dane zgodne z prawdą i aktualizuje je, gdy się
              zmienią.
            </li>
          </ol>
          <h2>§ 4. Korespondencja i treści</h2>
          <ol>
            <li>
              Wiadomości przesyłane kanałem WhatsApp są przetwarzane także przez
              Meta Platforms na jej zasadach.
            </li>
            <li>
              Usługodawca zachowuje korespondencję w panelu w celu obsługi
              sprawy — zasady opisuje Polityka prywatności.
            </li>
            <li>
              Klient może zażądać usunięcia korespondencji; ograniczenie może
              wynikać z obowiązków prawnych.
            </li>
          </ol>
          <h2>§ 5. Odpowiedzialność</h2>
          <ol>
            <li>
              Usługodawca odpowiada za należyte prowadzenie obsługi, nie za
              decyzje podejmowane przez klienta.
            </li>
            <li>
              Usługodawca nie odpowiada za przerwy spowodowane działaniem
              dostawców infrastruktury (hosting, baza, Meta, Google), siłę
              wyższą lub awarie sieci.
            </li>
            <li>
              W zakresie dozwolonym przez prawo odpowiedzialność ogranicza się
              do szkody rzeczywistej.
            </li>
          </ol>
          <h2>§ 6. Reklamacje</h2>
          <ol>
            <li>
              Reklamacje przyjmowane są na{' '}
              <strong>
                <a href="mailto:biuro@makson.space">biuro@makson.space</a>
              </strong>{' '}
              lub telefonicznie <strong>+48 605 737 500</strong>.
            </li>
            <li>
              Odpowiedź w ciągu <strong>14 dni</strong> od otrzymania
              reklamacji; w sprawach złożonych — z informacją o przedłużeniu.
            </li>
          </ol>
          <h2>§ 7. Zmiany regulaminu</h2>
          <ol>
            <li>Zmiany publikowane na tej stronie z datą wejścia w życie.</li>
            <li>
              O zmianach istotnych Usługodawca informuje kanałem prowadzonej
              obsługi z <strong>14-dniowym</strong> wyprzedzeniem.
            </li>
          </ol>
          <h2>§ 8. Prawo właściwe</h2>
          <p>
            Prawem właściwym jest prawo polskie. Spory rozstrzygają sądy
            właściwe miejscowo dla siedziby Usługodawcy, z zachowaniem uprawnień
            konsumenta wynikających z przepisów.
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
              href="/polityka-prywatnosci"
              className="text-primary hover:text-primary/80 underline underline-offset-4"
            >
              Polityka prywatności mCRM AI
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
