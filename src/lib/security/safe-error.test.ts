import { describe, expect, it } from 'vitest';
import { safeErrorTelemetry } from './safe-error';

describe('safeErrorTelemetry', () => {
  it('nie kopiuje komunikatu ani szczegółów błędu do logów', () => {
    const error = Object.assign(new Error('token=sekret; notatka klienta'), {
      code: 'PGRST116',
      details: 'dane klienta',
    });

    expect(safeErrorTelemetry(error)).toEqual({
      name: 'Error',
      code: 'PGRST116',
    });
    expect(JSON.stringify(safeErrorTelemetry(error))).not.toContain('sekret');
    expect(JSON.stringify(safeErrorTelemetry(error))).not.toContain('klienta');
  });

  it('odrzuca dowolną treść podszywającą się pod kod błędu', () => {
    expect(
      safeErrorTelemetry({ code: 'token=sekret\nnotatka klienta' })
    ).toEqual({ name: 'UnknownError' });
  });
});
