import {google} from 'googleapis';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {revalidatePath} from 'next/cache';
import type {CoverResult} from './thegamesdb';

const pending=new Map<string,Promise<CoverResult>>();
const normalize=(s:string)=>s.trim().toLocaleLowerCase('es');
function column(n:number){let s='';for(n++;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s}
async function resolve(title:string,kind:'game'|'console',lookup:()=>Promise<CoverResult>):Promise<CoverResult>{
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,'\n'),spreadsheetId=process.env.GOOGLE_SHEET_ID;
 const folder=process.env.GOOGLE_DRIVE_COVERS_FOLDER_ID;
 const clientId=process.env.GOOGLE_DRIVE_CLIENT_ID,clientSecret=process.env.GOOGLE_DRIVE_CLIENT_SECRET,refreshToken=process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
 if(!email||!key||!spreadsheetId||!folder||!clientId||!clientSecret||!refreshToken)return {url:null,error:'ARCHIVE_NOT_CONFIGURED'};
 const sheets=google.sheets({version:'v4',auth:new google.auth.JWT({email,key,scopes:['https://www.googleapis.com/auth/spreadsheets']})});
 const tab=kind==='console'?"'Consolas'":"'Videojuegos'";
 const read=async()=>{const r=await sheets.spreadsheets.values.get({spreadsheetId,range:tab});return (r.data.values||[]) as string[][]};
 const rows=await read(),headers=rows[0]||[],nameIndex=headers.indexOf(kind==='console'?'Nombre':'Juego'),imageIndex=headers.indexOf('Imagen URL'),idIndex=headers.indexOf('ID');
 if(nameIndex<0||imageIndex<0||idIndex<0)return {url:null,error:'ARCHIVE_COLUMNS_MISSING'};
 const matches=rows.slice(1).filter(r=>r[idIndex]&&normalize(r[nameIndex]||'')===normalize(title));
 if(!matches.length)return {url:null,error:'NOT_IN_COLLECTION'};
 const existing=matches.find(r=>r[imageIndex]?.trim());
 if(existing)return {url:existing[imageIndex].trim(),source:'Inventario'};
 const oauth=new google.auth.OAuth2(clientId,clientSecret);oauth.setCredentials({refresh_token:refreshToken});
 const drive=google.drive({version:'v3',auth:oauth});
 const archiveKey=createHash('sha256').update(kind+':'+normalize(title)).digest('hex');
 // Search Drive before contacting the provider, including after a failed Sheets write.
 const files=await drive.files.list({q:"'"+folder.replace(/['\\]/g,'')+"' in parents and trashed = false and appProperties has { key='retroCover' and value='"+archiveKey+"' }",fields:'files(id)',pageSize:1});
 let fileId=files.data.files?.[0]?.id;
 if(!fileId){
  const result=await lookup();if(!result.url)return result;
  const url=new URL(result.url);
  if(url.protocol!=='https:'||!['cdn.thegamesdb.net','thegamesdb.net'].includes(url.hostname)||url.port||url.username||url.password)throw Error('INVALID_COVER_SOURCE');
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('COVER_DOWNLOAD_FAILED');
  const mime=(response.headers.get('content-type')||'').split(';')[0];
  if(!['image/jpeg','image/png','image/webp'].includes(mime))throw Error('INVALID_COVER_TYPE');
  const limit=8*1024*1024;
  if(Number(response.headers.get('content-length')||0)>limit)throw Error('COVER_TOO_LARGE');
  if(!response.body)throw Error('EMPTY_COVER');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('COVER_TOO_LARGE')}chunks.push(value)}
  if(!size)throw Error('EMPTY_COVER');
  const file=await drive.files.create({requestBody:{name:kind+'-'+archiveKey+'.'+(mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg'),parents:[folder],appProperties:{retroCover:archiveKey}},media:{mimeType:mime,body:Readable.from(Buffer.concat(chunks.map(c=>Buffer.from(c))))},fields:'id'});
  fileId=file.data.id;
 }
 if(!fileId)throw Error('COVER_UPLOAD_FAILED');
 // Only this cover is made readable by link, never the folder or other files.
 const permissions=await drive.permissions.list({fileId,fields:'permissions(type,role)'});
 if(!permissions.data.permissions?.some(p=>p.type==='anyone'&&p.role==='reader'))await drive.permissions.create({fileId,requestBody:{type:'anyone',role:'reader',allowFileDiscovery:false}});
 const url='https://drive.google.com/thumbnail?id='+encodeURIComponent(fileId)+'&sz=w1000';
 const fresh=await read(),cols=fresh[0]||[],id=cols.indexOf('ID'),image=cols.indexOf('Imagen URL');
 if(id<0||image<0)throw Error('ARCHIVE_COLUMNS_MISSING');
 const ids=new Set(matches.map(r=>r[idIndex]));
 const updates=fresh.flatMap((r,i)=>i>0&&ids.has(r[id])&&!r[image]?.trim()?[{range:tab+'!'+column(image)+(i+1),values:[[url]]}]:[]);
 if(updates.length)await sheets.spreadsheets.values.batchUpdate({spreadsheetId,requestBody:{valueInputOption:'RAW',data:updates}});
 revalidatePath('/');
 return {url,source:'Google Drive'};
}
export function archivedCover(title:string,kind:'game'|'console',lookup:()=>Promise<CoverResult>){
 const key=kind+':'+normalize(title),existing=pending.get(key);if(existing)return existing;
 const job=resolve(title,kind,lookup).catch(()=>({url:null,error:'ARCHIVE_FAILED'} as CoverResult));pending.set(key,job);void job.finally(()=>pending.delete(key));return job;
}
