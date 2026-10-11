// McpDataClass intentionally mirrors DataClass from
// src/lib/ai/gateway/types.ts (separate package, so there is no shared import);
// keep the two definitions in sync.
export type McpDataClass =
  | 'CLIENT_PERSONAL'
  | 'BANK_CONFIDENTIAL'
  | 'PUBLIC'
  | 'VERIFIED_ANONYMIZED'
  | 'SYNTHETIC'
  | 'UNKNOWN';

export function tagToolPayload(
  payload: unknown,
  dataClass: McpDataClass = 'CLIENT_PERSONAL',
): unknown {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    !Array.isArray(payload)
  ) {
    if (Object.prototype.hasOwnProperty.call(payload, '_dataClass'))
      return payload;
    return { ...payload, _dataClass: dataClass };
  }

  // Documented envelope: a JSON array cannot carry metadata of its own.
  return { _dataClass: dataClass, value: payload };
}
