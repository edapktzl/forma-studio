import ProjectGallery from '../../components/project-gallery';
import ArticleList from '../../components/article-list';
import Testimonials from '../../components/live-testimonials';
import HeroProjectSlider from '../../components/hero-project-slider';
import Link from 'next/link';
import { ArrowUpRight, ArrowDown, Box, Layers3, ScanLine } from 'lucide-react';
import { copy, pageMetadata } from '../../lib/content';
import { Eyebrow, TextLink, SectionHeading, Stats, CallToAction } from '../../components/ui';

export async function generateMetadata({ params }) { return pageMetadata((await params).locale, 0); }
export default async function Home({ params }) {
 const { locale } = await params;
 const c = copy[locale];
 const icons = [Box, Layers3, ScanLine];
 return <>
  <section className="shell home-hero"><div className="hero-heading"><div><Eyebrow>{c.home.eyebrow}</Eyebrow><h1>{c.home.title}</h1></div><div className="hero-intro"><p>{c.home.intro}</p><Link href={`/${locale}/projects`} className="button">{c.explore}<ArrowUpRight size={18}/></Link></div></div><HeroProjectSlider locale={locale}/><div className="hero-bottom"><span>{c.home.scroll}</span><span>İSTANBUL, TÜRKİYE <span className="live-dot"/></span><a href="#studio" aria-label={locale === 'en' ? 'Discover the studio' : 'Stüdyoyu keşfedin'}><ArrowDown size={17}/></a></div></section>
  <section id="studio" className="shell studio-intro"><div><Eyebrow>{c.home.introLabel}</Eyebrow><span className="outline-symbol" aria-hidden="true">f.</span></div><div><h2>{c.home.introTitle}</h2><p>{c.home.introText}</p><TextLink href={`/${locale}/about`}>{c.home.introLink}</TextLink></div></section>
  <Stats locale={locale}/>
  <section className="services-home section-pad"><div className="shell"><SectionHeading label={c.home.serviceLabel} title={c.home.serviceTitle} description={c.home.serviceText} href={`/${locale}/services`} link={c.allServices}/><div className="service-cards">{c.services.items.map(([title, tagline, description], i) => { const Icon = icons[i]; return <Link className="service-card" key={title} href={`/${locale}/services#service-${i+1}`}><div className="service-card-top"><Icon size={35} strokeWidth={1}/><span>0{i+1}</span></div><h3>{title}</h3><p>{description}</p><span className="service-card-bottom">{tagline}<ArrowUpRight size={22}/></span></Link>; })}</div></div></section>
  <section className="shell section-pad"><SectionHeading label={c.home.projectLabel} title={c.home.projectTitle} description={c.home.projectText} href={`/${locale}/projects`} link={c.allProjects}/><ProjectGallery locale={locale} featured/></section>
  <Testimonials locale={locale}/>
  <section className="shell section-pad"><SectionHeading label={c.home.journalLabel} title={c.home.journalTitle} description={c.home.journalText} href={`/${locale}/insights`} link={c.allInsights}/><ArticleList locale={locale} limit={3}/></section>
  <CallToAction locale={locale}/>
 </>;
}
