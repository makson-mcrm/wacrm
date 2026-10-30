import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INTERACTIVE_LIMITS,
  getWabaPhoneNumbers,
  verifyPhoneNumber,
  sendInteractiveButtons,
  sendInteractiveList,
} from "./meta-api";

// All assertions in this file run BEFORE the network call. We stub fetch
// to a never-resolving mock so a test that accidentally falls through to
// the request body would hang (and fail) rather than silently hit
// graph.facebook.com.
const neverFetch = () =>
  new Promise<Response>(() => {
    /* intentionally never resolves */
  });

const BASE_ARGS = {
  phoneNumberId: "test-phone",
  accessToken: "test-token",
  to: "1234567890",
  bodyText: "Body text",
} as const;

describe("sendInteractiveButtons — validation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(neverFetch));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects an empty buttons array", async () => {
    await expect(
      sendInteractiveButtons({ ...BASE_ARGS, buttons: [] }),
    ).rejects.toThrow(/1-3 buttons/);
  });

  it(`rejects more than ${INTERACTIVE_LIMITS.maxButtons} buttons (Meta cap)`, async () => {
    await expect(
      sendInteractiveButtons({
        ...BASE_ARGS,
        buttons: [
          { id: "a", title: "A" },
          { id: "b", title: "B" },
          { id: "c", title: "C" },
          { id: "d", title: "D" },
        ],
      }),
    ).rejects.toThrow(/1-3 buttons/);
  });

  it("rejects a button title longer than 20 chars (Meta cap)", async () => {
    await expect(
      sendInteractiveButtons({
        ...BASE_ARGS,
        buttons: [
          { id: "a", title: "x".repeat(INTERACTIVE_LIMITS.buttonTitleMaxLength + 1) },
        ],
      }),
    ).rejects.toThrow(/exceeds 20 chars/);
  });

  it("rejects a button missing its id", async () => {
    await expect(
      sendInteractiveButtons({
        ...BASE_ARGS,
        buttons: [{ id: "", title: "Choose me" }],
      }),
    ).rejects.toThrow(/missing id/);
  });

  it("rejects an empty body text", async () => {
    await expect(
      sendInteractiveButtons({
        ...BASE_ARGS,
        bodyText: "",
        buttons: [{ id: "a", title: "A" }],
      }),
    ).rejects.toThrow(/requires bodyText/);
  });

  it("rejects a header text over the limit", async () => {
    await expect(
      sendInteractiveButtons({
        ...BASE_ARGS,
        headerText: "x".repeat(INTERACTIVE_LIMITS.headerTextMaxLength + 1),
        buttons: [{ id: "a", title: "A" }],
      }),
    ).rejects.toThrow(/headerText exceeds/);
  });

  it("sends the right payload shape when all inputs are valid", async () => {
    let captured: { url: string; body: unknown; method: string } | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        captured = {
          url,
          method: init.method ?? "GET",
          body: JSON.parse(String(init.body)),
        };
        return new Response(
          JSON.stringify({ messages: [{ id: "wamid.PASS" }] }),
          { status: 200 },
        );
      }),
    );

    const result = await sendInteractiveButtons({
      ...BASE_ARGS,
      headerText: "Hello",
      footerText: "Tap one",
      buttons: [
        { id: "yes", title: "Yes" },
        { id: "no", title: "No" },
      ],
    });

    expect(result).toEqual({ messageId: "wamid.PASS" });
    expect(captured).not.toBeNull();
    expect(captured!.method).toBe("POST");
    expect(captured!.url).toContain("test-phone/messages");
    expect(captured!.body).toMatchObject({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "1234567890",
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: "Body text" },
        header: { type: "text", text: "Hello" },
        footer: { text: "Tap one" },
        action: {
          buttons: [
            { type: "reply", reply: { id: "yes", title: "Yes" } },
            { type: "reply", reply: { id: "no", title: "No" } },
          ],
        },
      },
    });
  });
});

describe("sendInteractiveList — validation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(neverFetch));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const ROW = { id: "r1", title: "Row 1" };

  it("rejects zero sections", async () => {
    await expect(
      sendInteractiveList({
        ...BASE_ARGS,
        buttonLabel: "Open",
        sections: [],
      }),
    ).rejects.toThrow(/1-10 sections/);
  });

  it(`rejects more than ${INTERACTIVE_LIMITS.maxListRowsTotal} rows total across sections (Meta cap)`, async () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({
      id: `r${i}`,
      title: `Row ${i}`,
    }));
    await expect(
      sendInteractiveList({
        ...BASE_ARGS,
        buttonLabel: "Open",
        sections: [{ rows }],
      }),
    ).rejects.toThrow(/1-10 rows total/);
  });

  it("rejects a row title longer than 24 chars (Meta cap)", async () => {
    await expect(
      sendInteractiveList({
        ...BASE_ARGS,
        buttonLabel: "Open",
        sections: [
          {
            rows: [
              {
                id: "r1",
                title: "x".repeat(INTERACTIVE_LIMITS.listRowTitleMaxLength + 1),
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow(/exceeds 24 chars/);
  });

  it("rejects duplicate row ids across sections", async () => {
    await expect(
      sendInteractiveList({
        ...BASE_ARGS,
        buttonLabel: "Open",
        sections: [
          { rows: [{ id: "dupe", title: "First" }] },
          { rows: [{ id: "dupe", title: "Second" }] },
        ],
      }),
    ).rejects.toThrow(/duplicate row id/);
  });

  it("rejects an empty buttonLabel", async () => {
    await expect(
      sendInteractiveList({
        ...BASE_ARGS,
        buttonLabel: "",
        sections: [{ rows: [ROW] }],
      }),
    ).rejects.toThrow(/requires a buttonLabel/);
  });

  it("sends the right payload shape when valid", async () => {
    let captured: { body: unknown } | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        captured = { body: JSON.parse(String(init.body)) };
        return new Response(
          JSON.stringify({ messages: [{ id: "wamid.LIST" }] }),
          { status: 200 },
        );
      }),
    );

    const result = await sendInteractiveList({
      ...BASE_ARGS,
      buttonLabel: "Open menu",
      sections: [
        {
          title: "Orders",
          rows: [
            { id: "order_1", title: "Order #1", description: "€12" },
            { id: "order_2", title: "Order #2" },
          ],
        },
      ],
    });

    expect(result).toEqual({ messageId: "wamid.LIST" });
    expect(captured).not.toBeNull();
    expect(captured!.body).toMatchObject({
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: "Body text" },
        action: {
          button: "Open menu",
          sections: [
            {
              title: "Orders",
              rows: [
                { id: "order_1", title: "Order #1", description: "€12" },
                { id: "order_2", title: "Order #2" },
              ],
            },
          ],
        },
      },
    });
  });
});


describe('Coexistence number lookup', () => {
  afterEach(() => vi.unstubAllGlobals());
  const number = { id: '123', is_on_biz_app: true, platform_type: 'CLOUD_API' };

  it('lists authorized WABA numbers over all pages with a bearer token and v23 fields', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: [number], paging: {
        next: 'https://untrusted.test/next?access_token=secret', cursors: { after: 'next-cursor' },
      } }))
      .mockResolvedValueOnce(Response.json({ data: [{ ...number, id: '456' }] }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getWabaPhoneNumbers({ wabaId: '789', accessToken: 'synthetic-token' }))
      .toEqual([number, { ...number, id: '456' }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [raw, init] of fetchMock.mock.calls) {
      const url = new URL(raw);
      expect(url.origin).toBe('https://graph.facebook.com');
      expect(url.pathname).toBe('/v23.0/789/phone_numbers');
      expect(url.searchParams.get('fields')).toContain('is_on_biz_app,platform_type');
      expect(raw).not.toMatch(/secret|synthetic-token/);
      expect(init.headers.Authorization).toBe('Bearer synthetic-token');
      expect(init.cache).toBe('no-store');
    }
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('after')).toBe('next-cursor');
  });

  it.each([
    { data: [number], paging: { next: 'https://untrusted.test' } },
    { data: [number], paging: { next: 'next', cursors: { after: 'repeated' } } },
    { error: { message: 'SECRET' } },
  ])('refuses incomplete or malformed results rather than selecting a partial candidate: %j', async (body) => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(body)));
    await expect(getWabaPhoneNumbers({ wabaId: '789', accessToken: 'synthetic-token' }))
      .rejects.toThrow(/Meta/);
  });

  it('does not forward Graph errors containing credentials', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { message: 'SECRET' } }, { status: 403 })));
    await expect(getWabaPhoneNumbers({ wabaId: '789', accessToken: 'synthetic-token' }))
      .rejects.toThrow('Nie udało się odczytać numerów WABA w Meta.');
  });

  it('requests eligibility fields only when coexistence verification is explicitly enabled', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json(number));
    vi.stubGlobal('fetch', fetchMock);
    await verifyPhoneNumber({ phoneNumberId: '123', accessToken: 'synthetic-token' });
    await verifyPhoneNumber({ phoneNumberId: '123', accessToken: 'synthetic-token', apiVersion: 'v23.0', includeCoexistence: true });
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('is_on_biz_app');
    expect(String(fetchMock.mock.calls[1][0])).toContain('is_on_biz_app,platform_type');
  });
});
