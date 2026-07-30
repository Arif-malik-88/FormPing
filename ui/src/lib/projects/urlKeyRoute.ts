/**
 * Encode a canonical url_key (matchKey, e.g. "example.com/contact") into a single
 * clean route segment and back. base64url — so the key's own "/" and any odd
 * characters can't break the `/projects/[id]/url/[key]` path or get normalised by
 * the router. Pure + isomorphic (browser and Node).
 */
export function encodeUrlKey(urlKey: string): string {
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(unescape(encodeURIComponent(urlKey)))
      : Buffer.from(urlKey, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeUrlKey(seg: string): string {
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const bin = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    return decodeURIComponent(escape(bin));
  } catch {
    return '';
  }
}
