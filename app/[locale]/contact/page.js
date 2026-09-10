import { MapPin, Clock3 } from 'lucide-react';
import { copy, photos, pageMetadata } from '../../../lib/content';
import { PageIntro, Picture, Eyebrow } from '../../../components/ui';
import ContactForm from '../../../components/contact-form';
export async function generateMetadata({ params }) { return pageMetadata((await params).locale, 5); }
export default async function Contact({ params }) { const {locale}=await params; const c=copy[locale].contact; return <><PageIntro {...c}/><section className="shell contact-grid"><aside><div className="contact-image"><Picture src={photos.detail} alt={locale==='en'?'Natural materials and sculptural details in a warm interior':'Sıcak bir iç mekânda doğal malzemeler ve heykelsi detaylar'} eager/></div><Eyebrow>{c.studio}</Eyebrow><p className="contact-info"><MapPin size={17}/>{c.place}</p><p className="contact-info"><Clock3 size={17}/>{c.hours}</p><p className="visit-note">{c.visit}</p><div className="contact-tip"><h3>{c.direct}</h3><p>{c.directText}</p></div></aside><ContactForm locale={locale}/></section></>; }
