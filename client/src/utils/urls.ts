// Resolve API/WS base URLs.
// In dev, VITE_API_URL / VITE_WS_URL point to localhost:3000, which only works
// when the browser is also on localhost. When accessed from another device (e.g.
// phone on the LAN), fall back to relative URLs so the Vite proxy handles routing.

function isLocalhost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

const browserIsLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

function resolveUrl(envVar: string | undefined, fallback: string): string {
  if (!envVar) return fallback;
  // If env points to localhost but browser is on a different host, use fallback
  if (isLocalhost(envVar) && !browserIsLocal) return fallback;
  return envVar;
}

export const API_BASE_URL = resolveUrl(import.meta.env.VITE_API_URL, '/api');
export const WS_URL = resolveUrl(import.meta.env.VITE_WS_URL, '');
