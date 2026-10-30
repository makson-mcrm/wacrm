import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Instrukcja usuwania danych — mCRM AI',
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
            Instrukcja usuwania danych — mCRM AI
          </h1>
          <p className="text-muted-foreground text-sm">
            Wersja robocza 0.1 — <time dateTime="2026-10-30">30.10.2026</time>.{' '}
            Projekt do akceptacji właściciela przed publikacją.
          </p>
        </CardHeader>
        <CardContent className="[&_a]:text-primary space-y-5 text-sm leading-7 sm:text-base [&_a]:underline [&_a]:underline-offset-4 [&_code]:break-words [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
          <p>
            Dokument roboczy 30.10.2026, sporządzony na podstawie rzeczywistego
            działania aplikacji. Adres publikacji (po akceptacji):{' '}
            <code>https://test.makson.space/usuwanie-danych</code>.
          </p>
          <h2>1. Kto usuwa dane</h2>
          <p>
            Administrator: <strong>Tomasz Maksoń</strong>, JDG, NIP 8171644748,
            Długa 10a, 39-300 Mielec. Kontakt:{' '}
            <strong>
              <a href="mailto:biuro@makson.space">biuro@makson.space</a>
            </strong>
            , tel. <strong>+48 605 737 500</strong>.
          </p>
          <h2>2. Jak złożyć żądanie usunięcia</h2>
          <ol>
            <li>
              Wyślij wiadomość e-mail na{' '}
              <strong>
                <a href="mailto:biuro@makson.space">biuro@makson.space</a>
              </strong>{' '}
              z tematem „Usunięcie danych” <strong>albo</strong>
            </li>
            <li>
              zadzwoń pod <strong>+48 605 737 500</strong> i podaj numer, z
              którego prowadzona była rozmowa.
            </li>
          </ol>
          <p>
            W żądaniu podaj: imię i nazwisko, numer telefonu używany w kontakcie
            oraz zakres (cała historia, konkretna rozmowa, konkretna sprawa).
          </p>
          <h2>3. Weryfikacja tożsamości</h2>
          <p>
            Przed usunięciem potwierdzamy tożsamość: wiadomość z numeru, którego
            dotyczy żądanie (WhatsApp/SMS), lub rozmowa telefoniczna z pytaniem
            kontrolnym dotyczącym sprawy. Celem jest ochrona danych przed
            usunięciem przez osobę nieuprawnioną.
          </p>
          <h2>4. Co jest usuwane</h2>
          <ul>
            <li>
              kartoteka klienta (dane kontaktowe, notatki, zadania, terminy),
            </li>
            <li>
              treść rozmów WhatsApp przechowywana w panelu (również historia
              przeniesiona w trybie Coexistence),
            </li>
            <li>załączniki i nagrania przesłane przez klienta,</li>
            <li>
              powiązane wpisy w sprawach/dealach, jeśli nie są wymagane
              przepisami.
            </li>
          </ul>
          <h2>5. Co może pozostać i dlaczego</h2>
          <ul>
            <li>
              dokumentacja wymagana przepisami podatkowymi i rachunkowymi
              (przechowywana wskazany przepisami okres),
            </li>
            <li>
              dane niezbędne do dochodzenia lub obrony przed roszczeniami (do
              czasu ich przedawnienia),
            </li>
            <li>
              <strong>
                wiadomości w aplikacji WhatsApp Business na telefonie
                właściciela
              </strong>{' '}
              — ta kopia nie jest częścią aplikacji mCRM i pozostaje pod
              kontrolą użytkownika urządzenia; jej usunięcie wykonuje się w
              telefonie.
            </li>
          </ul>
          <h2>6. Terminy</h2>
          <ol>
            <li>
              Potwierdzenie przyjęcia żądania — do <strong>7 dni</strong>.
            </li>
            <li>
              Realizacja usunięcia — do <strong>30 dni</strong> od potwierdzenia
              tożsamości.
            </li>
            <li>
              Potwierdzenie wykonania wysyłamy e-mailem na adres podany w
              żądaniu (lub wskazany w rozmowie).
            </li>
          </ol>
          <h2>7. Usunięcie konta użytkownika panelu</h2>
          <p>
            Użytkownik panelu (pracownik/współpracownik) może zażądać usunięcia
            konta tą samą drogą. Konto jest blokowane, a dane osobowo
            identyfikujące usuwane; wpisy operacyjne w sprawach pozostają
            przypisane do zdarzeń bez danych osobowych użytkownika, o ile wymaga
            tego ciągłość dokumentacji.
          </p>
          <h2>8. Dane przetwarzane przez Meta</h2>
          <p>
            Kanał WhatsApp obsługuje Meta Platforms na własnych zasadach.
            Żądania dotyczące danych przetwarzanych bezpośrednio przez Meta
            składa się w narzędziach Meta; nasza instrukcja obejmuje dane w
            aplikacji mCRM.
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
              href="/regulamin"
              className="text-primary hover:text-primary/80 underline underline-offset-4"
            >
              Regulamin usługi mCRM AI
            </Link>
          </nav>
        </footer>
      </Card>
    </main>
  );
}
