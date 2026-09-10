import assert from 'node:assert/strict';
import { copy, projects, articles, paths } from '../lib/content.js';

function sameStructure(a, b, path = 'copy') {
  assert.equal(typeof a, typeof b, `Type mismatch at ${path}`);
  if (Array.isArray(a)) {
    assert.ok(Array.isArray(b), `Array expected at ${path}`);
    assert.equal(a.length, b.length, `Length mismatch at ${path}`);
    a.forEach((value, i) => sameStructure(value, b[i], `${path}[${i}]`));
  } else if (a && typeof a === 'object') {
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), `Key mismatch at ${path}`);
    for (const key of Object.keys(a)) sameStructure(a[key], b[key], `${path}.${key}`);
  } else {
    assert.equal(typeof a, 'string', `Non-string content at ${path}`);
    assert.ok(a.trim() && b.trim(), `Missing translation at ${path}`);
  }
}
sameStructure(copy.en, copy.tr);
for (const record of [...projects, ...articles]) sameStructure(record.en, record.tr, record.slug);
assert.equal(new Set(projects.map(p => p.slug)).size, projects.length);
assert.equal(new Set(articles.map(p => p.slug)).size, articles.length);
console.log('PASS: complete matching EN/TR content structure, project stories, and articles.');

const base = process.env.SITE_URL || 'http://localhost:3001';
const routes = ['en', 'tr'].flatMap(locale => [
  ...paths.map(path => `/${locale}${path}`),
  `/${locale}/privacy`,
  ...projects.map(p => `/${locale}/projects/${p.slug}`),
  ...articles.map(a => `/${locale}/insights/${a.slug}`),
]);
const known = new Set(routes);
for (const route of routes) {
  const response = await fetch(base + route, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `Route failed: ${route}`);
  const html = await response.text();
  const locale = route.split('/')[1];
  assert.ok(html.includes(`<html lang="${locale}"`), `Wrong document language: ${route}`);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `Expected one h1: ${route}`);
  assert.ok(/<title>[^<]+<\/title>/.test(html), `Missing title: ${route}`);
  for (const match of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    const href = match[1].split('#')[0];
    if (href.startsWith('/')) assert.ok(known.has(href), `Broken internal link: ${route} → ${href}`);
  }
}
const root = await fetch(base, { redirect: 'manual' });
assert.ok([307,308].includes(root.status), 'Root should redirect');
assert.equal(root.headers.get('location'), '/en');
for (const route of ['/de', '/en/does-not-exist', '/tr/projects/not-a-project']) {
  const response = await fetch(base + route);
  assert.equal(response.status, 404, `Missing route did not return 404: ${route}`);
}
console.log(`PASS: ${routes.length} pages, document languages, page titles, headings, internal links, root redirect, and missing routes.`);
