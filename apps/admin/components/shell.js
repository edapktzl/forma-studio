'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../lib/api-client';
import { useAdminLanguage } from '../lib/i18n';

const links = [['/dashboard','overview','01'],['/projects','projects','02'],['/articles','journal','03'],['/testimonials','testimonials','04'],['/messages','messages','05'],['/media','media','06'],['/categories','categories','07']];
export default function Shell({children}) {
  const {language,setLanguage,t}=useAdminLanguage();
  const [user,setUser] = useState(null), [error,setError] = useState(''), [open,setOpen] = useState(false), [attempt,setAttempt] = useState(0);
  const pathname = usePathname(), router = useRouter();
  useEffect(() => {
    let active = true;
    api('/auth/me').then(data => { if(active) { if(data.role !== 'admin') setError('This account does not have administrator access.'); else setUser(data); } }).catch(e => {
      if(active) { if(e.status===401) router.replace('/login'); else setError(e.message); }
    });
    const expired = () => { setUser(null); router.replace('/login'); };
    window.addEventListener('session-expired',expired);
    return () => { active=false; window.removeEventListener('session-expired',expired); };
  },[router,attempt]);
  useEffect(() => { setOpen(false); },[pathname]);
  useEffect(() => { const escape = e => { if(e.key==='Escape') setOpen(false); }; window.addEventListener('keydown',escape); return()=>window.removeEventListener('keydown',escape); },[]);
  async function logout(){ try { await api('/auth/logout',{method:'POST'}); router.replace('/login'); } catch(e){setError(e.message);} }
  if(!user) return <main className="session-screen">{error ? <><h1>{t('session')}</h1><p role="alert">{error}</p><button onClick={()=>{setError('');setAttempt(n=>n+1);}}>{t('retry')}</button><Link href="/login">{t('back')}</Link></> : <p role="status">{t('workspace')}</p>}</main>;
  return <div className="admin-shell">
    <header className="mobile-header"><Link href="/dashboard" className="wordmark">forma<span>studio</span></Link><button aria-label="Toggle navigation" aria-expanded={open} aria-controls="admin-navigation" onClick={()=>setOpen(!open)}>☰</button></header>
    {open && <button className="nav-backdrop" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
    <aside className={'sidebar '+(open?'is-open':'')} id="admin-navigation">
      <Link href="/dashboard" className="wordmark">forma<span>studio / workspace</span></Link>
      <div className="sidebar-label">{t('management')}</div>
      <nav aria-label="Admin navigation">{links.map(([href,label,index])=><Link key={href} href={href} aria-current={pathname.startsWith(href)?'page':undefined}><span>{index}</span>{t(label)}<b>↗</b></Link>)}</nav>
      <div className="sidebar-bottom"><p>{user.full_name}<small>{user.email}</small></p><div className="sidebar-actions"><label className="language-switcher"><span className="sr-only">Panel language</span><select value={language} onChange={e=>setLanguage(e.target.value)} aria-label="Panel language"><option value="en">EN</option><option value="tr">TR</option></select></label><button className="signout" onClick={logout}>{t('signout')} <span>↗</span></button></div></div>
    </aside>
    <div className="workspace"><div className="topbar"><span>FORMA STUDIO <i>/</i> {t(links.find(([p])=>pathname.startsWith(p))?.[1]||'overview')}</span><a href={process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'} target="_blank" rel="noreferrer">{t('website')} ↗</a></div>{error && <p className="notice error" role="alert">{error}</p>}{children}<footer className="workspace-footer">FORMA STUDIO <span>A considered space for your work.</span></footer></div>
  </div>;
}
