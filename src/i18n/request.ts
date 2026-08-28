import { getRequestConfig } from 'next-intl/server';

function mergeMessages(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      out[key] = mergeMessages(
        base[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

export default getRequestConfig(async () => {
  const locale = process.env.NEXT_PUBLIC_APP_LOCALE || 'pl';
  const english = (await import('../../messages/en.json')).default;

  if (locale === 'en') {
    return { locale, messages: english };
  }

  try {
    const localized = (await import(`../../messages/${locale}.json`)).default;
    return {
      locale,
      messages: mergeMessages(english, localized)
    };
  } catch {
    return {
      locale: 'en',
      messages: english
    };
  }
});
