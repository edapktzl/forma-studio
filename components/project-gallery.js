'use client';

import { useEffect, useState } from 'react';
import { copy, photos, projects } from '../lib/content';
import { getProjects, getProjectCategories, isApiConfigured, mediaUrl } from '../lib/api-client';
import { ProjectCard } from './ui';

export default function ProjectGallery({ locale, featured = false, editorial = false }) {
 const c = copy[locale].projects;
 const live = isApiConfigured();
 const [selected, setSelected] = useState('all');
 const [items, setItems] = useState([]);
 const [categories, setCategories] = useState([]);
 const [page, setPage] = useState(1);
 const [total, setTotal] = useState(0);
 const [loading, setLoading] = useState(live);
 const [error, setError] = useState(false);
 const [attempt, setAttempt] = useState(0);

 useEffect(() => {
  if (!live) return undefined;
  let active = true;
  setLoading(true); setError(false);
  getProjects(locale, { category: selected === 'all' ? null : selected, page, page_size: featured ? 3 : 12, featured: featured ? true : undefined })
   .then((data) => { if (active) { setItems(data?.items || []); setTotal(data?.total || 0); } })
   .catch(() => { if (active) setError(true); })
   .finally(() => { if (active) setLoading(false); });
  return () => { active = false; };
 }, [locale, selected, page, featured, attempt, live]);

 useEffect(() => {
  if (!live || featured) return undefined;
  let active = true;
  getProjectCategories(locale).then((data) => { if (active) setCategories(data || []); }).catch(() => { if (active) setError(true); });
  return () => { active = false; };
 }, [locale, live, featured, attempt]);

 const types = live && categories.length ? [{ slug: 'all', name: c.filters[0] }, ...categories] : ['all', 'residential', 'workplace', 'hospitality'].map((slug, index) => ({ slug, name: c.filters[index] }));
 const usingLive = live && items.length > 0;
 const visible = usingLive
  ? items.map((project) => ({ ...project, year: project.construction_year, area: project.area_sqm ? `${project.area_sqm} m²` : '', image: mediaUrl(project.image) || photos.architecture, [locale]: { title: project.title, tag: project.concept, place: project.location } }))
  : projects.filter((project) => selected === 'all' || project.type === selected).slice(0, featured ? 3 : 100);

 const retry = () => setAttempt((value) => value + 1);
 return <>
  {!featured && <div className="project-filters"><div role="group" aria-label={locale === 'en' ? 'Filter projects' : 'Projeleri filtrele'}>{types.map((type) => <button key={type.slug} aria-pressed={selected === type.slug} onClick={() => { setSelected(type.slug); setPage(1); }}>{type.name}</button>)}</div><span aria-live="polite">{usingLive ? total : visible.length} {c.count}</span></div>}
  {loading ? <p role="status">{locale === 'tr' ? 'Projeler yükleniyor…' : 'Loading projects…'}</p>
   : <>{error && <div className="content-fallback-note" role="status">{locale === 'tr' ? 'Güncel projeler gösterilemiyor; seçili projeler gösteriliyor.' : 'Live projects are unavailable; selected projects are shown instead.'}<button type="button" onClick={retry}>{locale === 'tr' ? 'Yenile' : 'Retry'}</button></div>}{visible.length ? <div className={`project-grid ${featured ? 'featured-projects' : ''} ${editorial ? 'editorial-project-grid' : ''}`}>{visible.map((project, index) => <ProjectCard key={project.slug} project={project} locale={locale} editorial={editorial} index={index} />)}</div> : <p role="status">{locale === 'tr' ? 'Henüz gösterilecek proje bulunmuyor.' : 'No projects to display yet.'}</p>}</>}
  {!featured && usingLive && total > 12 && <nav className="project-filters" aria-label="Pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>{locale === 'tr' ? 'Önceki' : 'Previous'}</button><span>{page} / {Math.ceil(total / 12)}</span><button disabled={page * 12 >= total} onClick={() => setPage((value) => value + 1)}>{locale === 'tr' ? 'Sonraki' : 'Next'}</button></nav>}
 </>;
}
