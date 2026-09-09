export type SafeErrorTelemetry = {
  name: string;
  code?: string;
};

const SAFE_CODE = /^[A-Za-z0-9_.-]{1,80}$/;

/**
 * Keep production diagnostics useful without copying provider responses,
 * customer content, query details, tokens or request bodies into logs.
 */
export function safeErrorTelemetry(error: unknown): SafeErrorTelemetry {
  const name =
    error instanceof Error && SAFE_CODE.test(error.name)
      ? error.name
      : 'UnknownError';
  const rawCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;
  const code =
    typeof rawCode === 'string' && SAFE_CODE.test(rawCode)
      ? rawCode
      : undefined;

  return code ? { name, code } : { name };
}
