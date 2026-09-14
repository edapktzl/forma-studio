'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { photos, projects } from '../lib/content';
import { getProjects, isApiConfigured, mediaUrl } from '../lib/api-client';
import { Picture } from './ui';

function fallbackProjects(locale) {
 return projects.slice(0, 3).map((project) => ({ slug: project.slug, image: project.image, video: '', title: project[locale].title, concept: project[locale].tag, location: project[locale].place, year: project.year }));
}

function normalizeProjects(items, locale) {
 return items.filter((item) => item?.slug).map((item) => ({ slug: item.slug, image: mediaUrl(item.image) || photos.hero, video: mediaUrl(item.video_url || item.video) || '', title: item.title || item[locale]?.title || item.slug, concept: item.concept || item[locale]?.tag || '', location: item.location || item[locale]?.place || '', year: item.construction_year || item.year || '' }));
}

function preloadImage(src) {
 return new Promise((resolve) => {
  if (!src) { resolve(false); return; }
  const image = new window.Image();
  image.onload = () => resolve(true);
  image.onerror = () => resolve(false);
  image.src = src;
 });
}

export default function HeroProjectSlider({ locale }) {
 const fallback = useMemo(() => fallbackProjects(locale), [locale]);
 const apiConfigured = isApiConfigured();
 const [items, setItems] = useState(() => apiConfigured ? [] : fallback);
 const [active, setActive] = useState(0);
 const [paused, setPaused] = useState(false);
 const [loaded, setLoaded] = useState(false);
 const [reducedMotion, setReducedMotion] = useState(false);
 const videoRef = useRef(null);

 useEffect(() => {
 if (!apiConfigured) {
   setItems(fallback); setActive(0); setLoaded(true);
   return undefined;
  }
 let current = true;
 setItems([]); setActive(0); setLoaded(false);
  const request = getProjects(locale, { featured: true, page: 1, page_size: 3 });
  const timeout = new Promise((_, reject) => window.setTimeout(() => reject(new Error('Featured projects request timed out.')), 5000));
  Promise.race([request, timeout]).then(async (data) => {
   const normalized = normalizeProjects(data?.items || [], locale);
   const checks = await Promise.all(normalized.map(async (item) => (await preloadImage(item.image)) ? item : null));
   const ready = checks.filter(Boolean);
   if (current) { setItems(ready.length ? ready : fallback); setActive(0); setLoaded(true); }
  }).catch(() => {
   if (current) { setItems(fallback); setActive(0); setLoaded(true); }
  });
  return () => { current = false; };
 }, [apiConfigured, fallback, locale]);
 useEffect(() => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => setReducedMotion(query.matches);
  update(); query.addEventListener?.('change', update);
  return () => query.removeEventListener?.('change', update);
 }, []);
 const project = items[active] || null;
 useEffect(() => {
  if (items.length < 2 || paused || reducedMotion) return undefined;
  const timer = window.setInterval(() => setActive((index) => (index + 1) % items.length), 6000);
  return () => window.clearInterval(timer);
 }, [items.length, paused, reducedMotion]);
 useEffect(() => {
  const video = videoRef.current;
  if (!video) return;
  if (paused || reducedMotion) { video.pause(); return; }
  video.play().catch(() => {});
 }, [project?.video, paused, reducedMotion]);

 if (!project) return <div className="hero-project-slider is-loading" role="region" aria-busy="true" aria-label={locale === 'tr' ? 'Öne çıkan projeler yükleniyor' : 'Loading featured projects'} />;
 const goTo = (direction) => setActive((index) => (index + direction + items.length) % items.length);
 return <div className="hero-project-slider" role="region" aria-roledescription="carousel" aria-label={locale === 'tr' ? 'Öne çıkan projeler' : 'Featured projects'} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
  <Link className="hero-project-link" href={`/${locale}/projects/${project.slug}`} aria-label={locale === 'tr' ? `${project.title} projesini incele` : `View ${project.title} project`}>
   {project.video && !reducedMotion ? <video ref={videoRef} key={project.slug} className="picture hero-video" src={project.video} poster={project.image} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" /> : <Picture key={project.slug} src={project.image} alt={`${project.title} — ${project.concept}`} eager={!loaded && active === 0} sizes="(max-width: 767px) 100vw, 92vw" />}
   <span className="hero-image-shade" />
   <span className="hero-image-caption" aria-live="polite"><span><b>{project.title}</b><small>{project.concept}{project.concept && project.location ? ' · ' : ''}{project.location}{project.year ? ` · ${project.year}` : ''}</small></span></span>
  </Link>
  {items.length > 1 && <div className="hero-slider-controls" aria-label={locale === 'tr' ? 'Proje slayt kontrolleri' : 'Project slide controls'}><button className="hero-slider-control" type="button" onClick={() => goTo(-1)} aria-label={locale === 'tr' ? 'Önceki proje' : 'Previous project'}><ArrowLeft size={19} /></button><button className="hero-slider-control" type="button" onClick={() => goTo(1)} aria-label={locale === 'tr' ? 'Sonraki proje' : 'Next project'}><ArrowRight size={19} /></button></div>}
  <div className="hero-side-label">FORMA — {locale === 'tr' ? 'SEÇİLİ İŞLER' : 'SELECTED WORK'} / {String(active + 1).padStart(2, '0')}</div>
  {items.length > 1 && <div className="hero-slider-progress" aria-hidden="true"><span>{String(active + 1).padStart(2, '0')}</span><i /><span>{String(items.length).padStart(2, '0')}</span></div>}
 </div>;
}
