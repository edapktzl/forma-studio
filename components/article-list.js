'use client';
import {useEffect,useState} from 'react';
import {articles} from '../lib/content';
import {getArticles,isApiConfigured,mediaUrl} from '../lib/api-client';
import {ArticleCard} from './ui';
export default function ArticleList({locale,limit}){
 const live=isApiConfigured(),[items,setItems]=useState([]),[loading,setLoading]=useState(live),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[page,setPage]=useState(1);
 useEffect(()=>{if(!live)return;let active=true;setLoading(true);setError(false);getArticles(locale,page,limit||12).then(data=>{if(active)setItems(data);}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[locale,attempt,page,limit,live]);
 const source=live?items.map(item=>({slug:item.slug,image:mediaUrl(item.image),date:item.published_at?.slice(0,10),[locale]:{title:item.title,excerpt:item.excerpt,category:item.category||'Forma Studio'}})):articles.slice(0,limit||articles.length);
 if(error)return <div role="alert"><p>{locale==='tr'?'Yazılar yüklenemedi.':'Unable to load articles.'}</p><button onClick={()=>setAttempt(n=>n+1)}>{locale==='tr'?'Tekrar dene':'Try again'}</button></div>;
 if(loading)return <p role="status">{locale==='tr'?'Yazılar yükleniyor…':'Loading articles…'}</p>;
 return <>{source.length?<div className="article-grid">{source.map(article=><ArticleCard key={article.slug} article={article} locale={locale}/>)}</div>:<p>{locale==='tr'?'Henüz yayınlanan yazı bulunmuyor.':'There are no published articles yet.'}</p>}{!limit&&live&&(page>1||items.length===12)&&<nav className="project-filters" aria-label="Journal pagination"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>{locale==='tr'?'Önceki':'Previous'}</button><span>{page}</span><button disabled={items.length<12} onClick={()=>setPage(p=>p+1)}>{locale==='tr'?'Sonraki':'Next'}</button></nav>}</>;
}
