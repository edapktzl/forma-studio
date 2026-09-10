'use client';
import { useState } from 'react';
import { copy, projects } from '../lib/content';
import { ProjectCard } from './ui';

export default function ProjectGallery({ locale }) {
 const [selected, setSelected] = useState('all');
 const c = copy[locale].projects;
 const types = ['all', 'residential', 'workplace', 'hospitality'];
 const visible = projects.filter(p => selected === 'all' || p.type === selected);
 return <><div className="project-filters"><div role="group" aria-label={locale === 'en' ? 'Filter projects' : 'Projeleri filtrele'}>{types.map((type,i) => <button key={type} aria-pressed={selected === type} onClick={() => setSelected(type)}>{c.filters[i]}</button>)}</div><span aria-live="polite">{visible.length} {c.count}</span></div><div className="project-grid">{visible.map(project => <ProjectCard key={project.slug} project={project} locale={locale}/>)}</div><p className="portfolio-note">{c.disclaimer}</p></>;
}
