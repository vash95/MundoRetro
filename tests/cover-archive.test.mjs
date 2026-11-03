import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {SourceTextModule,SyntheticModule} from 'node:vm';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';

async function scenario({headers=['ID','Juego'],image='',folder=true,driveError,writeError,stored=true,canWrite=true}={}){
 const rows=[headers.slice(),['V1','Mario',image]],calls={lookup:0,writes:[],uploads:0};
 const sheets={spreadsheets:{
  get:async()=>({data:{sheets:[{properties:{sheetId:1,title:'Videojuegos',gridProperties:{columnCount:2}}}]}}),
  batchUpdate:async()=>({}),
  values:{
   get:async()=>({data:{values:rows.map(row=>row.slice())}}),
   update:async request=>{if(writeError)throw writeError;rows[0][2]='Imagen URL';calls.writes.push(request);return {}},
   batchUpdate:async request=>{calls.writes.push(request);return {}}
  }
 }};
 const drive={files:{
  list:async()=>{if(driveError)throw driveError;return {data:{files:stored?[{id:'saved-cover'}]:[]}}},
  get:async()=>({data:{mimeType:'application/vnd.google-apps.folder',capabilities:{canAddChildren:canWrite}}}),
  create:async()=>{calls.uploads++;return {data:{id:'new-cover'}}}
 },permissions:{list:async()=>({data:{permissions:[{type:'anyone',role:'reader'}]}})}};
 const google={sheets:()=>sheets,drive:()=>drive,auth:{JWT:class{},OAuth2:class{setCredentials(){}}}};
 const env={GOOGLE_SERVICE_ACCOUNT_EMAIL:'test',GOOGLE_PRIVATE_KEY:'test',GOOGLE_SHEET_ID:'test',GOOGLE_DRIVE_CLIENT_ID:'test',GOOGLE_DRIVE_CLIENT_SECRET:'test',GOOGLE_DRIVE_REFRESH_TOKEN:'test',...(folder?{GOOGLE_DRIVE_COVERS_FOLDER_ID:'folder'}:{})};
 const source=stripTypeScriptTypes(await readFile(new URL('../lib/cover-archive.ts',import.meta.url),'utf8'));
 const module=new SourceTextModule(source);
 await module.link(async specifier=>{
  const exports=specifier==='googleapis'?{google}:specifier==='next/cache'?{revalidatePath:()=>{}}:specifier==='node:crypto'?{createHash}:{Readable};
  return new SyntheticModule(Object.keys(exports),function(){for(const [name,value] of Object.entries(exports))this.setExport(name,value)});
 });
 const original={};
 for(const [key,value] of Object.entries(env)){original[key]=process.env[key];process.env[key]=value}
 if(!folder){original.GOOGLE_DRIVE_COVERS_FOLDER_ID=process.env.GOOGLE_DRIVE_COVERS_FOLDER_ID;delete process.env.GOOGLE_DRIVE_COVERS_FOLDER_ID}
 try{
  await module.evaluate();
  const result=await module.namespace.archivedCover('Mario','game',async()=>{calls.lookup++;return {url:null,error:'NOT_FOUND'}});
  return {result,calls,rows};
 }finally{for(const [key,value] of Object.entries(original)){if(value===undefined)delete process.env[key];else process.env[key]=value}}
}

test('missing image column is appended and saved Drive cover is reused without provider quota',async()=>{
 const {result,calls,rows}=await scenario();
 assert.equal(rows[0][2],'Imagen URL');assert.equal(calls.writes.length,2);
 assert.match(result.url,/saved-cover/);assert.equal(calls.lookup,0);
});
test('existing inventory image loads even when archive folder is unconfigured',async()=>{
 const {result,calls}=await scenario({headers:['ID','Juego','Imagen URL'],image:'https://example.com/cover.jpg',folder:false});
 assert.equal(result.url,'https://example.com/cover.jpg');assert.equal(calls.lookup,0);
});
test('Sheets permission failure stops before provider lookup',async()=>{
 const {result,calls}=await scenario({writeError:{response:{status:403}}});
 assert.equal(result.error,'ARCHIVE_SHEETS_FORBIDDEN');assert.equal(calls.lookup,0);
});
test('expired Drive authorization returns a fixed code without leaking the OAuth response',async()=>{
 const {result,calls}=await scenario({headers:['ID','Juego','Imagen URL'],driveError:{response:{status:400,data:{error:'invalid_grant',secret:'must not leak'}}}});
 assert.deepEqual(result,{url:null,error:'ARCHIVE_OAUTH_EXPIRED'});assert.equal(calls.lookup,0);
});
test('non-writable Drive destination stops before spending provider quota',async()=>{
 const {result,calls}=await scenario({headers:['ID','Juego','Imagen URL'],stored:false,canWrite:false});
 assert.equal(result.error,'ARCHIVE_DRIVE_FORBIDDEN');assert.equal(calls.lookup,0);
});
