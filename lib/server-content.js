import {notFound} from 'next/navigation';
import {mediaUrl} from './api-client';
const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL;
export const isLiveContent = Boolean(PUBLIC_API);
export const publicMedia = mediaUrl;
export async function getLiveDetail(resource,locale,slug){
 if(!['en','tr'].includes(locale))notFound();
 const base=process.env.API_INTERNAL_URL||PUBLIC_API;
 if(!base)return null;
 try {
  const response=await fetch(base.replace(/\/$/,'')+'/'+resource+'/'+encodeURIComponent(slug)+'?language='+locale,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(response.status===404)return null;
  if(!response.ok)return null;
  return response.json();
 } catch {
  // The public site keeps its static content available while the API is offline.
  return null;
 }
}
