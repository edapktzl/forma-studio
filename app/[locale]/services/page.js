import { Plus } from 'lucide-react';
import { copy, photos, pageMetadata } from '../../../lib/content';
import { PageIntro, Picture, Eyebrow, TextLink, CallToAction } from '../../../components/ui';
export async function generateMetadata({ params }) { return pageMetadata((await params).locale, 2); }
export default async function Services({ params }) {
 const { locale } = await params; const c = copy[locale].services;
 return <><PageIntro {...c}/><section className="shell service-details">{c.items.map(([title, tagline, description, list], i) => <article className="service-detail" id={`service-${i+1}`} key={title}><div className="service-detail-image"><Picture src={[photos.architecture, photos.interior, photos.workplace][i]} alt={tagline} eager={i===0}/><span>0{i+1}</span></div><div><Eyebrow>{title}</Eyebrow><h2>{tagline}</h2><p>{description}</p><ul>{list.map(item => <li key={item}>{item}<Plus size={15}/></li>)}</ul><TextLink href={`/${locale}/contact`}>{copy[locale].start}</TextLink></div></article>)}</section><section className="process-section section-pad"><div className="shell"><Eyebrow light>{c.processLabel}</Eyebrow><h2>{c.processTitle}</h2><div className="process-grid">{c.steps.map(([title, text], i) => <article key={title}><span>0{i+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section><section className="shell faq-section section-pad"><h2>{c.faqTitle}</h2><div>{c.faqs.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={20}/></summary><p>{answer}</p></details>)}</div></section><CallToAction locale={locale}/></>;
}
