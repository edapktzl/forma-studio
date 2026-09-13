const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

async function getJson(path) {
  if (!API_URL) return null;
  const response = await fetch(`${API_URL}${path}`, { credentials: 'omit', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Unable to load content.');
  return response.json();
}

export function isApiConfigured() { return Boolean(API_URL); }
export function mediaUrl(value) {
  if (!value) return '';
  try {
    const url = API_URL ? new URL(value, API_URL + '/') : new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
export function getProjectCategories(locale) { return getJson(`/project-categories?language=${locale}`); }

export async function getProjects(locale, options = {}) {
  const params = new URLSearchParams({ language: locale, page: options.page || 1, page_size: options.page_size || 12, ...(options.category ? { category: options.category } : {}), ...(options.featured !== undefined ? { featured: options.featured } : {}) });
  return getJson(`/projects?${params.toString()}`);
}

export async function getArticles(locale, page = 1, pageSize = 12) { return getJson(`/articles?language=${locale}&page=${page}&page_size=${pageSize}`); }

export async function getTestimonials(locale) { return getJson(`/testimonials?language=${locale}`); }

export async function postContactMessage(payload) {
  if (!API_URL) return { message: 'demo' };
  const response = await fetch(`${API_URL}/contact-messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = new Error('Unable to send your message.');
    error.status = response.status;
    throw error;
  }
  return response.json();
}
