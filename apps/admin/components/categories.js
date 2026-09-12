'use client';
import {useState} from 'react';
import ContentManager from './content-manager';
export default function Categories(){const [kind,setKind]=useState('project-categories');return <><div className="category-tabs"><a href="#category-content" className="sr-only">Skip category switcher</a>{[['project-categories','Portfolio categories'],['blog-categories','Journal categories']].map(([value,label])=><button key={value} aria-pressed={kind===value} onClick={()=>setKind(value)}>{label}</button>)}</div><div id="category-content"><ContentManager key={kind} resource={kind}/></div></>;}
