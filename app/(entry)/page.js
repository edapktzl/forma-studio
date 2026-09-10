'use client';
import { useEffect } from 'react';
import { sitePath } from '../../lib/site-path';
export default function EntryPage() {
 useEffect(() => { window.location.replace(sitePath('/en/')); }, []);
 return <main style={{padding:'4rem',fontFamily:'Arial,sans-serif'}}><h1>Forma Studio</h1><p><a href={sitePath('/en/')}>English</a> · <a href={sitePath('/tr/')}>Türkçe</a></p></main>;
}
