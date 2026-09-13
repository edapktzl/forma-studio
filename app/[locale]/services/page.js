import { Plus } from 'lucide-react';
import { copy, photos, pageMetadata } from '../../../lib/content';
import { PageIntro, Picture, Eyebrow, TextLink, CallToAction } from '../../../components/ui';

const offeringDetails = {
 en: [
  ['We review the site, planning context and key constraints before design begins.', 'We turn the findings into a clear feasibility direction.'],
  ['We translate the brief into a coherent spatial idea and develop it through each design stage.', 'Decisions stay connected from the first sketch to the resolved proposal.'],
  ['We coordinate planning information, consultants and technical decisions as the design progresses.', 'A shared process keeps the project clear for everyone involved.'],
  ['We stay close during construction to answer questions and protect the design intent.', 'Site reviews and practical decisions help the work reach its full potential.'],
 ],
 tr: [
  ['Tasarım başlamadan önce araziyi, planlama koşullarını ve temel kısıtları inceleriz.', 'Bulguları net bir fizibilite yönüne dönüştürürüz.'],
  ['İhtiyaç programını tutarlı bir mekân fikrine dönüştürür ve her tasarım aşamasında geliştiririz.', 'İlk eskizden çözümlenmiş öneriye kadar kararları birbirine bağlarız.'],
  ['Tasarım ilerlerken planlama bilgilerini, danışmanları ve teknik kararları koordine ederiz.', 'Ortak bir süreç, projedeki herkes için netlik sağlar.'],
  ['Yapım sırasında tasarımın arkasında durur, soruları yanıtlar ve tasarım niyetini koruruz.', 'Saha kontrolleri ve pratik kararlarla işin potansiyeline ulaşmasına yardımcı oluruz.'],
 ],
};

export async function generateMetadata({ params }) { return pageMetadata((await params).locale, 2); }
export default async function Services({ params }) {
 const { locale } = await params; const c = copy[locale].services;
 return <><PageIntro {...c}/><section className="shell service-details">{c.items.map(([title, tagline, description, list], i) => <article className="service-detail" id={`service-${i+1}`} key={title}><div className="service-detail-image"><Picture src={[photos.architecture, photos.interior, photos.workplace][i]} alt={tagline} eager={i===0}/><span>0{i+1}</span></div><div><Eyebrow>{title}</Eyebrow><h2>{tagline}</h2><p>{description}</p><ul>{list.map((item, index) => <li key={item}><details className="service-offering"><summary>{item}<Plus size={15}/></summary><p>{offeringDetails[locale][index][0]}<br/><br/>{offeringDetails[locale][index][1]}</p></details></li>)}</ul><TextLink href={`/${locale}/contact`}>{copy[locale].start}</TextLink></div></article>)}</section><section className="process-section section-pad"><div className="shell"><Eyebrow light>{c.processLabel}</Eyebrow><h2>{c.processTitle}</h2><div className="process-grid">{c.steps.map(([title, text], i) => <article key={title}><span>0{i+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section><section className="shell faq-section section-pad"><h2>{c.faqTitle}</h2><div>{c.faqs.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={20}/></summary><p>{answer}</p></details>)}</div></section><CallToAction locale={locale}/></>;
}
