'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {turkish} from './translations';
const words={en:{overview:'Overview',projects:'Projects',journal:'Journal',testimonials:'Testimonials',messages:'Messages',media:'Image library',categories:'Categories',management:'STUDIO MANAGEMENT',signout:'Sign out',website:'View website',retry:'Try again',workspace:'Opening your workspace…',session:'Unable to open your workspace',back:'Back to sign in'},tr:{overview:'Genel bakış',projects:'Projeler',journal:'Yazılar',testimonials:'Müşteri yorumları',messages:'Mesajlar',media:'Görsel arşivi',categories:'Kategoriler',management:'STÜDYO YÖNETİMİ',signout:'Çıkış yap',website:'Siteyi görüntüle',retry:'Tekrar dene',workspace:'Çalışma alanınız açılıyor…',session:'Çalışma alanı açılamadı',back:'Girişe dön'}};
const Context=createContext(null);
export function AdminLanguageProvider({children}){
 const [language,setLanguage]=useState('en');
 useEffect(()=>{try{const value=localStorage.getItem('forma-admin-language');if(value==='tr'||value==='en')setLanguage(value);}catch{}},[]);
 useEffect(()=>{document.documentElement.lang=language;},[language]);
 const change=value=>{if(!['en','tr'].includes(value))return;setLanguage(value);try{localStorage.setItem('forma-admin-language',value);}catch{}};
 const t=(key,values={})=>{const phrase=words[language][key]||(language==='tr'?turkish[key]:undefined)||words.en[key]||key;return typeof phrase==='string'?phrase.replace(/\{(\w+)\}/g,(match,name)=>values[name]??match):phrase;};
 return <Context.Provider value={{language,setLanguage:change,t}}>{children}</Context.Provider>;
}
export function useAdminLanguage(){return useContext(Context)||{language:'en',setLanguage:()=>{},t:k=>words.en[k]||k}}
