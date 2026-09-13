const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
let refreshPromise;
let csrfPromise;
export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
async function csrf() {
  if (!csrfPromise) csrfPromise = (async () => {
    const response = await fetch(API + '/auth/csrf', { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new ApiError('Could not establish a secure session. Please try again.', response.status);
    return (await response.json()).csrf_token;
  })().finally(() => { csrfPromise = null; });
  return csrfPromise;
}
async function renew() {
  if (!refreshPromise) refreshPromise = (async () => {
    const token = await csrf();
    const response = await fetch(API + '/auth/refresh', { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': token } });
    return response.ok;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}
export async function api(path, options = {}, retry = true) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...options.headers };
  let body = options.body;
  if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
  try {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers['X-CSRF-Token'] = await csrf();
    const response = await fetch(API + path, { ...options, method, body, headers, credentials: 'include', cache: 'no-store' });
    if (response.status === 401 && retry && !path.startsWith('/auth/login')) {
      if (await renew()) return api(path, options, false);
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const detail = Array.isArray(data.detail) ? data.detail.map(e => e.loc.filter(x => x !== 'body').join(' · ') + ': ' + e.msg).join('\n') : data.detail;
      if (response.status === 401 && path !== '/auth/login' && typeof window !== 'undefined') window.dispatchEvent(new Event('session-expired'));
      throw new ApiError(detail || 'Unable to complete this request. Please try again.', response.status);
    }
    return response.status === 204 ? null : response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Cannot connect to the studio server. Check your connection and try again.', 0);
  }
}
export function mediaUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, API + '/');
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
