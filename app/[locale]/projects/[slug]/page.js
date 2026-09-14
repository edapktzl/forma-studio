import {isLiveContent,getLiveDetail} from '../../../../lib/server-content';
import {LiveProject} from '../../../../components/live-detail';
import { sitePath } from '../../../../lib/site-path';
import { notFound } from 'next/navigation';
import { copy, projects } from '../../../../lib/content';
import { Eyebrow, TextLink, Picture, ProjectCard, CallToAction } from '../../../../components/ui';
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) { if(isLiveContent){ const {locale,slug}=await params; const record=await getLiveDetail('projects',locale,slug); return record?{title:record.title+' | Forma Studio',description:record.short_description||record.excerpt}:{}; }  const { locale, slug } = await params; const p = projects.find(p=>p.slug===slug)?.[locale]; return p ? {title:`${p.title} | Forma Studio`, description:p.intro, alternates:{languages:{en:sitePath(`/en/projects/${slug}/`),tr:sitePath(`/tr/projects/${slug}/`)}}} : {}; }
export default async function Project({ params }) { if(isLiveContent){const {locale,slug}=await params;return <LiveProject locale={locale} slug={slug}/>;}
 const { locale, slug } = await params; const index = projects.findIndex(p=>p.slug===slug); if(index<0) notFound(); const project=projects[index]; const p=project[locale]; const c=copy[locale].projects;
 const stories=[[c.challenge,p.challenge],[c.approach,p.approach],[c.outcome,p.outcome]];
 return <>
  <section className="shell project-detail-intro">
   <div className="project-detail-topline"><TextLink href={`/${locale}/projects`}>{copy[locale].nav[3]}</TextLink><span>{locale==='tr'?'PROJE DETAYI':'PROJECT DETAIL'}</span></div>
   <div className="project-detail-heading"><div><Eyebrow>{p.tag}</Eyebrow><h1>{p.title}</h1></div><p className="project-detail-summary">{p.intro}</p></div>
  </section>
  <div className="shell project-detail-hero"><Picture src={project.image} alt={p.title} eager/><div className="project-hero-meta"><span>{p.tag}</span><span>{p.place} · {project.year}</span></div></div>
  <section className="shell project-story section-pad">
   <aside className="project-facts" aria-label={locale==='tr'?'Proje bilgileri':'Project details'}><Eyebrow>{locale==='tr'?'Proje bilgileri':'Project details'}</Eyebrow><dl>{[[c.location,p.place],[c.year,project.year],[c.area,project.area]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></aside>
   <div className="project-narrative"><p className="project-lead">{p.intro}</p><div className="project-narrative-list">{stories.map(([label,text],storyIndex)=><article key={label}><span className="project-story-number">{String(storyIndex+1).padStart(2,'0')}</span><div><h2>{label}</h2><p>{text}</p></div></article>)}</div></div>
  </section>
  <section className="shell project-detail-footer"><TextLink href={`/${locale}/projects`}>{locale==='tr'?'Tüm projelere dön':'Back to all projects'}</TextLink><p className="portfolio-note">{c.disclaimer}</p></section>
  <section className="shell next-project"><Eyebrow>{c.next}</Eyebrow><ProjectCard project={projects[(index+1)%projects.length]} locale={locale}/></section>
  <CallToAction locale={locale}/>
 </>;
}
