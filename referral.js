/**
 * Partner referral capture for the marketing site.
 *
 * Contract with app.pictureletters.com:
 * - Query param: ref
 * - Cookie: pl_ref (plaintext code, first-touch, 30 days, SameSite=Lax)
 * - Production Domain: .pictureletters.com (covers apex, www, and app)
 *
 * Local / non-*.pictureletters.com hosts omit Domain (and Secure on HTTP)
 * so the cookie can still be set. Cross-subdomain handoff to the app only
 * works when this site is served on pictureletters.com.
 */

export const REF_COOKIE_NAME = 'pl_ref';
export const REF_COOKIE_MAX_AGE = 2592000;
export const REF_CODE_MAX_LENGTH = 64;
export const REF_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const REF_PARENT_DOMAIN = 'pictureletters.com';
export const APP_HOSTNAME = 'app.pictureletters.com';

export function normalizeAffiliateCode(raw) {
  if (raw == null) {
    return null;
  }

  const code = String(raw).trim().toLowerCase();

  if (!code || code.length > REF_CODE_MAX_LENGTH) {
    return null;
  }

  if (!REF_CODE_PATTERN.test(code)) {
    return null;
  }

  return code;
}

export function readCookie(cookieHeader, name = REF_COOKIE_NAME) {
  if (!cookieHeader) {
    return '';
  }

  const parts = cookieHeader.split(';');

  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');

    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();

    if (key === name) {
      return trimmed.slice(eq + 1).trim();
    }
  }

  return '';
}

export function cookieDomainForHost(hostname) {
  const host = String(hostname || '').replace(/\.$/, '').toLowerCase();

  if (host === REF_PARENT_DOMAIN || host.endsWith(`.${REF_PARENT_DOMAIN}`)) {
    return `.${REF_PARENT_DOMAIN}`;
  }

  return null;
}

export function buildReferralSetCookie(code, { hostname, secure }) {
  const parts = [
    `${REF_COOKIE_NAME}=${code}`,
    'Path=/',
    `Max-Age=${REF_COOKIE_MAX_AGE}`,
    'SameSite=Lax',
  ];
  const domain = cookieDomainForHost(hostname);

  if (domain) {
    parts.push(`Domain=${domain}`);
  }

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function resolveReferral(cookieHeader, searchParams) {
  const existing = readCookie(cookieHeader);

  if (existing) {
    return { code: existing, shouldSetCookie: false };
  }

  const code = normalizeAffiliateCode(searchParams?.get?.('ref'));

  if (code) {
    return { code, shouldSetCookie: true };
  }

  return { code: null, shouldSetCookie: false };
}

export function withReferralQuery(href, code) {
  if (!href || !code) {
    return href;
  }

  let url;

  try {
    url = new URL(href, 'https://pictureletters.com');
  } catch {
    return href;
  }

  if (url.hostname !== APP_HOSTNAME) {
    return href;
  }

  if (!url.searchParams.has('ref')) {
    url.searchParams.set('ref', code);
  }

  return url.toString();
}

export function initReferralCapture({
  cookieString = typeof document !== 'undefined' ? document.cookie : '',
  searchParams = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams(),
  hostname = typeof location !== 'undefined' ? location.hostname : '',
  secure = typeof location !== 'undefined' ? location.protocol === 'https:' : false,
  documentRoot = typeof document !== 'undefined' ? document : null,
  setCookie = (value) => {
    document.cookie = value;
  },
} = {}) {
  const { code, shouldSetCookie } = resolveReferral(cookieString, searchParams);

  if (shouldSetCookie && code) {
    setCookie(buildReferralSetCookie(code, { hostname, secure }));
  }

  if (code && documentRoot) {
    documentRoot.querySelectorAll('a[href]').forEach((anchor) => {
      const href = anchor.getAttribute('href');
      const next = withReferralQuery(href, code);

      if (next && next !== href) {
        anchor.setAttribute('href', next);
      }
    });
  }

  return code;
}

if (typeof document !== 'undefined') {
  const start = () => initReferralCapture();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
