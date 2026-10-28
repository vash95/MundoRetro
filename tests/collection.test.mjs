import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {timingSafeEqual,randomUUID} from 'node:crypto';
import {fields,sheetTabs,validateItem,imageUrls} from '../lib/collection-schema.ts';

test('images split on actual newlines, retain letters n, and deduplicate',()=>{
 assert.deepEqual(imageUrls({'Imagen URL':'https://example.com/nintendo.png','Imágenes URL':'https://example.com/nintendo.png\nhttps://example.com/sony.png;https://example.com/sega.png'}),['https://example.com/nintendo.png','https://example.com/sony.png','https://example.com/sega.png']);
});
test('console and game validation includes quantity, year and descriptions',()=>{
 assert.equal(validateItem('games',{Juego:'Juego',Cantidad:'2','Lanzamiento (origen)':'2001',Curiosidades:'Una curiosidad'}).Cantidad,'2');
 assert.equal(validateItem('consoles',{Nombre:'Consola',Cantidad:'0',Descripción:'Descripción'}).Descripción,'Descripción');
 for(const Cantidad of ['-1','1.5','NaN'])assert.throws(()=>validateItem('consoles',{Nombre:'Consola',Cantidad}));
 assert.throws(()=>validateItem('games',{Juego:''}));
});
test('invalid or excessive images rejected; private fields never exposed',()=>{
 for(const url of ['javascript:alert(1)','http://example.com/a.png','https://user:password@example.com/a.png'])assert.throws(()=>validateItem('games',{Juego:'Juego','Imagen URL':url}));
 assert.throws(()=>validateItem('games',{Juego:'Juego','Imágenes URL':Array.from({length:9},(_,i)=>`https://example.com/${i}.png`).join('\n')}));
 assert.equal(validateItem('games',{Juego:'Juego',Notas:'privado','Compra EUR registrada':'50'}).Notas,undefined);
});
function harness({secret='test-admin',rows=[['ID','Nombre','Precio privado'],['C001','Anterior','999']],fail=false}={}){
 const calls=[];const api={spreadsheets:{get:async()=>({data:{sheets:[{properties:{title:'Consolas',sheetId:1,gridProperties:{columnCount:26}}},{properties:{title:'Videojuegos',sheetId:2,gridProperties:{columnCount:26}}}]}}),batchUpdate:async v=>calls.push(['grid',v]),values:{get:async()=>({data:{values:rows}}),update:async v=>{if(fail)throw Error('permission');calls.push(['headers',v])},batchUpdate:async v=>calls.push(['cells',v]),append:async v=>calls.push(['append',v])}}};
 const sandbox={Buffer,process:{env:{MUNDO_RETRO_ADMIN_TOKEN:secret,GOOGLE_SERVICE_ACCOUNT_EMAIL:'test@example.com',GOOGLE_PRIVATE_KEY:'fake-test-key',GOOGLE_SHEET_ID:'fake-sheet'}},NextResponse:{json:(body,options={})=>({body,status:options.status||200})},timingSafeEqual,randomUUID,google:{auth:{JWT:class{}},sheets:()=>api},revalidatePath:path=>calls.push(['revalidate',path]),fields,sheetTabs,validateItem};
 const source=stripTypeScriptTypes(readFileSync(new URL('../app/api/admin/items/route.ts',import.meta.url),'utf8')).replace(/^import .*;\r?$/gm,'').replace('export const runtime','const runtime').replace('export async function POST','async function POST');vm.runInNewContext(source+'\nglobalThis.post=POST;',sandbox);
 return {calls,post:({token='test-admin',origin='https://retro.test',payload={kind:'consoles',item:{ID:'C001',Nombre:'Nueva',Cantidad:'2'}},raw}={})=>sandbox.post({headers:new Headers({authorization:'Bearer '+token,origin,'content-type':'application/json'}),nextUrl:new URL('https://retro.test/api/admin/items'),text:async()=>raw??JSON.stringify(payload)})};
}
test('writes require configured token and reject invalid credentials and origin',async()=>{
 let h=harness();assert.equal((await h.post({token:'bad'})).status,401);assert.equal((await h.post({origin:'https://other.test'})).status,403);assert.equal(h.calls.length,0);
 h=harness({secret:''});assert.equal((await h.post()).status,503);
});
test('editing an existing console updates allowed cells and preserves private columns',async()=>{
 const h=harness(),response=await h.post();assert.equal(response.status,200);const update=h.calls.find(([op])=>op==='cells')[1];assert.ok(update.requestBody.data.some(x=>x.range==="'Consolas'!B2"));assert.ok(update.requestBody.data.every(x=>x.range!=="'Consolas'!C2"));assert.equal(h.calls.filter(([op])=>op==='append').length,0);assert.ok(h.calls.some(([op])=>op==='revalidate'));
});
test('new game appends without overwriting existing rows',async()=>{
 const h=harness({rows:[['ID','Juego'],['V001','Anterior']]});const result=await h.post({payload:{kind:'games',item:{Juego:'Nuevo',Cantidad:'1'}}});assert.equal(result.status,200);assert.match(result.body.item.ID,/^V-/);assert.equal(h.calls.filter(([op])=>op==='append').length,1);assert.equal(h.calls.filter(([op])=>op==='cells').length,0);
});
test('malformed, missing or invalid items never write',async()=>{
 const h=harness();assert.equal((await h.post({payload:{kind:'consoles',item:{ID:'C999',Nombre:'Missing'}}})).status,409);assert.equal((await h.post({raw:'{'})).status,400);assert.equal((await h.post({payload:{kind:'consoles',item:{Nombre:'Test',Cantidad:'1.5'}}})).status,400);assert.equal(h.calls.length,0);
});
test('Sheets permission errors return a useful failure without reporting success',async()=>{
 const h=harness({fail:true});assert.equal((await h.post()).status,502);assert.equal(h.calls.filter(([op])=>op==='revalidate').length,0);
});
