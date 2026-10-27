'use client';
import {useMemo,useState} from 'react';
type Item=Record<string,string>;
type Data={configured:boolean;games:Item[];consoles:Item[];accessories:Item[]};
const tabs=[['games','Videojuegos'],['consoles','Consolas'],['accessories','Accesorios']] as const;
export default function Catalog({data}:{data:Data}){
 const [tab,setTab]=useState<'games'|'consoles'|'accessories'>('games');
 const [query,setQuery]=useState('');
 const [platform,setPlatform]=useState('Todas');
 const [status,setStatus]=useState('Todos');
 const items=data[tab];
 const platforms=useMemo(()=>['Todas',...new Set(items.map(x=>x.Plataforma||x.Fabricante).filter(Boolean))].sort((a,b)=>a==='Todas'?-1:b==='Todas'?1:a.localeCompare(b)),[items]);
 const filtered=items.filter(x=>(Object.values(x).join(' ').toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))&&(platform==='Todas'||(x.Plataforma||x.Fabricante)===platform)&&(status==='Todos'||x.Estado===status));
 const title=(x:Item)=>x.Juego||x.Nombre;
 const sub=(x:Item)=>x.Plataforma||x.Fabricante||x.Tipo||'Colección';
 return <main className="wrap">
  <header><div className="brand"><span className="brand-icon">✦</span><div><strong>MUNDO RETRO</strong><small>EL ARCHIVO DE MI COLECCIÓN</small></div></div><span className="live">● CATÁLOGO PÚBLICO</span></header>
  <section className="hero"><span className="eyebrow">BIENVENIDO AL ARCHIVO</span><h1>Una vida entre <em>píxeles.</em></h1><p>Consolas legendarias, joyas olvidadas y nuevas aventuras. Explora mi colección de videojuegos.</p><div className="stats"><div><strong>{data.games.length}</strong><span>Videojuegos</span></div><div><strong>{data.consoles.filter(x=>x.Tengo==='Sí').length}</strong><span>Consolas</span></div><div><strong>{data.accessories.filter(x=>x.Tengo==='Sí').length}</strong><span>Accesorios</span></div></div></section>
  {!data.configured&&<div className="notice">Vista preparada. Para mostrar el inventario, configura las variables de Google Sheets en Vercel.</div>}
  <nav className="tabs">{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>{setTab(id);setPlatform('Todas');setStatus('Todos')}}>{label}</button>)}</nav>
  <section className="toolbar"><input aria-label="Buscar en colección" value={query} onChange={e=>setQuery(e.target.value)} placeholder="⌕  Buscar en la colección..."/><select aria-label="Plataforma o fabricante" value={platform} onChange={e=>setPlatform(e.target.value)}>{platforms.map(p=><option key={p}>{p}</option>)}</select>{tab==='games'&&<select aria-label="Estado de juego" value={status} onChange={e=>setStatus(e.target.value)}>{['Todos',...new Set(items.map(x=>x.Estado).filter(Boolean))].map(p=><option key={p}>{p}</option>)}</select>}</section>
  <div className="result">{filtered.length} elementos encontrados</div>
  <section className="catalog">{filtered.map((x,i)=><article key={x.ID||i} className="item"><div className="art"><span>{tab==='games'?'🎮':tab==='consoles'?'🕹️':'🎧'}</span><small>{x.ID}</small></div><div className="details"><div className="platform">{sub(x)}</div><h2>{title(x)}</h2><div className="chips">{x.Estado&&<span>{x.Estado}</span>}{x.Formato&&<span>{x.Formato}</span>}{x.Tengo&&<span>{x.Tengo==='Sí'?'En colección':'No disponible'}</span>}{x['Con caja']==='Sí'&&<span>Con caja</span>}</div></div></article>)}</section>
  {filtered.length===0&&<div className="empty">No hay elementos que coincidan con los filtros.</div>}
  <footer>MUNDO RETRO · HECHO PARA COLECCIONAR, NO PARA OLVIDAR</footer>
 </main>;
}
