'use client';
import {useState} from 'react';
export default function GoogleDriveSetup(){
 const [token,setToken]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function connect(){
  setError('');setBusy(true);
  try{
   const res=await fetch('/api/auth/google/start',{headers:{Authorization:'Bearer '+token},credentials:'same-origin',cache:'no-store'});
   const data=await res.json();
   if(!res.ok||!data.authorization_url){setError(data.error||'No se pudo iniciar la autorización');return}
   window.location.assign(data.authorization_url);
  }catch{setError('Error de conexión. Revisa que el despliegue esté activo.')}finally{setBusy(false)}
 }
 return <main style={{maxWidth:540,margin:'4rem auto',padding:'1.5rem',fontFamily:'system-ui'}}>
  <h1>Conectar Google Drive</h1>
  <p>Esta página es para el propietario de Mundo Retro. Introduce el token de administrador configurado en Vercel. No se guarda en el navegador.</p>
  <label htmlFor="token">Token de administrador</label>
  <input id="token" type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} style={{display:'block',width:'100%',padding:12,margin:'12px 0',border:'1px solid #888',borderRadius:8,boxSizing:'border-box'}}/>
  <button disabled={!token||busy} onClick={connect} style={{padding:'12px 18px',borderRadius:8,cursor:'pointer'}}>{busy?'Conectando…':'Conectar Google Drive'}</button>
  {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
  <p style={{marginTop:30,fontSize:14}}>Google solicitará permiso para administrar archivos en Drive. Tras aceptar, guarda el refresh_token mostrado en la variable GOOGLE_DRIVE_REFRESH_TOKEN de Vercel y realiza un nuevo despliegue. No compartas el token ni una captura.</p>
 </main>
}
