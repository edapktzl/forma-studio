'use client';
import {useEffect,useRef,useState} from 'react';
import {api,mediaUrl} from '../lib/api-client';
export default function MediaPicker({onSelect,onClose}){
 const dialog=useRef(null),[items,setItems]=useState([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=()=>{setLoading(true);api('/admin/media').then(setItems).catch(e=>setError(e.message)).finally(()=>setLoading(false));};
 useEffect(()=>{dialog.current.showModal();load();},[]);
 async function upload(e){const file=e.target.files[0];if(!file)return;setBusy(true);setError('');const form=new FormData();form.append('file',file);try{const item=await api('/admin/media',{method:'POST',body:form});setItems(list=>[item,...list]);}catch(e){setError(e.message);}finally{setBusy(false);e.target.value='';}}
 return <dialog ref={dialog} className="media-dialog" onCancel={onClose} aria-labelledby="media-title"><header><div><p className="eyebrow">IMAGE LIBRARY</p><h2 id="media-title">Choose a photograph</h2></div><button type="button" onClick={onClose} aria-label="Close image library">×</button></header><label className="upload-button">{busy?'Uploading…':'+ Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={upload}/></label><p className="field-help">JPEG, PNG or WebP · up to 10 MB · up to 20 megapixels</p>{error&&<p className="notice error" role="alert">{error}</p>}{loading?<p role="status">Loading images…</p>:items.length?<div className="media-grid">{items.map(item=><button type="button" className="media-tile" key={item.id} onClick={()=>onSelect(item)}><img src={mediaUrl(item.public_url)} alt={item.alt_text||item.file_name}/><span>{item.file_name}</span></button>)}</div>:<div className="empty-state"><h3>Your image library starts here.</h3><p>Upload a photograph to use it in your content.</p></div>}</dialog>;
}
