'use client';
import {useEffect,useState} from 'react';
import {copy} from '../lib/content';
import {getTestimonials,isApiConfigured} from '../lib/api-client';
export default function Testimonials({locale}){
 const [items,setItems]=useState([]);const c=copy[locale].home,live=isApiConfigured();
 useEffect(()=>{let active=true;if(live)getTestimonials(locale).then(data=>{if(active)setItems(data);}).catch(()=>{});return()=>{active=false;};},[locale,live]);
 const source=live?items:[{id:0,quote:c.quote,client_name:c.quoteName,role:c.quoteRole}];
 if(!source.length)return null;
 return <section className="testimonial">{source.map(item=><div key={item.id} className="shell testimonial-inner"><span className="quote-symbol" aria-hidden="true">“</span><blockquote>{item.quote}</blockquote><div><strong>{item.client_name}</strong><span>{[item.role,item.company].filter(Boolean).join(' · ')}</span></div></div>)}</section>;
}
