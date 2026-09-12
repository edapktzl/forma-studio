'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';
export default function Login(){
 const router=useRouter(), [busy,setBusy]=useState(false), [error,setError]=useState('');
 async function submit(event){
  event.preventDefault();setBusy(true);setError('');
  const data=new FormData(event.currentTarget);
  try { await api('/auth/login',{method:'POST',body:{email:data.get('email'),password:data.get('password')}},false); router.replace('/dashboard'); }
  catch(e){setError(e.status===401?'The email or password is incorrect.':e.message);setBusy(false);}
 }
 return <main className="login-page"><section className="login-story"><div className="wordmark">forma<span>architecture & interiors</span></div><div><p className="eyebrow">THE STUDIO WORKSPACE</p><h1>Good work.<br/>Thoughtfully<br/><em>presented.</em></h1><p>A place to shape the stories, spaces and conversations behind Forma Studio.</p></div><span>EST. 2012 — ISTANBUL</span></section><section className="login-form"><p className="eyebrow">WELCOME BACK</p><h2>Step inside.</h2><p>Sign in to manage your studio.</p><form onSubmit={submit}><label>Email address<input name="email" type="email" required autoComplete="username" placeholder="you@studio.com"/></label><label>Password<input name="password" type="password" required autoComplete="current-password"/></label>{error&&<p className="notice error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'Signing in…':'Sign in to workspace'} <span>↗</span></button></form><small>Private workspace · Authorized team members only</small></section></main>;
}
