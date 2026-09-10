'use client';
import { useRef, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { copy } from '../lib/content';

export default function ContactForm({ locale }) {
 const c = copy[locale].contact;
 const [submitted, setSubmitted] = useState(false);
 const result = useRef(null);
 function submit(event) {
  event.preventDefault();
  setSubmitted(true);
  requestAnimationFrame(() => result.current?.focus());
 }
 return <div className="contact-form-wrap">
  <h2>{c.formTitle}</h2><p>{c.formIntro}</p>
  <form onSubmit={submit} className={submitted ? 'hidden' : ''} aria-describedby="contact-note">
   <div className="form-grid">
    <label htmlFor="name">{c.name}<input id="name" name="name" autoComplete="name" required maxLength={100}/></label>
    <label htmlFor="email">{c.email}<input id="email" name="email" type="email" autoComplete="email" required maxLength={200}/></label>
   </div>
   <label htmlFor="phone">{c.phone}<input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40}/></label>
   <label htmlFor="subject">{c.subject}<input id="subject" name="subject" required maxLength={200}/></label>
   <label htmlFor="message">{c.message}<textarea id="message" name="message" rows={5} placeholder={c.placeholder} required maxLength={5000}/></label>
   <button className="button" type="submit">{c.submit}<ArrowUpRight size={18}/></button>
   <p className="form-note" id="contact-note">{c.note}</p>
  </form>
  {submitted && <div className="form-success" role="status" ref={result} tabIndex={-1}>
   <span className="success-icon"><Check size={30}/></span><h3>{c.success}</h3><p>{c.successText}</p>
   <button className="text-link mt-6" onClick={() => { setSubmitted(false); requestAnimationFrame(() => document.getElementById('name')?.focus()); }}>{c.edit}<ArrowUpRight size={18}/></button>
  </div>}
 </div>;
}
