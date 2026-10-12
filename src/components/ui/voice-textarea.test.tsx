import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { VoiceTextarea } from './voice-textarea';

describe('VoiceTextarea LOCAL-FIRST gate', () => {
  it('keeps manual text editable while dictation is disabled', () => {
    const html = renderToStaticMarkup(
      <VoiceTextarea
        value="SYNTHETIC_NOTE"
        onChange={vi.fn()}
        placeholder="Wpisz notatkę"
      />
    );

    const textareaTag = html.match(/<textarea[^>]*>/)?.[0];

    expect(html).toContain('<textarea');
    expect(html).toContain('SYNTHETIC_NOTE');
    expect(textareaTag).not.toContain(' disabled=');
    expect(html).toMatch(/<button[^>]*disabled/);
    expect(html).toContain('Dyktowanie wyłączone');
    expect(html).not.toContain('/api/ai/transcribe');
  });
});
