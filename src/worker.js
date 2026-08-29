import {
  buildReferralSetCookie,
  resolveReferral,
  withReferralQuery,
} from '../referral.js';

export default {
  async fetch(request, env) {
    const assetResponse = await env.ASSETS.fetch(request);

    try {
      return applyReferral(request, assetResponse);
    } catch {
      return assetResponse;
    }
  },
};

function applyReferral(request, assetResponse) {
  const url = new URL(request.url);
  const contentType = assetResponse.headers.get('content-type') || '';

  if (request.method !== 'GET' || !contentType.includes('text/html')) {
    return assetResponse;
  }

  const { code, shouldSetCookie } = resolveReferral(
    request.headers.get('Cookie'),
    url.searchParams,
  );

  let response = assetResponse;

  if (shouldSetCookie && code) {
    const headers = new Headers(assetResponse.headers);
    headers.append(
      'Set-Cookie',
      buildReferralSetCookie(code, {
        hostname: url.hostname,
        secure: url.protocol === 'https:',
      }),
    );
    response = new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  }

  if (!code) {
    return response;
  }

  return new HTMLRewriter()
    .on('a[href]', {
      element(element) {
        const href = element.getAttribute('href');
        const next = withReferralQuery(href, code);

        if (next && next !== href) {
          element.setAttribute('href', next);
        }
      },
    })
    .transform(response);
}
