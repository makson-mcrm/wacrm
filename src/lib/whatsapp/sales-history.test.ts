import { describe, expect, it } from 'vitest';
import {
  whatsappActivityDescription,
  whatsappActivityTitle,
} from './sales-history';

describe('WhatsApp sales history', () => {
  it('uses readable titles for both directions', () => {
    expect(whatsappActivityTitle('outbound')).toContain('wysłano');
    expect(whatsappActivityTitle('inbound')).toContain('przychodząca');
  });

  it('never loses media-only message content', () => {
    expect(whatsappActivityDescription(null, 'image')).toBe('[image]');
    expect(whatsappActivityDescription('  Dzień dobry  ', 'text')).toBe(
      'Dzień dobry'
    );
  });
});
