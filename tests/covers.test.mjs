import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoverLoader} from '../lib/cover-client.ts';
import {createTheGamesDb,retrySeconds} from '../lib/thegamesdb.ts';
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers});
function storage(){const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)}}
function clock(){let value=1000000;return {now:()=>value,advance:ms=>value+=ms,wait:async ms=>{value+=ms}}}
test('identical simultaneous requests share a single HTTP call',async()=>{
 const c=clock();let calls=0;const loader=createCoverLoader({fetcher:async()=>{calls++;return json({url:'https://cdn.thegamesdb.net/a.jpg'})},...c});
 const [a,b]=await Promise.all([loader.load('Mario','game'),loader.load('mario','game')]);assert.equal(calls,1);assert.equal(a.url,b.url);
});
test('successful covers survive a new page session without querying again',async()=>{
 const c=clock(),store=storage();let calls=0;const options={fetcher:async()=>{calls++;return json({url:'https://cdn.thegamesdb.net/a.jpg'})},storage:()=>store,...c};
 await createCoverLoader(options).load('Mario','game');await createCoverLoader(options).load('Mario','game');assert.equal(calls,1);
 c.advance(604800001);await createCoverLoader(options).load('Mario','game');assert.equal(calls,2);
});
test('429 pauses all queued titles and persists the pause for other tabs',async()=>{
 const c=clock(),store=storage();let calls=0;const options={fetcher:async()=>{calls++;return json({url:null,error:'RATE_LIMITED' },429,{'Retry-After':'120'})},storage:()=>store,...c};
 const loader=createCoverLoader(options);const results=await Promise.all(['A','B','C'].map(title=>loader.load(title,'game')));assert.equal(calls,1);assert.ok(results.every(x=>x.error==='RATE_LIMITED'));
 await createCoverLoader(options).load('Other','game');assert.equal(calls,1);
 c.advance(121000);await createCoverLoader(options).load('Other','game');assert.equal(calls,2);
});
test('legacy JSON error with HTTP 200 also pauses queued requests',async()=>{
 let calls=0;const c=clock(),loader=createCoverLoader({fetcher:async()=>{calls++;return json({url:null,error:'SEARCH_HTTP_429'})},...c});await Promise.all([loader.load('A','game'),loader.load('B','game')]);assert.equal(calls,1);
});
test('cache hits remain available while provider is paused',async()=>{
 const c=clock();let calls=0;const loader=createCoverLoader({fetcher:async()=>++calls===1?json({url:'https://cdn.thegamesdb.net/a.jpg'}):json({error:'RATE_LIMITED'},429),...c});await loader.load('A','game');await loader.load('B','game');assert.equal((await loader.load('A','game')).url,'https://cdn.thegamesdb.net/a.jpg');assert.equal(calls,2);
});
test('requests for different titles run sequentially with spacing',async()=>{
 const c=clock(),times=[];let active=0,max=0;const loader=createCoverLoader({fetcher:async()=>{active++;max=Math.max(max,active);times.push(c.now());await Promise.resolve();active--;return json({url:null,error:'NOT_FOUND'})},...c});await Promise.all(['A','B','C'].map(title=>loader.load(title,'game')));assert.equal(max,1);assert.ok(times[1]-times[0]>=750);assert.ok(times[2]-times[1]>=750);
});
test('server upstream 429 trips a circuit across different titles',async()=>{
 const c=clock();let calls=0;const api=createTheGamesDb(async()=>{calls++;return json({},429,{'Retry-After':'180'})},c.now,c.wait);
 const results=await Promise.all([api.lookup('A','game','fake-key'),api.lookup('B','game','fake-key')]);assert.equal(calls,1);assert.ok(results.every(x=>x.error==='RATE_LIMITED'));assert.equal(results[0].retryAfter,180);
});
test('server deduplicates lookup and returns verified HTTPS cover images',async()=>{
 const c=clock();let calls=0;const api=createTheGamesDb(async()=>{calls++;return calls===1?json({data:{games:[{id:1,game_title:'Mario'}]}}):json({data:{base_url:{original:'https://cdn.thegamesdb.net/'},images:{'1':[{filename:'front.jpg',type:'boxart',side:'front'}]}}})},c.now,c.wait);
 const results=await Promise.all([api.lookup('Mario','game','fake-key'),api.lookup('mario','game','fake-key')]);assert.equal(calls,2);assert.equal(results[0].url,'https://cdn.thegamesdb.net/front.jpg');assert.equal(results[1].url,results[0].url);
});
test('Retry-After supports delta seconds, HTTP dates and invalid values',()=>{
 const now=Date.parse('2026-10-28T08:00:00Z');assert.equal(retrySeconds('120',now),120);assert.equal(retrySeconds('Wed, 28 Oct 2026 08:03:00 GMT',now),180);assert.equal(retrySeconds('invalid',now),900);
});

test('offscreen queued requests are cancelled before consuming quota',async()=>{
 const c=clock();let calls=0;const loader=createCoverLoader({fetcher:async()=>{calls++;return json({url:null,error:'NOT_FOUND'})},...c});const controller=new AbortController();const promise=loader.load('Offscreen','game',controller.signal);controller.abort();assert.equal((await promise).error,'CANCELLED');assert.equal(calls,0);
});
test('cancelling one view keeps a shared request required by another view',async()=>{
 const c=clock();let calls=0;const loader=createCoverLoader({fetcher:async()=>{calls++;return json({url:'https://cdn.thegamesdb.net/a.jpg'})},...c});const first=new AbortController(),second=new AbortController();const a=loader.load('Same','game',first.signal),b=loader.load('Same','game',second.signal);first.abort();await Promise.all([a,b]);assert.equal(calls,1);
});
