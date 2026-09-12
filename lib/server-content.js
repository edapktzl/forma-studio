const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL;
export const isLiveContent = Boolean(PUBLIC_API);
export function publicMedia(value){return value?new URL(value,PUBLIC_API+'/').href:'';}
export async function getLiveDetail(resource,locale,slug){
 const base=process.env.API_INTERNAL_URL||PUBLIC_API;
 const response=await fetch(base+'/'+resource+'/'+encodeURIComponent(slug)+'?language='+locale,{cache:'no-store'});
 if(response.status===404)return null;
 if(!response.ok)throw new Error('Content is temporarily unavailable.');
 return response.json();
}
