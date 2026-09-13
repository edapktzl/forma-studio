'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../lib/api-client';
import { useAdminLanguage } from '../lib/i18n';
export default function Dashboard(){
 const [data,setData]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const {t}=useAdminLanguage();
 useEffect(()=>{api('/admin/dashboard').then(setData).catch(e=>setError(e.message));},[attempt]);
 const cards=[['projects','Projects','/projects'],['articles','Journal entries','/articles'],['testimonials','Testimonials','/testimonials'],['unread_messages','Unread messages','/messages']];
 const quickLinks=[['Write a journal entry','Share an idea, a material or a milestone.','/articles'],['Read your messages','Turn a first hello into a conversation.','/messages'],['Organize your imagery','Upload photographs and find your next cover.','/media']];
 return <main className="content"><div className="page-heading"><div><p className="eyebrow">{t('YOUR STUDIO, AT A GLANCE')}</p><h1>{t('Room to create.')}</h1><p>{t('Keep your portfolio current and your conversations moving.')}</p></div><Link className="primary" href="/projects?new=1">{t('Add a project')} ↗</Link></div>{error&&<div className="notice error" role="alert">{error}<button onClick={()=>{setError('');setAttempt(n=>n+1);}}>{t('Retry')}</button></div>}<div className="stat-grid">{cards.map(([key,label,href])=><Link className="stat-card" key={key} href={href}><span>{t(label)} ↗</span><strong>{data?data[key]:'—'}</strong><small>{t('Open {section}',{section:t(label).toLowerCase()})}</small></Link>)}</div><section className="overview-grid"><div className="editorial-card"><p className="eyebrow">{t('MAKE YOUR NEXT IMPRESSION')}</p><h2>{t('Every space')}<br/>{t('has a story.')}</h2><p>{t('Add the project, bring together its images, and tell its story in English and Turkish. Publish when both versions are ready.')}</p><Link className="text-link" href="/projects">{t('Explore your portfolio')} ↗</Link></div><div className="quick-links"><h2>{t('On your desk')}</h2>{quickLinks.map(([title,text,href])=><Link key={href} href={href}><div><h3>{t(title)}</h3><p>{t(text)}</p></div><span>↗</span></Link>)}</div></section></main>;
}
