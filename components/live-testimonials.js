'use client';

import { useEffect, useState } from 'react';
import { copy, photos } from '../lib/content';
import { getTestimonials, isApiConfigured } from '../lib/api-client';
import { Picture } from './ui';

export default function Testimonials({ locale, editorial = false }) {
 const [items, setItems] = useState([]);
 const c = copy[locale].home;
 const live = isApiConfigured();
 useEffect(() => {
  let active = true;
  if (live) getTestimonials(locale).then((data) => { if (active) setItems(data || []); }).catch(() => {});
  return () => { active = false; };
 }, [locale, live]);

 const source = live && items.length ? items : [{ id: 0, quote: c.quote, client_name: c.quoteName, role: c.quoteRole }];
 if (!source.length) return null;
 if (!editorial) return <section className="testimonial">{source.map((item) => <div key={item.id} className="shell testimonial-inner"><span className="quote-symbol" aria-hidden="true">“</span><blockquote>{item.quote}</blockquote><div><strong>{item.client_name}</strong><span>{[item.role, item.company].filter(Boolean).join(' · ')}</span></div></div>)}</section>;
 const item = source[0];
 return <section className="home-modern-testimonial" aria-label={locale === 'tr' ? 'Müşteri yorumu' : 'Client testimonial'}>
  <div className="shell home-modern-testimonial-grid">
   <div className="home-modern-testimonial-image"><Picture src={photos.interior} alt={locale === 'tr' ? 'Malzeme ve doğal ışık detayı' : 'Material and natural light detail'} /></div>
   <div className="home-modern-testimonial-copy"><span className="quote-symbol" aria-hidden="true">“</span><blockquote>{item.quote}</blockquote><div><strong>{item.client_name}</strong><span>{[item.role, item.company].filter(Boolean).join(' · ')}</span></div></div>
  </div>
 </section>;
}
