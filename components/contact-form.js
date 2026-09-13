'use client';
import { useRef, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { copy } from '../lib/content';
import { isApiConfigured, postContactMessage } from '../lib/api-client';

export default function ContactForm({ locale }) {
 const c = copy[locale].contact;
 const live = isApiConfigured();
 const text = locale === 'tr' ? {
  firstName: 'Ad', lastName: 'Soyad', sending: 'Gönderiliyor…',
  note: 'Mesajınız ve iletişim bilgileriniz, talebinize yanıt verebilmemiz için saklanır.',
  success: 'Mesajınız alındı. Ekibimiz en kısa sürede sizinle iletişime geçecek.',
  another: 'Yeni mesaj yaz', invalid: 'Lütfen alanları kontrol edin. Ad, soyad ve konu en az 2, mesaj en az 15 karakter olmalıdır.',
  limited: 'Çok fazla mesaj gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.',
  failed: 'Mesaj gönderilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.',
 } : {
  firstName: 'First name', lastName: 'Last name', sending: 'Sending…',
  note: 'Your message and contact details are stored so our team can respond to your enquiry.',
  success: 'Your message has been received. Our team will get back to you soon.',
  another: 'Write another message', invalid: 'Please check your details. Names and subject need at least 2 characters; the message needs at least 15.',
  limited: 'You have sent too many messages. Please wait a little and try again.',
  failed: 'Unable to send your message. Check your connection and try again.',
 };
 const [submitted, setSubmitted] = useState(false);
 const [pending, setPending] = useState(false);
 const [error, setError] = useState('');
 const result = useRef(null);
 const form = useRef(null);
 const inFlight = useRef(false);
 async function submit(event) {
  event.preventDefault();
  if (inFlight.current) return;
  setError('');
  const data = new FormData(event.currentTarget);
  const payload = Object.fromEntries(['first_name', 'last_name', 'email', 'phone', 'subject', 'message'].map(key => [key, String(data.get(key) || '').trim()]));
  if (['first_name', 'last_name', 'subject'].some(key => payload[key].length < 2) || payload.message.length < 15) {
   setError(text.invalid);
   return;
  }
  inFlight.current = true;
  setPending(true);
  try {
   await postContactMessage({ ...payload, phone: payload.phone || null });
   setSubmitted(true);
  } catch (submissionError) { setError(submissionError.status === 422 ? text.invalid : submissionError.status === 429 ? text.limited : text.failed); }
  finally { inFlight.current = false; setPending(false); }
  requestAnimationFrame(() => result.current?.focus());
 }
 return <div className="contact-form-wrap">
  <h2>{c.formTitle}</h2><p>{c.formIntro}</p>
  <form ref={form} onSubmit={submit} className={submitted ? 'hidden' : ''} aria-describedby="contact-note" aria-busy={pending}>
   <div className="form-grid">
    <label htmlFor="first_name">{text.firstName}<input id="first_name" name="first_name" autoComplete="given-name" required minLength={2} maxLength={100} disabled={pending}/></label>
    <label htmlFor="last_name">{text.lastName}<input id="last_name" name="last_name" autoComplete="family-name" required minLength={2} maxLength={100} disabled={pending}/></label>
   </div>
   <label htmlFor="email">{c.email}<input id="email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={pending}/></label>
   <label htmlFor="phone">{c.phone}<input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} disabled={pending}/></label>
   <label htmlFor="subject">{c.subject}<input id="subject" name="subject" required minLength={2} maxLength={200} disabled={pending}/></label>
   <label htmlFor="message">{c.message}<textarea id="message" name="message" rows={5} placeholder={c.placeholder} required minLength={15} maxLength={5000} disabled={pending}/></label>
   <button className="button" type="submit" disabled={pending}>{pending ? text.sending : c.submit}<ArrowUpRight size={18}/></button>
   {error && <p className="form-error" role="alert">{error}</p>}
   <p className="form-note" id="contact-note">{live ? text.note : c.note}</p>
  </form>
  {submitted && <div className="form-success" role="status" ref={result} tabIndex={-1}>
   <span className="success-icon"><Check size={30}/></span><h3>{c.success}</h3><p>{live ? text.success : c.successText}</p>
   <button className="text-link mt-6" onClick={() => { if (live) form.current?.reset(); setSubmitted(false); requestAnimationFrame(() => document.getElementById('first_name')?.focus()); }}>{live ? text.another : c.edit}<ArrowUpRight size={18}/></button>
  </div>}
 </div>;
}
