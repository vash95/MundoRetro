import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {timingSafeEqual} from 'node:crypto';
function harness(){
 const writes=[],rows=[['ID','Juego','Imagen URL','Estado','Año completado'],['V1','Game','https://drive.example/cover','Pendiente','2010–2019']];
 const api={spreadsheets:{values:{get:async()=>({data:{values:rows}}),update:async args=>writes.push(args)}}};
 const sandbox={Buffer,timingSafeEqual,process:{env:{MUNDO_RETRO_ADMIN_TOKEN:'test-admin',GOOGLE_SERVICE_ACCOUNT_EMAIL:'test',GOOGLE_PRIVATE_KEY:'test',GOOGLE_SHEET_ID:'sheet'}},NextResponse:{json:(body,options={})=>({body,status:options.status||200})},google:{auth:{JWT:class{}},sheets:()=>api},revalidatePath:()=>{}};
 const code=readFileSync(new URL('../app/api/admin/game-status/route.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/export /g,'');
 vm.runInNewContext(stripTypeScriptTypes(code)+';globalThis.patch=PATCH;',sandbox);
 const call=(body,token='test-admin',origin='https://retro.example')=>sandbox.patch({headers:new Headers({authorization:'Bearer '+token,origin}),nextUrl:{origin:'https://retro.example'},text:async()=>JSON.stringify(body)});
 return {call,writes};
}
test('status changes require admin credentials and same origin',async()=>{
 const h=harness();assert.equal((await h.call({id:'V1',status:'Jugado'},'wrong')).status,401);
 assert.equal((await h.call({id:'V1',status:'Jugado'},'test-admin','https://other.example')).status,403);
 assert.equal(h.writes.length,0);
});
test('updates only the Estado cell, preserving cover and approximate play year',async()=>{
 const h=harness();assert.equal((await h.call({id:'V1',status:'Completado'})).status,200);
 assert.equal(h.writes.length,1);assert.equal(h.writes[0].range,"'Videojuegos'!D2");
 assert.equal(JSON.stringify(h.writes[0].requestBody.values),JSON.stringify([['Completado']]));
});
test('rejects unsupported status and missing game without writing',async()=>{
 const h=harness();assert.equal((await h.call({id:'V1',status:'Inventado'})).status,400);
 assert.equal((await h.call({id:'missing',status:'Jugado'})).status,409);assert.equal(h.writes.length,0);
});
