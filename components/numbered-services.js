import { ArrowUpRight, HardHat, MapPinned, PenTool, Plus } from 'lucide-react';
import Link from 'next/link';
import { copy } from '../lib/content';
import { Eyebrow } from './ui';

const icons = [MapPinned, PenTool, HardHat];

export default function NumberedServices({ locale }) {
  const c = copy[locale];
  return <section className="home-modern-services" aria-labelledby="home-services-title">
   <div className="shell">
    <div className="home-modern-services-intro"><Eyebrow>{c.home.serviceLabel}</Eyebrow><h2 id="home-services-title">{c.home.serviceTitle}</h2><p>{c.home.serviceText}</p></div>
    <div className="home-modern-service-list">
     {c.services.items.map(([title, tagline, description], index) => { const Icon = icons[index]; return <details className="home-modern-service" key={title}>
      <summary><span className="home-modern-service-number">0{index + 1}</span><Icon size={20} strokeWidth={1.4}/><span className="home-modern-service-title"><b>{title}</b><em>{tagline}</em></span><Plus size={20} className="home-modern-service-plus" /></summary>
      <p>{description}</p>
     </details>; })}
    </div>
    <Link className="home-modern-inline-link home-modern-services-link" href={`/${locale}/services`}>{c.allServices}<ArrowUpRight size={17}/></Link>
   </div>
  </section>;
}
