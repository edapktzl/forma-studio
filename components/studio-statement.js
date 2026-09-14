import { ArrowUpRight } from 'lucide-react';
import { copy, photos } from '../lib/content';
import { Eyebrow, Picture } from './ui';
import Link from 'next/link';

export default function StudioStatement({ locale }) {
  const c = copy[locale];
  return <section id="studio" className="home-modern-statement shell" aria-labelledby="studio-statement-title">
   <div className="home-modern-statement-index"><Eyebrow>{c.home.introLabel}</Eyebrow><span aria-hidden="true">01</span></div>
   <div className="home-modern-statement-copy"><h2 id="studio-statement-title">{c.home.introTitle}</h2><p>{c.home.introText}</p><Link className="home-modern-inline-link" href={`/${locale}/about`}>{c.home.introLink}<ArrowUpRight size={17}/></Link></div>
   <div className="home-modern-statement-image"><Picture src={photos.detail} alt={locale === 'tr' ? 'Doğal malzemeler ve ışıkla şekillenen iç mekân detayı' : 'Interior detail shaped by natural materials and light'} /></div>
  </section>;
}
