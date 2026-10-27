'use client';
import {useState} from 'react';
type Check={ok?:boolean;folder?:string;canAddChildren?:boolean;error?:string;missing?:string[];status?:number};
export default function GoogleDriveSetup(){
 const [token,setToken]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const [check,setCheck]=useState<Check|null>(null);const [results,setResults]=useState<Array<{url:string;type:string;side:string}>>([]);const [kind,setKind]=useState('game');const [url,setUrl]=useState('');const [name,setName]=useState('');const [saved,setSaved]=useState('');
 async function connect(){
  setError('');setBusy(true);
  try{
   const res=await fetch('/api/auth/google/start',{headers:{Authorization:'Bearer '+token},credentials:'same-origin',cache:'no-store'});
   const data=await res.json();
   if(!res.ok||!data.authorization_url){setError(data.error||'No se pudo iniciar la autorización');return}
   window.location.assign(data.authorization_url);
  }catch{setError('Error de conexión.')}finally{setBusy(false)}
 }
 async function verify(){
  setError('');setBusy(true);setCheck(null);
  try{const r=await fetch('/api/admin/drive-status',{headers:{Authorization:'Bearer '+token},cache:'no-store'});const d=await r.json();setCheck(d)}
  catch{setError('No se pudo verificar Drive.')}finally{setBusy(false)}
 }
 async function searchCovers(){
  setError('');setResults([]);setBusy(true);
  try{const r=await fetch('/api/admin/search-covers?title='+encodeURIComponent(name)+'&kind='+kind,{headers:{Authorization:'Bearer '+token},cache:'no-store'});const d=await r.json();if(!r.ok||d.error){setError(d.error||'Error de búsqueda');return}setResults(d.images||[]);if(!d.images?.length)setError('No hay imágenes disponibles para este título')}
  catch{setError('Error al consultar TheGamesDB')}finally{setBusy(false)}
 }
 async function save(){
  setError('');setSaved('');setBusy(true);
  try{
   const r=await fetch('/api/admin/save-cover',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({url,name})});
   const d=await r.json();if(!r.ok){setError(d.error||'No se pudo guardar la portada');return}
   setSaved(d.name+' (ID: '+d.id+')');
  }catch{setError('Error al descargar o guardar la imagen.')}finally{setBusy(false)}
 }
 const input={display:'block',width:'100%',padding:12,margin:'10px 0 18px',border:'1px solid #888',borderRadius:8,boxSizing:'border-box' as const};
 return <main style={{maxWidth:540,margin:'3rem auto',padding:'1.5rem',fontFamily:'system-ui'}}>
  <h1>Administrar Google Drive</h1>
  <p>Conecta tu cuenta y comprueba que Mundo Retro puede guardar portadas. El token de administrador no se almacena en el navegador.</p>
  <label htmlFor="token">Token de administrador</label>
  <input id="token" type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} style={input}/>
  <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
   <button disabled={!token||busy} onClick={connect} style={{padding:12}}>Conectar Google Drive</button>
   <button disabled={!token||busy} onClick={verify} style={{padding:12}}>Comprobar conexión</button>
  </div>
  {check&&<p role="status">{check.ok?(check.canAddChildren?'✅ Conectado y con permisos para subir a ':'⚠️ Conectado, pero sin permiso de subida en ')+(check.folder||'Drive'):'❌ '+(check.error||'Error')+(check.missing?.length?' — faltan: '+check.missing.join(', '):'')+(check.status?' (HTTP '+check.status+')':'')}</p>}
  <hr style={{margin:'28px 0'}}/>
  <h2>Guardar una portada elegida</h2>
  <p>Pega una URL de imagen autorizada de TheGamesDB o IGDB. Puedes elegir otra imagen cambiando la URL. Esta prueba guarda el archivo en Drive; todavía no actualiza Google Sheets.</p>
  <label htmlFor="name">Nombre del juego o consola</label>
  <input id="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Super Mario 64" style={input}/>
  <label htmlFor="kind">Tipo de elemento</label>
  <select id="kind" value={kind} onChange={e=>setKind(e.target.value)} style={input}><option value="game">Videojuego</option><option value="console">Consola</option></select>
  <button disabled={!token||name.length<2||busy} onClick={searchCovers} style={{padding:12,marginBottom:16}}>Buscar portadas en TheGamesDB</button>
  {results.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12,margin:'14px 0'}}>{results.map((p,i)=><button key={p.url+i} onClick={()=>setUrl(p.url)} style={{border:url===p.url?'3px solid #16a34a':'1px solid #888',borderRadius:8,padding:8,background:'transparent',color:'inherit'}}><img src={p.url} alt={'Portada '+(i+1)} loading="lazy" style={{width:'100%',height:150,objectFit:'contain'}}/><span style={{display:'block',fontSize:12}}>{p.type||'Imagen'} {p.side||''}</span><span style={{display:'block',fontSize:12}}>{url===p.url?'✓ Seleccionada':'Seleccionar'}</span></button>)}</div>}
  <label htmlFor="url">URL HTTPS de la imagen seleccionada</label>
  <input id="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://cdn.thegamesdb.net/..." style={input}/>
  {url.startsWith('https://')&&<img src={url} alt="Vista previa de la portada elegida" style={{maxWidth:180,maxHeight:240,objectFit:'contain',display:'block',marginBottom:16}}/>}
  <button disabled={!token||!url||busy} onClick={save} style={{padding:12}}>Guardar esta imagen en Drive</button>
  {saved&&<p role="status">✅ Guardada: {saved}</p>}
  {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
  <p style={{marginTop:30,fontSize:13}}>Las imágenes guardadas no se publican automáticamente. Para verlas en el catálogo falta enlazarlas a la fila de Google Sheets y servirlas mediante una ruta controlada.</p>
 </main>;
}
