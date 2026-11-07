import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BankQualification } from '@/components/deals/bank-qualification';
import { surfaceFlags } from '@/lib/ui/surface-flags';
import { bankKnowledge, type BankKnowledge } from './knowledge';
import {
  analyzeDealLocally,
  LOCAL_MODEL,
  LOCAL_MODEL_UNAVAILABLE,
  qualifyDeal,
  type QualificationDeal,
} from './qualify';

const knowledge = bankKnowledge[0];
const deal: QualificationDeal = {
  product_type: 'Produkt syntetyczny',
  stage: { name: 'Etap syntetyczny' },
  next_action: 'Uzupełnij kontekst syntetyczny',
};

afterEach(() => vi.unstubAllGlobals());

describe('KM4.1 — kwalifikacja offline', () => {
  it('zachowuje fakty z rejestru i ich pochodzenie bez połączeń sieciowych', () => {
    const fetchMock = vi.fn(() => {
      throw new Error('Sieć zabroniona');
    });
    vi.stubGlobal('fetch', fetchMock);
    const results = qualifyDeal(deal, knowledge);
    for (const requirement of knowledge.requirements.filter(
      (item) => item.label === 'FAKT'
    )) {
      expect(results.find((item) => item.id === requirement.id)).toMatchObject({
        label: 'FAKT',
        source: requirement.source,
        checkedAt: requirement.checkedAt,
      });
    }
    expect(results.find((item) => item.id === 'product')?.value).toBe(
      deal.product_type
    );
    expect(results.some((item) => item.label === 'WNIOSEK AI')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { product_type: null, stage: null, next_action: null },
    { product_type: '  ', stage: { name: '\n' }, next_action: '\t' },
  ])('puste pola oznacza BRAK DANYCH: %j', (empty) => {
    const results = qualifyDeal(empty, knowledge);
    for (const id of ['product', 'stage', 'next-action']) {
      expect(results.find((item) => item.id === id)).toMatchObject({
        label: 'BRAK DANYCH',
        explanation: expect.stringContaining('Nie uzupełniono'),
      });
    }
    expect(results.find((item) => item.id === 'routing')?.label).toBe('FAKT');
  });

  it('nie wymyśla produktów, kryteriów banku ani potwierdzenia źródeł', () => {
    for (const id of [
      'unspecified',
      'process',
      'lending-criteria',
      'corroboration',
    ]) {
      expect(
        qualifyDeal(deal, knowledge).find((item) => item.id === id)?.label
      ).toBe('BRAK DANYCH');
    }
    const unverified: BankKnowledge = {
      ...knowledge,
      requirements: [{ ...knowledge.requirements[0], label: 'WNIOSEK AI' }],
    };
    expect(
      qualifyDeal(deal, unverified).some((item) => item.label === 'WNIOSEK AI')
    ).toBe(false);
  });

  it('renderuje panel pod osobną flagą z etykietą i źródłem każdej pozycji', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('Sieć zabroniona');
      })
    );
    expect(surfaceFlags.bankQualification).toBe(true);
    expect(surfaceFlags.cardExtensions).toBe(false);
    const html = renderToStaticMarkup(
      createElement(BankQualification, { deal })
    );
    expect(html).toContain('Kwalifikacja bankowa');
    expect(html).toContain('<select');
    expect(html).toContain('mBank');
    expect(html).toContain('Analiza AI (lokalnie)');
    expect(html.match(/<li /g)).toHaveLength(
      knowledge.products.length + knowledge.requirements.length
    );
    expect(html.match(/Źródło:/g)).toHaveLength(
      knowledge.products.length + knowledge.requirements.length
    );
    expect(html).toContain('FAKT');
    expect(html).toContain('BRAK DANYCH');
    expect(html).not.toContain('WNIOSEK AI');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('KM4.1 — jedyna trasa AI to loopback', () => {
  function mockNetwork(response: () => Promise<Response>) {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(
        input instanceof Request ? input.url : input.toString()
      );
      expect(url.hostname).toBe('127.0.0.1');
      expect(url.href).toBe('http://127.0.0.1:11434/api/generate');
      return response();
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('wysyła jeden POST do Bielika i etykietuje tylko jego odpowiedź jako WNIOSEK AI', async () => {
    const fetchMock = mockNetwork(async () =>
      Response.json({ response: 'Zweryfikuj dokumentację produktu.' })
    );
    const result = await analyzeDealLocally(
      {
        ...deal,
        contact: { name: 'Nie wysyłaj tego pola' },
      } as QualificationDeal,
      knowledge
    );
    expect(result).toMatchObject({
      label: 'WNIOSEK AI',
      explanation: 'Zweryfikuj dokumentację produktu.',
      source: expect.stringContaining(LOCAL_MODEL),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = vi.mocked(fetch).mock.calls[0][1]!;
    expect(request).toMatchObject({
      method: 'POST',
      redirect: 'error',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    });
    expect(request.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(request.body as string);
    expect(body).toMatchObject({ model: LOCAL_MODEL, stream: false });
    expect(body.prompt).not.toContain('Nie wysyłaj tego pola');
  });

  it.each([
    [
      'offline',
      async () => {
        throw new Error('sekret / treść klienta');
      },
    ],
    [
      'HTTP 500',
      async () => new Response('sekret / treść klienta', { status: 500 }),
    ],
    [
      'redirect',
      async () =>
        new Response(null, {
          status: 302,
          headers: { Location: 'https://example.invalid' },
        }),
    ],
    ['niepoprawny JSON', async () => new Response('sekret / treść klienta')],
    ['pusta odpowiedź', async () => Response.json({ response: '  ' })],
    ['zły typ', async () => Response.json({ response: 17 })],
    ['błąd modelu', async () => Response.json({ error: 'model missing' })],
    [
      'błąd z odpowiedzią',
      async () => Response.json({ response: 'wynik', error: 'model failed' }),
    ],
    [
      'zbyt długa odpowiedź',
      async () => Response.json({ response: 'a'.repeat(12_001) }),
    ],
  ])('%s: BRAK DANYCH, zero ponowień i fallbacku', async (_name, response) => {
    const fetchMock = mockNetwork(response);
    expect(await analyzeDealLocally(deal, knowledge)).toMatchObject({
      label: 'BRAK DANYCH',
      explanation: LOCAL_MODEL_UNAVAILABLE,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('odrzuca odpowiedź przekierowaną lub z obcego adresu', async () => {
    const fetchMock = mockNetwork(async () => {
      const response = Response.json({ response: 'Nie ufaj temu wynikowi' });
      Object.defineProperty(response, 'redirected', { value: true });
      Object.defineProperty(response, 'url', {
        value: 'https://example.invalid/api/generate',
      });
      return response;
    });
    expect((await analyzeDealLocally(deal, knowledge)).label).toBe(
      'BRAK DANYCH'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('przekazuje anulowanie bez przełączania dostawcy', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (_url, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal!.addEventListener(
              'abort',
              () => reject(new Error('aborted')),
              { once: true }
            );
          })
      )
    );
    const pending = analyzeDealLocally(deal, knowledge, controller.signal);
    controller.abort();
    expect((await pending).label).toBe('BRAK DANYCH');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
