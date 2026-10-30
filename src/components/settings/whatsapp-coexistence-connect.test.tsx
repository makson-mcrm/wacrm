import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parseEmbeddedSignupEvent,
  WhatsAppCoexistenceConnect,
} from './whatsapp-coexistence-connect';

afterEach(() => vi.unstubAllEnvs());
const finish = {
  type: 'WA_EMBEDDED_SIGNUP',
  event: 'FINISH',
  data: { phone_number_id: '123', waba_id: '456' },
};
describe('Embedded Signup', () => {
  it('accepts Meta FINISH data as either JSON or an object', () => {
    for (const value of [finish, JSON.stringify(finish)]) {
      expect(
        parseEmbeddedSignupEvent('https://www.facebook.com', value)
      ).toEqual({ event: 'FINISH', phoneNumberId: '123', wabaId: '456' });
    }
  });
  it('retains the cancellation step', () => {
    expect(
      parseEmbeddedSignupEvent('https://web.facebook.com', {
        type: 'WA_EMBEDDED_SIGNUP',
        event: 'CANCEL',
        data: { current_step: 'PHONE' },
      })
    ).toEqual({ event: 'CANCEL', step: 'PHONE' });
  });
  it.each([
    'https://evil.facebook.com',
    'https://www.facebook.com.evil.test',
    'http://www.facebook.com',
    'null',
  ])('rejects untrusted origin %s', (origin) => {
    expect(parseEmbeddedSignupEvent(origin, finish)).toBeNull();
  });
  it.each([
    'invalid JSON',
    null,
    {},
    { ...finish, data: { waba_id: 'abc' } },
    { ...finish, event: 'UNKNOWN' },
  ])('ignores malformed/unrelated messages %j', (value) => {
    expect(
      parseEmbeddedSignupEvent('https://www.facebook.com', value)
    ).toBeNull();
  });
  it('renders a disabled Polish setup notice with no SDK resource when configuration is absent', () => {
    vi.stubEnv('NEXT_PUBLIC_FB_APP_ID', '');
    vi.stubEnv('NEXT_PUBLIC_FB_ES_CONFIG_ID', '');
    const html = renderToStaticMarkup(
      React.createElement(WhatsAppCoexistenceConnect, {
        config: null,
        canEdit: true,
        onConnected: async () => {},
      })
    );
    expect(html).toContain('Brak konfiguracji Meta');
    expect(html).toContain('NEXT_PUBLIC_FB_APP_ID');
    expect(html).toContain('NEXT_PUBLIC_FB_ES_CONFIG_ID');
    expect(html).toMatch(/<button[^>]*disabled/);
    expect(html).not.toContain('connect.facebook.net');
    expect(html).toContain('Niepołączony');
  });
  it('renders the connected number, name and coexistence mode', () => {
    const html = renderToStaticMarkup(
      React.createElement(WhatsAppCoexistenceConnect, {
        config: {
          onboarding_mode: 'coexistence',
          coexistence_status: 'connected',
        },
        phoneInfo: {
          display_phone_number: '+48 555 000 111',
          verified_name: 'Firma testowa',
        },
        canEdit: false,
        onConnected: async () => {},
      })
    );
    expect(html).toContain('Połączony');
    expect(html).toContain('+48 555 000 111');
    expect(html).toContain('Firma testowa');
    expect(html).toContain('tryb coexistence');
    expect(html).toContain('uprawnień administratora');
  });
  it('shows a Polish reason instead of reporting connected when health verification failed', () => {
    const html = renderToStaticMarkup(
      React.createElement(WhatsAppCoexistenceConnect, {
        config: {
          onboarding_mode: 'coexistence',
          coexistence_status: 'connected',
        },
        canEdit: false,
        connectionError: 'Meta odrzuciła poświadczenia WhatsApp.',
        onConnected: async () => {},
      })
    );
    expect(html).toContain('Niepołączony');
    expect(html).toContain('Meta odrzuciła poświadczenia WhatsApp.');
    expect(html).toContain('role="alert"');
  });
});
