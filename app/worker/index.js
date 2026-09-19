// Worker: sirve la build web de Expo (env.ASSETS) y proxea /api/* y /health
// hacia el backend expuesto por Cloudflare Tunnel (env.API_ORIGIN).

function apiOrigin(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol === 'https:' && url.hostname.endsWith('.trycloudflare.com')) return url;
  } catch {
    // URL invalida
  }
  return null;
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const isApi = incoming.pathname.startsWith('/api/') || incoming.pathname === '/health';
    if (!isApi) return env.ASSETS.fetch(request);

    const origin = apiOrigin(env.API_ORIGIN);
    if (!origin) return new Response('API no configurada', { status: 503 });

    const upstream = new URL(incoming.pathname + incoming.search, origin);
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('cf-connecting-ip');
    headers.delete('x-forwarded-for');

    return fetch(new Request(upstream, { method: request.method, headers, body: request.body, redirect: 'manual' }));
  },
};
