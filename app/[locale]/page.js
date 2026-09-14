import ProjectGallery from '../../components/project-gallery';
import ArticleList from '../../components/article-list';
import Testimonials from '../../components/live-testimonials';
import HeroProjectSlider from '../../components/hero-project-slider';
import { ArrowDown } from 'lucide-react';
import { notFound } from 'next/navigation';
import { copy, pageMetadata } from '../../lib/content';
import { locales } from '../../lib/content';
import { Eyebrow, TextLink, CallToAction } from '../../components/ui';
import AnimatedStats from '../../components/animated-stats';
import NumberedServices from '../../components/numbered-services';
import StudioStatement from '../../components/studio-statement';

export async function generateMetadata({ params }) { return pageMetadata((await params).locale, 0); }

export default async function Home({ params }) {
 const { locale } = await params;
 if (!locales.includes(locale)) notFound();
 const c = copy[locale];
 return <div className="home-modern">
  <section className="home-modern-hero shell" aria-labelledby="home-hero-title">
   <div className="home-modern-hero-intro">
    <Eyebrow>{c.home.eyebrow}</Eyebrow>
    <h1 id="home-hero-title">{c.home.title}</h1>
    <p>{c.home.intro}</p>
   </div>
   <HeroProjectSlider locale={locale}/>
   <div className="home-modern-hero-foot">
    <span>{c.home.scroll}</span>
    <a href="#studio" aria-label={locale === 'en' ? 'Discover the studio' : 'Stüdyoyu keşfedin'}><ArrowDown size={17}/></a>
   </div>
  </section>
  <StudioStatement locale={locale}/>
  <AnimatedStats locale={locale}/>
  <section className="home-modern-projects shell" aria-labelledby="selected-work-title">
   <div className="home-modern-section-head">
    <div><Eyebrow>{c.home.projectLabel}</Eyebrow><h2 id="selected-work-title">{c.home.projectTitle}</h2></div>
    <TextLink href={`/${locale}/projects`}>{c.allProjects}</TextLink>
   </div>
   <ProjectGallery locale={locale} featured editorial/>
  </section>
  <NumberedServices locale={locale}/>
  <Testimonials locale={locale} editorial/>
  <section className="home-modern-journal shell" aria-labelledby="journal-title">
   <div className="home-modern-section-head">
    <div><Eyebrow>{c.home.journalLabel}</Eyebrow><h2 id="journal-title">{c.home.journalTitle}</h2></div>
    <TextLink href={`/${locale}/insights`}>{c.allInsights}</TextLink>
   </div>
   <ArticleList locale={locale} limit={3} editorial/>
  </section>
  <CallToAction locale={locale} compact/>
 </div>;
}
