'use client';
import {useState} from 'react';
import ContentManager from './content-manager';
import {useAdminLanguage} from '../lib/i18n';
export default function Categories(){const [kind,setKind]=useState('project-categories');const {t}=useAdminLanguage();return <><div className="category-tabs"><a href="#category-content" className="sr-only">{t('Skip category switcher')}</a>{[['project-categories','Portfolio categories'],['blog-categories','Journal categories']].map(([value,label])=><button key={value} aria-pressed={kind===value} onClick={()=>setKind(value)}>{t(label)}</button>)}</div><div id="category-content"><ContentManager key={kind} resource={kind}/></div></>;}
