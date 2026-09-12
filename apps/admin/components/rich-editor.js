'use client';
import {useState} from 'react';
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function parse(value){
 if(typeof DOMParser==='undefined'||!value)return [{type:'p',text:''}];
 const doc=new DOMParser().parseFromString(value,'text/html');
 doc.querySelectorAll('br').forEach(element=>element.replaceWith(doc.createTextNode('\n')));
 const blocks=Array.from(doc.body.children).filter(e=>!['SCRIPT','STYLE','IFRAME'].includes(e.tagName)).map(e=>({type:['p','h2','h3','blockquote','ul','ol'].includes(e.tagName.toLowerCase())?e.tagName.toLowerCase():'p',text:['UL','OL'].includes(e.tagName)?Array.from(e.children).map(x=>x.textContent).join('\n'):e.textContent}));
 return blocks.length?blocks:[{type:'p',text:doc.body.textContent||''}];
}
export default function RichEditor({value,onChange}){
 const [blocks,setBlocks]=useState(()=>parse(value));
 function update(next){setBlocks(next);onChange(next.map(b=>['ul','ol'].includes(b.type)?'<'+b.type+'>'+b.text.split('\n').filter(Boolean).map(t=>'<li>'+escape(t)+'</li>').join('')+'</'+b.type+'>':'<'+b.type+'>'+escape(b.text).replaceAll('\n','<br>')+'</'+b.type+'>').join(''));}
 return <div className="rich-editor"><p className="field-help">Build your article with paragraphs, headings, quotes and lists.</p>{blocks.map((block,index)=><div className="article-block" key={index}><div className="block-controls"><select aria-label={'Block '+(index+1)+' type'} value={block.type} onChange={e=>update(blocks.map((b,i)=>i===index?{...b,type:e.target.value}:b))}>{[['p','Paragraph'],['h2','Heading'],['h3','Subheading'],['blockquote','Quote'],['ul','Bullet list'],['ol','Numbered list']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button type="button" disabled={index===0} aria-label={'Move block '+(index+1)+' up'} onClick={()=>{const next=[...blocks];[next[index-1],next[index]]=[next[index],next[index-1]];update(next);}}>↑</button><button type="button" disabled={blocks.length===1} aria-label={'Remove block '+(index+1)} onClick={()=>update(blocks.filter((_,i)=>i!==index))}>×</button></div><textarea aria-label={'Article block '+(index+1)} value={block.text} placeholder={['ul','ol'].includes(block.type)?'One list item per line':'Write here…'} rows={block.type.startsWith('h')?2:5} onChange={e=>update(blocks.map((b,i)=>i===index?{...b,text:e.target.value}:b))}/></div>)}<button type="button" className="secondary" onClick={()=>update([...blocks,{type:'p',text:''}])}>+ Add a block</button></div>;
}
