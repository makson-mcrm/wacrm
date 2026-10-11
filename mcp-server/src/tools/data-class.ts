// Canonical wire-level data classes shared with the AI gateway consumer.
export const MCP_DATA_CLASSES = [
  'CLIENT_PERSONAL',
  'BANK_CONFIDENTIAL',
  'PUBLIC',
  'VERIFIED_ANONYMIZED',
  'SYNTHETIC',
  'UNKNOWN',
] as const;

export type McpDataClass = (typeof MCP_DATA_CLASSES)[number];

export function isMcpDataClass(value: unknown): value is McpDataClass {
  return (MCP_DATA_CLASSES as readonly unknown[]).includes(value);
}

export function tagToolPayload(
  payload: unknown,
  dataClass: McpDataClass = 'CLIENT_PERSONAL',
): unknown {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    !Array.isArray(payload)
  ) {
    return { ...payload, _dataClass: dataClass };
  }

  // Documented envelope: a JSON array cannot carry metadata of its own.
  return { _dataClass: dataClass, value: payload };
}
