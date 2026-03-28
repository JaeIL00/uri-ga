import { SessionContext } from '../../domain/models';

const DEFAULT_COOKIE_NAME = 'uriga_session';

export function getSessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME || DEFAULT_COOKIE_NAME;
}

export function encodeSessionCookie(session: SessionContext): string {
  return Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) {
      return acc;
    }

    acc[rawKey] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
}

export function decodeSessionCookie(
  cookieValue?: string,
): SessionContext | null {
  if (!cookieValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cookieValue, 'base64url').toString('utf8'),
    ) as SessionContext;

    if (!parsed.userId || !parsed.familyId || !parsed.displayName) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function buildSessionCookieHeader(session: SessionContext): string {
  const secure = process.env.SESSION_COOKIE_SECURE === 'true';
  const cookieName = getSessionCookieName();
  const encoded = encodeSessionCookie(session);

  return [
    `${cookieName}=${encoded}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
    'Max-Age=31536000',
  ].join('; ');
}
