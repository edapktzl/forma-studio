'use client';
import { useRef, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { copy } from '../lib/content';
import { postContactMessage } from '../lib/api-client';

export default function ContactForm({ locale }) {
 const c = copy[locale].contact;
 const [submitted, setSubmitted] = useState(false);
 const [error, setError] = useState('');
 const result = useRef(null);
 async function submit(event) {
  event.preventDefault();
  setError('');
  const data = new FormData(event.currentTarget);
  try {
   await postContactMessage({ first_name: data.get('first_name'), last_name: data.get('last_name'), email: data.get('email'), phone: data.get('phone') || null, subject: data.get('subject'), message: data.get('message') });
   setSubmitted(true);
  } catch (submissionError) { setError(submissionError.message); }
  requestAnimationFrame(() => result.current?.focus());
 }
 return <div className="contact-form-wrap">
  <h2>{c.formTitle}</h2><p>{c.formIntro}</p>
  <form onSubmit={submit} className={submitted ? 'hidden' : ''} aria-describedby="contact-note">
   <div className="form-grid">
    <label htmlFor="first_name">{c.firstName || c.name}<input id="first_name" name="first_name" autoComplete="given-name" required maxLength={100}/></label>
    <label htmlFor="last_name">{c.lastName || c.name}<input id="last_name" name="last_name" autoComplete="family-name" required maxLength={100}/></label>
   </div>
   <label htmlFor="email">{c.email}<input id="email" name="email" type="email" autoComplete="email" required maxLength={200}/></label>
   <label htmlFor="phone">{c.phone}<input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40}/></label>
   <label htmlFor="subject">{c.subject}<input id="subject" name="subject" required maxLength={200}/></label>
   <label htmlFor="message">{c.message}<textarea id="message" name="message" rows={5} placeholder={c.placeholder} required maxLength={5000}/></label>
   <button className="button" type="submit">{c.submit}<ArrowUpRight size={18}/></button>
   {error && <p className="form-error" role="alert">{error}</p>}
   <p className="form-note" id="contact-note">{c.note}</p>
  </form>
  {submitted && <div className="form-success" role="status" ref={result} tabIndex={-1}>
   <span className="success-icon"><Check size={30}/></span><h3>{c.success}</h3><p>{c.successText}</p>
   <button className="text-link mt-6" onClick={() => { setSubmitted(false); requestAnimationFrame(() => document.getElementById('first_name')?.focus()); }}>{c.edit}<ArrowUpRight size={18}/></button>
  </div>}
 </div>;
}
