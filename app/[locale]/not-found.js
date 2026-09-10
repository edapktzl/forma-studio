'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { copy } from '../../lib/content';
export default function NotFound() { const params=useParams(); const locale=params.locale==='tr'?'tr':'en'; const c=copy[locale].notFound; return <section className="shell not-found"><span>404</span><h1>{c.title}</h1><p>{c.text}</p><Link className="button" href={`/${locale}`}>{c.button}<ArrowUpRight size={18}/></Link></section>; }
