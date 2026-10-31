import { NextResponse } from 'next/server';

export function safeRedirectPath(value: string | null): string {
  const fallback = '/dashboard';
  if (!value) return fallback;
  try {
    // Check both encoded and decoded forms, including slash/backslash tricks
    // and control characters which URL parsers may silently remove.
    for (const path of [value, decodeURIComponent(value)]) {
      if (!path.startsWith('/') || path.startsWith('//') || /[\\\s\u0000-\u001f\u007f]/.test(path))
        return fallback;
      const parsed = new URL(path, 'https://relative.invalid');
      if (parsed.origin !== 'https://relative.invalid' || parsed.pathname.startsWith('//'))
        return fallback;
    }
    const parsed = new URL(value, 'https://relative.invalid');
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function relativeRedirect(path: string): NextResponse {
  // NextResponse.redirect requires an absolute URL. Set Location directly so
  // the browser resolves the redirect against its actual public origin.
  return new NextResponse(null, {
    status: 307,
    headers: { Location: safeRedirectPath(path) },
  });
}
