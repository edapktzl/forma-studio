'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { copy, paths } from '../lib/content';

export function Brand() {
  return <span className="brand"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span>forma<span className="brand-dot">®</span></span>;
}

export function FooterLanguages() {
 const pathname = usePathname();
 return <div>{['en','tr'].map((language, i) => <span key={language}>{i > 0 && <span aria-hidden="true"> / </span>}<a href={pathname.replace(/^\/(en|tr)(?=\/|$)/, `/${language}`)} hrefLang={language} lang={language}>{language === 'en' ? 'English' : 'Türkçe'}</a></span>)}</div>;
}

export default function SiteHeader({ locale }) {
  const c = copy[locale];
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);
  const panel = useRef(null);
  const other = locale === 'en' ? 'tr' : 'en';
  const alternate = pathname.replace(/^\/(en|tr)(?=\/|$)/, `/${other}`);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = event => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
      if (event.key === 'Tab') {
        const links = [toggle.current, ...panel.current.querySelectorAll('a, button')];
        if (event.shiftKey && document.activeElement === links[0]) { event.preventDefault(); links.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === links.at(-1)) { event.preventDefault(); links[0].focus(); }
      }
    };
    const resize = () => { if (window.innerWidth >= 1024) setOpen(false); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', close);
    window.addEventListener('resize', resize);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', close); window.removeEventListener('resize', resize); };
  }, [open]);

  return <header className="site-header">
    <div className="shell header-row">
      <Link href={`/${locale}`} aria-label="Forma Studio"><Brand/></Link>
      <nav className="desktop-nav" aria-label={locale === 'en' ? 'Main navigation' : 'Ana menü'}>
        {paths.slice(0, 5).map((path, i) => <Link key={path} href={`/${locale}${path}`} aria-current={pathname === `/${locale}${path}` || (path && pathname.startsWith(`/${locale}${path}/`)) ? 'page' : undefined}>{c.nav[i]}</Link>)}
      </nav>
      <div className="header-actions">
        <div className="language-switch" aria-label={locale === 'en' ? 'Language' : 'Dil'}><span aria-current="true">{locale.toUpperCase()}</span><span className="language-divider">/</span><a href={alternate} lang={other} hrefLang={other} aria-label={other === 'en' ? 'Switch to English' : 'Türkçeye geç'}>{other.toUpperCase()}</a></div>
        <Link className="button button-small header-contact" href={`/${locale}/contact`}>{c.start}<ArrowUpRight size={16}/></Link>
        <button ref={toggle} className="menu-toggle" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? c.close : c.menu} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
      </div>
    </div>
    {open && <nav ref={panel} id="mobile-navigation" className="mobile-nav" aria-label={locale === 'en' ? 'Mobile navigation' : 'Mobil menü'}>{paths.map((path, i) => <Link key={path} href={`/${locale}${path}`} aria-current={pathname === `/${locale}${path}` ? 'page' : undefined} onClick={() => setOpen(false)}><span className="mobile-number">0{i+1}</span>{c.nav[i]}<ArrowUpRight/></Link>)}<p>FORMA STUDIO · İSTANBUL</p></nav>}
  </header>;
}
