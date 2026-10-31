// Shared origin policy for public forms and server-generated public links.
const PUBLIC_FORM_ORIGINS = [
  'https://makson.space',
  'https://www.makson.space',
  'https://crm.makson.space',
  'https://darkslateblue-mallard-102045.hostingersite.com',
  'https://mediumslateblue-okapi-264879.hostingersite.com',
  'https://mediumseagreen-pelican-353577.hostingersite.com',
];

function publicFormUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const localhost = ['localhost', '127.0.0.1', '[::1]'].includes(
      url.hostname
    );
    if (
      url.hostname === 'null' ||
      url.hostname === '0.0.0.0' ||
      !url.hostname ||
      url.hostname.includes('*') ||
      url.username ||
      url.password ||
      (localhost && process.env.NODE_ENV === 'production') ||
      (url.protocol !== 'https:' &&
        !(
          url.protocol === 'http:' &&
          localhost &&
          process.env.NODE_ENV !== 'production'
        ))
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

function publicFormOrigin(value: string): string | null {
  // An Origin is just scheme + authority, never a URL with a path or credentials.
  if (!/^https?:\/\/[^/?#\\\s]+$/.test(value)) return null;
  return publicFormUrl(value)?.origin ?? null;
}

export function isAllowedPublicFormOrigin(
  origin: string | null,
  requestUrl?: string
): boolean {
  if (!origin) return true;
  const parsedOrigin = publicFormOrigin(origin);
  if (!parsedOrigin) return false;

  // Use the request URL, never Host/X-Forwarded-Host supplied by the caller.
  // Full origin equality includes protocol and port; no hosting-domain wildcards.
  if (requestUrl && publicFormUrl(requestUrl)?.origin === parsedOrigin)
    return true;

  const allowed = [
    ...PUBLIC_FORM_ORIGINS,
    ...(process.env.ALLOWED_PUBLIC_FORM_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim()),
  ];
  if (process.env.NODE_ENV !== 'production') {
    allowed.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  return allowed.some((value) => publicFormOrigin(value) === parsedOrigin);
}

