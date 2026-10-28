'use client';
import {useEffect,useMemo,useState,useRef} from 'react';
import {coverLoader} from '../lib/cover-client';
import CollectionEditor from './collection-editor';
import {imageUrls,type Kind} from '../lib/collection-schema';
type Item=Record<string,string>;
type Data={configured:boolean;games:Item[];consoles:Item[];accessories:Item[];wishlist:Item[];progress:Item[]};
const tabs=[['games','Juegos'],['pokemon','Pokémon'],['playing','Jugando ahora'],['consoles','Consolas'],['accessories','Accesorios'],['wishlist','Wishlist'],['dashboard','Estadísticas']] as const;
export default function Catalog({data:initialData}:{data:Data}){
 const [data,setData]=useState(initialData);
 const [editor,setEditor]=useState<{item:Item|null;kind:Kind}|null>(null),[adminToken,setAdminToken]=useState(''),[notice,setNotice]=useState('');
 const kindOf=(x:Item):Kind=>data.consoles.some(i=>i.ID===x.ID)?'consoles':data.accessories.some(i=>i.ID===x.ID)?'accessories':'games';
 const openEditor=(x:Item|null)=>{setEditor({item:x,kind:x?kindOf(x):tab==='consoles'?'consoles':tab==='accessories'?'accessories':'games'});setSelected(null)};
 useEffect(()=>{function onKey(e:KeyboardEvent){if(e.key==='Escape'&&!document.querySelector('dialog[open]'))setSelected(null)}window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey)},[]);

 const [tab,setTab]=useState<'games'|'pokemon'|'playing'|'consoles'|'accessories'|'wishlist'|'dashboard'>('games');
 const [query,setQuery]=useState('');
 const [platform,setPlatform]=useState('Todas');
 const [status,setStatus]=useState('Todos');
 const [ownership,setOwnership]=useState('Todos');
 const [era,setEra]=useState('Todas');
 const [selected,setSelected]=useState<Item|null>(null);
 const items=tab==='dashboard'?data.games:tab==='pokemon'?data.games.filter(x=>/pok[eé]mon|pokemon|pokopia/i.test(x.Juego||'')):tab==='playing'?data.games.filter(x=>/en curso|jugando/i.test(x.Estado||'')):data[tab];
 const platforms=useMemo(()=>['Todas',...new Set(items.map(x=>x.Plataforma||x.Fabricante||x.Categoría).filter(Boolean))].sort((a,b)=>a==='Todas'?-1:b==='Todas'?1:a.localeCompare(b)),[items]);
 const isRetro=(x:Item)=>/game ?boy|gamecube|nintendo 64|nes|snes|famicom|mega ?drive|dreamcast|saturn|master system|psone|playstation 1|playstation 2|psp|psvita|wii|nintendo ds|3ds|mvs/i.test(x.Plataforma||'');
 const filtered=items.filter(x=>(Object.values(x).join(' ').toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))&&(platform==='Todas'||(x.Plataforma||x.Fabricante||x.Categoría)===platform)&&(status==='Todos'||x.Estado===status)&&(ownership==='Todos'||(ownership==='Tengo'?(tab!=='wishlist'&&x.Tengo!=='No'):(tab==='wishlist'||x.Tengo==='No')))&&(era==='Todas'||(era==='Retro'?isRetro(x):!isRetro(x))));
 const pokemonCount=data.games.filter(x=>/pok[eé]mon|pokemon|pokopia/i.test(x.Juego||'')).length;
 const playingCount=data.games.filter(x=>/en curso|jugando/i.test(x.Estado||'')).length;
 const completed=data.games.filter(x=>/completado|terminado|finalizado|pasado/i.test(x.Estado||''));
 const pending=data.games.filter(x=>/pendiente|sin jugar/i.test(x.Estado||''));
 const years=Object.entries(data.progress.reduce((a:Record<string,number>,x)=>{const raw=x['Año completado']||x['Fecha completado']||'';const year=(raw.match(/20[0-9]{2}/)||[])[0];if(year)a[year]=(a[year]||0)+1;return a;},{})).sort(([a],[b])=>a.localeCompare(b));
 const currentYear=new Date().getFullYear();
 const completionYear=(x:Item)=>{const linked=data.progress.find(p=>p['ID juego']===x.ID);const raw=linked?.['Año completado']||linked?.['Fecha completado']||x['Año completado']||x['Fecha completado']||'';return (raw.match(/20[0-9]{2}/)||[])[0]||''};
 const completedThisYear=completed.filter(x=>completionYear(x)===String(currentYear));
 const acquired=(list:Item[])=>list.filter(x=>x.Tengo==='Sí'||x.Tengo==='Si').filter(x=>x['Fecha compra']).sort((a,b)=>dateValue(b['Fecha compra'])-dateValue(a['Fecha compra'])).slice(0,12);
 const recentGames=acquired(data.games),recentConsoles=acquired(data.consoles);
 const title=(x:Item)=>x.Juego||x.Nombre||x.Elemento;
 const sub=(x:Item)=>x.Plataforma||x.Fabricante||x.Categoría||x.Tipo||'Colección';
 return <main className="wrap redesign">
  <header className="topbar"><div className="brand"><span className="brand-icon">👾</span><div><strong>MUNDO RETRO</strong><small>MI COLECCIÓN DE VIDEOJUEGOS</small></div></div><div className="top-actions"><span className="live">● CATÁLOGO PÚBLICO</span><button className="edit-link" onClick={()=>openEditor(null)}>＋ Añadir pieza</button></div></header>
  <section className="hero new-hero"><span className="eyebrow">✦ EL ARCHIVO DEFINITIVO</span><h1>Mi universo <em>gaming.</em></h1><p>Un viaje por los videojuegos, consolas y recuerdos de toda una vida.</p><div className="metric-grid"><div className="metric blue"><span>🎮</span><strong>{data.games.length}</strong><small>Videojuegos</small></div><div className="metric green"><span>✓</span><strong>{data.consoles.filter(x=>x.Tengo==='Sí').length}</strong><small>Consolas en colección</small></div><div className="metric amber"><span>◉</span><strong>{playingCount}</strong><small>Jugando ahora</small></div><div className="metric pink"><span>♥</span><strong>{pokemonCount}</strong><small>Juegos Pokémon</small></div><div className="metric purple"><span>🛒</span><strong>{data.wishlist.length}</strong><small>Wishlist</small></div></div></section>
  {!data.configured&&<div className="notice">Vista preparada. Para mostrar el inventario, configura las variables de Google Sheets en Vercel.</div>}
  <nav className="tabs retro-tabs">{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>{setTab(id);setPlatform('Todas');setStatus('Todos');setOwnership('Todos');setEra('Todas')}}>{label}</button>)}</nav>
  {tab==='dashboard'&&<section className="analytics"><h2>Mi progreso gaming</h2><div className="stats"><div><strong>{completed.length}</strong><span>Completados</span></div><div><strong>{pending.length}</strong><span>Pendientes</span></div><div><strong>{data.wishlist.length}</strong><span>Futuras compras</span></div></div>
   <div className="dashboard-columns"><AcquisitionCarousel title="🎮 Últimos juegos adquiridos" items={recentGames} kind="games" onSelect={setSelected}/><AcquisitionCarousel title="🕹️ Últimas consolas adquiridas" items={recentConsoles} kind="consoles" onSelect={setSelected}/></div>
   <div className="dashboard-columns"><section className="dashboard-panel"><h3>📚 Pendientes de jugar <small>({pending.length})</small></h3><div className="dashboard-list">{pending.length?pending.map((x,i)=><button key={(x.ID||x.Juego)+i} className="dashboard-entry" onClick={()=>setSelected(x)}><span>{x.Juego}</span><small>{x.Plataforma}</small></button>):<p className="muted">No hay juegos pendientes registrados.</p>}</div></section>
   <section className="dashboard-panel"><h3>🏆 Completados en {currentYear} <small>({completedThisYear.length})</small></h3><div className="dashboard-list">{completedThisYear.length?completedThisYear.map((x,i)=><button key={(x.ID||x.Juego)+i} className="dashboard-entry" onClick={()=>setSelected(x)}><span>{x.Juego}</span><small>{x.Plataforma}</small></button>):<p className="muted">No hay juegos completados con fecha de {currentYear}.</p>}</div></section></div>
   <h3>Juegos completados por año</h3>{years.length?years.map(([year,count])=><div className="chartline" key={year}><span>{year}</span><div><i style={{width:Math.max(4,100*count/Math.max(...years.map(([,n])=>n)))+'%'}}/></div><b>{count}</b></div>):<p className="muted">Para ver la evolución anual, registra el año de finalización en la hoja Progreso.</p>}<p className="muted">Las adquisiciones se ordenan por Fecha compra. Los datos se editan en Google Sheets.</p></section>}
 {tab!=='dashboard'&&<section className="toolbar"><input aria-label="Buscar en colección" value={query} onChange={e=>setQuery(e.target.value)} placeholder="⌕  Buscar en la colección..."/><select aria-label="Plataforma o fabricante" value={platform} onChange={e=>setPlatform(e.target.value)}>{platforms.map(p=><option key={p}>{p}</option>)}</select><select aria-label="Estado de juego" value={status} onChange={e=>setStatus(e.target.value)}>{['Todos',...new Set(items.map(x=>x.Estado).filter(Boolean))].map(p=><option key={p}>{p}</option>)}</select><select aria-label="Posesión" value={ownership} onChange={e=>setOwnership(e.target.value)}>{['Todos','Tengo','No tengo'].map(p=><option key={p}>{p}</option>)}</select><select aria-label="Época" value={era} onChange={e=>setEra(e.target.value)}>{['Todas','Retro','Moderno'].map(p=><option key={p}>{p}</option>)}</select></section>}
  {tab!=='dashboard'&&<><div className="result">{filtered.length} elementos encontrados</div>
  <section className="catalog">{filtered.map((x,i)=><article key={(x.ID||x["ID origen"]||"")+i} className="item" onClick={()=>setSelected(x)}><Gallery item={x} kind={x.ID?kindOf(x):'wishlist'}/><div className="details"><div className="platform">{sub(x)}</div><button className="card-title-button" onClick={e=>{e.stopPropagation();setSelected(x)}}><h2>{title(x)}</h2></button><div className="chips">{x.Cantidad&&<span>× {x.Cantidad} unidades</span>}{(x['Año lanzamiento (origen)']||x['Lanzamiento (origen)'])&&<span>{x['Año lanzamiento (origen)']||x['Lanzamiento (origen)']}</span>}{x.Estado&&<span>{x.Estado}</span>}{tab==='wishlist'&&<span>No tengo</span>}{x.Formato&&<span>{x.Formato}</span>}{x.Tengo&&<span>{x.Tengo==='Sí'?'En colección':'No disponible'}</span>}{x['Con caja']==='Sí'&&<span>Con caja</span>}</div></div>{tab!=='wishlist'&&<button className="card-edit" onClick={e=>{e.stopPropagation();openEditor(x)}}>✎ Editar ficha</button>}</article>)}</section>
  {filtered.length===0&&<div className="empty">No hay elementos que coincidan con los filtros.</div>}
  </>}
  {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><section role="dialog" aria-modal="true" aria-label="Ficha de colección" className="detail-modal" onClick={e=>e.stopPropagation()}><button autoFocus aria-label="Cerrar ficha" className="modal-close" onClick={()=>setSelected(null)}>✕</button><Gallery item={selected} kind={selected.ID?kindOf(selected):'wishlist'}/><div className="modal-body"><span className="eyebrow">{sub(selected)}</span><h2>{title(selected)}</h2><p>{selected.Estado||"Artículo de mi colección"}</p><div className="chips">{selected.Formato&&<span>{selected.Formato}</span>}{selected.Tengo&&<span>{selected.Tengo==="Sí"?"En colección":"No tengo"}</span>}{selected.Variantes&&<span>{selected.Variantes}</span>}</div><dl className="piece-facts"><div><dt>Lanzamiento</dt><dd>{selected['Año lanzamiento (origen)']||selected['Lanzamiento (origen)']||'Sin indicar'}</dd></div><div><dt>Cantidad</dt><dd>{selected.Cantidad||'Sin indicar'}</dd></div></dl>{selected.Descripción&&<p className="piece-description">{selected.Descripción}</p>}{selected.Curiosidades&&<aside className="curiosity"><span className="eyebrow">¿SABÍAS QUE…?</span><p>{selected.Curiosidades}</p></aside>}{selected.ID&&<button className="edit-link" onClick={()=>openEditor(selected)}>✎ Editar ficha</button>}</div></section></div>}
  {notice&&<div className="save-toast" role="status" onClick={()=>setNotice('')}>{notice} ✓</div>}
  {editor&&<CollectionEditor key={editor.item?.ID||'new'} item={editor.item} kind={editor.kind} token={adminToken} onToken={setAdminToken} onClose={()=>setEditor(null)} onSave={(item,kind)=>{setData(prev=>({...prev,[kind]:prev[kind].some(x=>x.ID===item.ID)?prev[kind].map(x=>x.ID===item.ID?item:x):[...prev[kind],item]}));setEditor(null);setSelected(item);setNotice('Ficha guardada en Google Sheets')}}/>}
  <footer>MUNDO RETRO · HECHO PARA COLECCIONAR, NO PARA OLVIDAR</footer>
 </main>;
}

function Gallery({item,kind}:{item:Item;kind:string}){
 const urls=imageUrls(item);
 const [idx,setIdx]=useState(0),[broken,setBroken]=useState<string[]>([]),[online,setOnline]=useState(''),[error,setError]=useState('');
 const name=item.Juego||item.Nombre||'';
 const element=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false);
 useEffect(()=>{setVisible(false);if(!element.current)return;if(typeof IntersectionObserver==='undefined'){setVisible(true);return}const observer=new IntersectionObserver(entries=>{setVisible(entries.some(entry=>entry.isIntersecting))},{rootMargin:'120px'});observer.observe(element.current);return ()=>observer.disconnect()},[name,kind]);
 useEffect(()=>{setIdx(0);setBroken([]);setOnline('');setError('')},[name,kind,item['Imagen URL'],item['Imágenes URL']]);
 useEffect(()=>{if(!visible||!name||urls.length||kind==='wishlist'||kind==='accessories')return;let active=true;const controller=new AbortController();coverLoader.load(name,kind==='consoles'?'console':'game',controller.signal).then(result=>{if(active){setOnline(result.url||'');setError(result.error||'')}});return ()=>{active=false;controller.abort()}},[visible,name,kind,item['Imagen URL'],item['Imágenes URL']]);
 const pictures=[...new Set([...urls,...(online?[online]:[])])].filter(u=>!broken.includes(u));const picture=pictures[idx%Math.max(1,pictures.length)];
 return <div ref={element} className="art">{picture?<img loading="lazy" src={picture} alt={name||item.Elemento||'Artículo'} onError={()=>{setBroken(b=>[...b,picture]);setIdx(0)}}/>:<div className="cover-empty"><span aria-hidden="true">{kind==='consoles'?'🕹️':kind==='accessories'?'🎧':'🎮'}</span>{error==='RATE_LIMITED'&&<p>Portadas en pausa<br/><small>Límite temporal de TheGamesDB</small></p>}</div>}{pictures.length>1&&<div className="gallery-controls"><button aria-label="Anterior imagen" onClick={e=>{e.stopPropagation();setIdx(i=>(i+pictures.length-1)%pictures.length)}}>‹</button><span>{idx%pictures.length+1}/{pictures.length}</span><button aria-label="Siguiente imagen" onClick={e=>{e.stopPropagation();setIdx(i=>(i+1)%pictures.length)}}>›</button></div>}<small>{item.ID||item['ID origen']}</small></div>
}

function dateValue(raw:string){const s=raw.trim();const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime();const n=Date.parse(s);return Number.isNaN(n)?0:n}
function AcquisitionCarousel({title,items,kind,onSelect}:{title:string;items:Item[];kind:string;onSelect:(x:Item)=>void}){
 const [index,setIndex]=useState(0);
 useEffect(()=>{if(items.length<2)return;const timer=setInterval(()=>setIndex(i=>(i+1)%items.length),6000);return ()=>clearInterval(timer)},[items.length]);
 const item=items[index%Math.max(1,items.length)];
 return <section className="dashboard-panel"><h3>{title}</h3>{item?<><div className="featured" onClick={()=>onSelect(item)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')onSelect(item)}}><Gallery item={item} kind={kind}/><div><strong>{item.Juego||item.Nombre}</strong><p>{item.Plataforma||item.Fabricante}</p><small>Adquirido: {item['Fecha compra']}</small></div></div><div className="carousel-navigation"><button onClick={()=>setIndex(i=>(i+items.length-1)%items.length)} aria-label="Anterior">‹</button><span>{index+1} / {items.length}</span><button onClick={()=>setIndex(i=>(i+1)%items.length)} aria-label="Siguiente">›</button></div></>:<p className="muted">Añade Fecha compra y marca Tengo = Sí en Google Sheets para mostrar tus adquisiciones.</p>}</section>
}

