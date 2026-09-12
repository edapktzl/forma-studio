import {notFound} from 'next/navigation';
import {getLiveDetail,publicMedia} from '../lib/server-content';
import {copy} from '../lib/content';
import {TextLink,Eyebrow,Picture,CallToAction} from './ui';
export async function LiveProject({locale,slug}){
 const project=await getLiveDetail('projects',locale,slug);if(!project)notFound();const c=copy[locale].projects;
 return <><section className="shell project-detail-intro"><TextLink href={'/'+locale+'/projects'}>{copy[locale].nav[3]}</TextLink><Eyebrow>{project.concept}</Eyebrow><h1>{project.title}</h1><p>{project.short_description}</p></section>{project.image&&<div className="shell project-detail-hero"><Picture src={publicMedia(project.image)} alt={project.title} eager/></div>}<section className="shell project-story section-pad"><dl>{[[c.location,project.location],[c.year,project.construction_year],[c.area,project.area_sqm==null?'—':project.area_sqm+' m²']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'—'}</dd></div>)}</dl><div><p style={{whiteSpace:'pre-line'}}>{project.description}</p>{[[c.challenge,project.challenge],[c.approach,project.approach],[c.outcome,project.outcome]].filter(([,text])=>text).map(([label,text])=><article key={label}><h2>{label}</h2><p style={{whiteSpace:'pre-line'}}>{text}</p></article>)}</div></section><section className="shell section-pad project-grid">{project.images.filter(url=>url!==project.image).map((url,index)=><Picture key={url} src={publicMedia(url)} alt={project.title+' · '+(index+2)}/>)}</section><CallToAction locale={locale}/></>;
}
export async function LiveArticle({locale,slug}){
 const article=await getLiveDetail('articles',locale,slug);if(!article)notFound();
 return <><section className="shell article-intro"><TextLink href={'/'+locale+'/insights'}>{copy[locale].nav[4]}</TextLink><Eyebrow>{article.category||'Forma Studio'}</Eyebrow><h1>{article.title}</h1><p>{article.excerpt}</p>{article.published_at&&<time dateTime={article.published_at}>{new Date(article.published_at).toLocaleDateString(locale==='tr'?'tr-TR':'en-GB',{dateStyle:'long',timeZone:'UTC'})}</time>}</section>{article.image&&<div className="shell article-hero"><Picture src={publicMedia(article.image)} alt={article.title} eager/></div>}<article className="article-body" dangerouslySetInnerHTML={{__html:article.content_html}}/><CallToAction locale={locale}/></>;
}
