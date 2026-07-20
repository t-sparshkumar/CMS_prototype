/**
 * Proxy API traffic through Vercel so auth cookies stay same-origin.
 * Mobile Safari blocks third-party cookies (Vercel UI → Railway API direct).
 *
 * Set BACKEND_URL on Vercel and leave VITE_API_URL unset.
 */
const PROXY_PREFIXES = ['/auth', '/api', '/users', '/files', '/graphql', '/flows/trigger', '/server'];

function shouldProxy(pathname: string): boolean {
  if (pathname.startsWith('/assets/') && pathname.length > '/assets/'.length) {
    return true;
  }
  return PROXY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const backend = process.env.BACKEND_URL?.replace(/\/$/, '');
  if (!backend) {
    return undefined;
  }

  const url = new URL(request.url);
  if (!shouldProxy(url.pathname)) {
    return undefined;
  }

  const target = new URL(`${url.pathname}${url.search}`, backend);
  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  return fetch(target, init);
}

export const config = {
  matcher: [
    '/auth/:path*',
    '/api/:path*',
    '/users/:path*',
    '/files/:path*',
    '/graphql',
    '/flows/trigger/:path*',
    '/server/:path*',
    '/assets/:path+',
  ],
};
