import { sitePath } from '../../../../lib/site-path';
import { notFound } from 'next/navigation';
import { copy, projects } from '../../../../lib/content';
import { Eyebrow, TextLink, Picture, ProjectCard, CallToAction } from '../../../../components/ui';
export function generateStaticParams() { return projects.map(p => ({ slug: p.slug })); }
export const dynamicParams = false;
export async function generateMetadata({ params }) { const { locale, slug } = await params; const p = projects.find(p=>p.slug===slug)?.[locale]; return p ? {title:`${p.title} | Forma Studio`, description:p.intro, alternates:{languages:{en:sitePath(`/en/projects/${slug}/`),tr:sitePath(`/tr/projects/${slug}/`)}}} : {}; }
export default async function Project({ params }) {
 const { locale, slug } = await params; const index = projects.findIndex(p=>p.slug===slug); if(index<0) notFound(); const project=projects[index]; const p=project[locale]; const c=copy[locale].projects;
 return <><section className="shell project-detail-intro"><TextLink href={`/${locale}/projects`}>{copy[locale].nav[3]}</TextLink><Eyebrow>{p.tag}</Eyebrow><h1>{p.title}</h1><p>{p.intro}</p></section><div className="shell project-detail-hero"><Picture src={project.image} alt={p.title} eager/></div><section className="shell project-story section-pad"><dl>{[[c.location,p.place],[c.year,project.year],[c.area,project.area]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div>{[[c.challenge,p.challenge],[c.approach,p.approach],[c.outcome,p.outcome]].map(([title,text])=><article key={title}><h2>{title}</h2><p>{text}</p></article>)}</div></section><section className="shell next-project"><Eyebrow>{c.next}</Eyebrow><ProjectCard project={projects[(index+1)%projects.length]} locale={locale}/><p className="portfolio-note">{c.disclaimer}</p></section><CallToAction locale={locale}/></>;
}
