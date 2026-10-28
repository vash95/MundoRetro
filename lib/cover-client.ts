import type {CoverResult} from './thegamesdb';
type StorageLike={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void};
type Options={fetcher:typeof fetch;storage?:()=>StorageLike|null;now?:()=>number;wait?:(ms:number)=>Promise<void>};
export function createCoverLoader({fetcher,storage=()=>null,now=()=>Date.now(),wait=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms))}:Options){
 const memory=new Map<string,{until:number;result:CoverResult}>(),pending=new Map<string,Promise<CoverResult>>();
 let queue:Promise<unknown>=Promise.resolve(),blockedUntil=0,nextRequest=0;
 const pauseKey='mr.cover.pause.v2';
 function read(key:string){try{return storage()?.getItem(key)||null}catch{return null}}
 function write(key:string,value:string){try{storage()?.setItem(key,value)}catch{/* Cache is optional when browser storage is unavailable. */}}
 function cached(key:string){let entry=memory.get(key);if(!entry){try{entry=JSON.parse(read(key)||'null')||undefined}catch{}}if(entry&&entry.until>now())return entry.result;return null}
 async function run(key:string,title:string,kind:string):Promise<CoverResult>{
  const prior=cached(key);if(prior)return prior;
  blockedUntil=Math.max(blockedUntil,Number(read(pauseKey))||0);
  if(blockedUntil>now())return {url:null,error:'RATE_LIMITED',retryAfter:Math.ceil((blockedUntil-now())/1000)};
  if(nextRequest>now())await wait(nextRequest-now());
  // A second tab may have paused the provider while this request was queued.
  blockedUntil=Math.max(blockedUntil,Number(read(pauseKey))||0);
  if(blockedUntil>now())return {url:null,error:'RATE_LIMITED',retryAfter:Math.ceil((blockedUntil-now())/1000)};
  nextRequest=now()+750;
  let result:CoverResult;
  try{
   const response=await fetcher('/api/cover?title='+encodeURIComponent(title)+'&kind='+kind,{signal:AbortSignal.timeout(15000)});
   let body:CoverResult;try{body=await response.json()}catch{body={url:null,error:'NETWORK_ERROR'}}
   if(response.status===429||body.error==='RATE_LIMITED'||body.error?.includes('429')){
    const raw=response.headers.get('Retry-After');const header=raw?(/^\d+$/.test(raw)?Number(raw):(Date.parse(raw)-now())/1000):0;
    const retryAfter=Math.max(60,Math.min(86400,Number(body.retryAfter)||header||900));
    blockedUntil=now()+retryAfter*1000;write(pauseKey,String(blockedUntil));result={url:null,error:'RATE_LIMITED',retryAfter};
   }else result=response.ok?body:{url:null,error:body.error||'NETWORK_ERROR'};
   if(result.url&&!/^https:\/\//i.test(result.url))result={url:null,error:'NO_IMAGE'};
  }catch{result={url:null,error:'NETWORK_ERROR'}}
  const ttl=result.url?604800000:result.error==='NOT_FOUND'||result.error==='NO_IMAGE'?86400000:result.error==='RATE_LIMITED'?(result.retryAfter||900)*1000:60000;
  const entry={until:now()+ttl,result};memory.set(key,entry);write(key,JSON.stringify(entry));return result;
 }
 return {load(title:string,kind:'game'|'console'){
  const key='mr.cover.v2.'+encodeURIComponent(kind+':'+title.trim().toLowerCase());
  const prior=cached(key);if(prior)return Promise.resolve(prior);
  const existing=pending.get(key);if(existing)return existing;
  const promise=queue.then(()=>run(key,title,kind));queue=promise.catch(()=>{});pending.set(key,promise);void promise.finally(()=>pending.delete(key));return promise;
 }};
}
export const coverLoader=createCoverLoader({fetcher:(...args)=>fetch(...args),storage:()=>typeof window!=='undefined'?window.localStorage:null});
