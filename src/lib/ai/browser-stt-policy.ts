export const DICTATION_BLOCK_MESSAGE =
  'Dyktowanie jest zablokowane do czasu uruchomienia zweryfikowanego lokalnego modelu.';

/**
 * Browser speech recognition has implementation-dependent network behavior,
 * so an environment flag cannot make it a verified local processor.
 */
export function isBrowserSttAllowed(
  env: Record<string, string | undefined> = process.env
): boolean {
  void env;
  return false;
}
