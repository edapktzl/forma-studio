import { notFound } from 'next/navigation';
import { getLiveDetail, publicMedia } from '../lib/server-content';
import { copy, projects, articles } from '../lib/content';
import { TextLink, Eyebrow, Picture, ProjectCard, ArticleCard, CallToAction } from './ui';

function StaticProject({ locale, slug }) {
 const index = projects.findIndex((item) => item.slug === slug);
 if (index < 0) return null;
 const project = projects[index];
 const p = project[locale];
 const c = copy[locale].projects;
 const stories = [[c.challenge, p.challenge], [c.approach, p.approach], [c.outcome, p.outcome]];
 return <>
  <section className="shell project-detail-intro">
   <div className="project-detail-topline"><TextLink href={`/${locale}/projects`}>{copy[locale].nav[3]}</TextLink><span>{locale === 'tr' ? 'PROJE DETAYI' : 'PROJECT DETAIL'}</span></div>
   <div className="project-detail-heading"><div><Eyebrow>{p.tag}</Eyebrow><h1>{p.title}</h1></div><p className="project-detail-summary">{p.intro}</p></div>
  </section>
  <div className="shell project-detail-hero"><Picture src={project.image} alt={p.title} eager/><div className="project-hero-meta"><span>{p.tag}</span><span>{p.place} · {project.year}</span></div></div>
  <section className="shell project-story section-pad">
   <aside className="project-facts" aria-label={locale === 'tr' ? 'Proje bilgileri' : 'Project details'}><Eyebrow>{locale === 'tr' ? 'Proje bilgileri' : 'Project details'}</Eyebrow><dl>{[[c.location, p.place], [c.year, project.year], [c.area, project.area]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></aside>
   <div className="project-narrative"><p className="project-lead">{p.intro}</p><div className="project-narrative-list">{stories.map(([label, text], storyIndex) => <article key={label}><span className="project-story-number">{String(storyIndex + 1).padStart(2, '0')}</span><div><h2>{label}</h2><p>{text}</p></div></article>)}</div></div>
  </section>
  <section className="shell project-detail-footer"><TextLink href={`/${locale}/projects`}>{locale === 'tr' ? 'Tüm projelere dön' : 'Back to all projects'}</TextLink><p className="portfolio-note">{c.disclaimer}</p></section>
  <section className="shell next-project"><Eyebrow>{c.next}</Eyebrow><ProjectCard project={projects[(index + 1) % projects.length]} locale={locale}/></section>
  <CallToAction locale={locale}/>
 </>;
}

export async function LiveProject({ locale, slug }) {
 const project = await getLiveDetail('projects', locale, slug);
 if (!project) {
  const fallback = StaticProject({ locale, slug });
  if (fallback) return fallback;
  notFound();
 }
 const c = copy[locale].projects;
 const stories = [[c.challenge, project.challenge], [c.approach, project.approach], [c.outcome, project.outcome]].filter(([, text]) => text);
 const gallery = (project.images || []).filter((url) => url && url !== project.image);
 return <>
  <section className="shell project-detail-intro">
   <div className="project-detail-topline"><TextLink href={`/${locale}/projects`}>{copy[locale].nav[3]}</TextLink><span>{locale === 'tr' ? 'PROJE DETAYI' : 'PROJECT DETAIL'}</span></div>
   <div className="project-detail-heading"><div><Eyebrow>{project.concept}</Eyebrow><h1>{project.title}</h1></div><p className="project-detail-summary">{project.short_description}</p></div>
  </section>
  {project.image && <div className="shell project-detail-hero"><Picture src={publicMedia(project.image)} alt={project.title} eager/><div className="project-hero-meta"><span>{project.concept}</span><span>{project.location}{project.construction_year ? ` · ${project.construction_year}` : ''}</span></div></div>}
  <section className="shell project-story section-pad">
   <aside className="project-facts" aria-label={locale === 'tr' ? 'Proje bilgileri' : 'Project details'}><Eyebrow>{locale === 'tr' ? 'Proje bilgileri' : 'Project details'}</Eyebrow><dl>{[[c.location, project.location], [c.year, project.construction_year], [c.area, project.area_sqm == null ? '—' : `${project.area_sqm} m²`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl></aside>
   <div className="project-narrative">{project.description && <p className="project-lead" style={{ whiteSpace: 'pre-line' }}>{project.description}</p>}<div className="project-narrative-list">{stories.map(([label, text], index) => <article key={label}><span className="project-story-number">{String(index + 1).padStart(2, '0')}</span><div><h2>{label}</h2><p style={{ whiteSpace: 'pre-line' }}>{text}</p></div></article>)}</div></div>
  </section>
  {gallery.length > 0 && <section className="shell project-detail-gallery"><div className="project-gallery-heading"><Eyebrow>{locale === 'tr' ? 'Proje galerisi' : 'Project gallery'}</Eyebrow><span>{String(gallery.length).padStart(2, '0')} {locale === 'tr' ? 'görsel' : 'images'}</span></div><div className="project-gallery-grid">{gallery.map((url, index) => <div className="project-gallery-image" key={url}><Picture src={publicMedia(url)} alt={`${project.title} ${locale === 'tr' ? 'proje görseli' : 'project image'} ${index + 2}`}/></div>)}</div></section>}
  <section className="shell project-detail-footer"><TextLink href={`/${locale}/projects`}>{locale === 'tr' ? 'Tüm projelere dön' : 'Back to all projects'}</TextLink><p className="portfolio-note">{c.disclaimer}</p></section>
  <CallToAction locale={locale}/>
 </>;
}

function StaticArticle({ locale, slug }) {
 const article = articles.find((item) => item.slug === slug);
 if (!article) return null;
 const a = article[locale];
 const c = copy[locale];
 return <>
  <section className="shell article-intro"><TextLink href={`/${locale}/insights`}>{c.nav[4]}</TextLink><Eyebrow>{a.category}</Eyebrow><h1>{a.title}</h1><p>{a.excerpt}</p><div className="article-byline"><span>{c.insights.by}</span><span>{a.read}</span><time dateTime={article.date}>{new Date(`${article.date}T12:00:00Z`).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time></div></section>
  <div className="shell article-hero"><Picture src={article.image} alt={a.title} eager/></div>
  <article className="article-body">{a.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}</article>
  <section className="shell related-articles"><Eyebrow>{c.insights.more}</Eyebrow><div className="article-grid">{articles.filter((item) => item.slug !== slug).map((item) => <ArticleCard key={item.slug} article={item} locale={locale}/>)}</div></section>
  <CallToAction locale={locale}/>
 </>;
}

export async function LiveArticle({ locale, slug }) {
 const article = await getLiveDetail('articles', locale, slug);
 if (!article) {
  const fallback = StaticArticle({ locale, slug });
  if (fallback) return fallback;
  notFound();
 }
 return <><section className="shell article-intro"><TextLink href={`/${locale}/insights`}>{copy[locale].nav[4]}</TextLink><Eyebrow>{article.category || 'Forma Studio'}</Eyebrow><h1>{article.title}</h1><p>{article.excerpt}</p>{article.published_at && <time dateTime={article.published_at}>{new Date(article.published_at).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', { dateStyle: 'long', timeZone: 'UTC' })}</time>}</section>{article.image && <div className="shell article-hero"><Picture src={publicMedia(article.image)} alt={article.title} eager/></div>}<article className="article-body" dangerouslySetInnerHTML={{ __html: article.content_html }}/><CallToAction locale={locale}/></>;
}
