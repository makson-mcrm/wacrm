export function isBrowserSttAllowed(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.NEXT_PUBLIC_AI_BROWSER_STT_ALLOW === 'true'
}
