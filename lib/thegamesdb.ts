export type CoverResult={url:string|null;error?:string|null;retryAfter?:number;source?:string|null;id?:number;title?:string;images?:{url:string;type:string;side:string}[]};
type Picture={filename?:string;type?:string;side?:string};
type Entry={id:number;game_title?:string;name?:string};
type Body={code?:number;data?:{games?:Entry[]|Record<string,Entry>;platforms?:Entry[]|Record<string,Entry>;images?:Record<string,Picture[]>;base_url?:{original?:string;large?:string;medium?:string}}};
type Fetcher=(url:string,options?:RequestInit&{next?:{revalidate:number}})=>Promise<Response>;
export function retrySeconds(raw:string|null,now=Date.now()){
 const parsed=raw?(/^\d+$/.test(raw)?Number(raw):(Date.parse(raw)-now)/1000):900;
 return Number.isFinite(parsed)?Math.max(60,Math.min(86400,Math.ceil(parsed))):900;
}
// The queue and circuit breaker are per warm server instance. Fetch's Next Data Cache
// shares successful upstream results; route-level caching also retains negative lookups.
export function createTheGamesDb(fetcher:Fetcher,now=()=>Date.now(),wait=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms))){
 let blockedUntil=0,nextRequest=0,queue:Promise<unknown>=Promise.resolve();
 const pending=new Map<string,Promise<CoverResult>>();
 async function request(path:string,params:URLSearchParams):Promise<Body>{
  if(blockedUntil>now())throw {quota:true,retryAfter:Math.ceil((blockedUntil-now())/1000)};
  if(nextRequest>now())await wait(nextRequest-now());
  nextRequest=now()+650;
  const response=await fetcher('https://api.thegamesdb.net/v1/'+path+'?'+params,{next:{revalidate:604800},signal:AbortSignal.timeout(12000)});
  if(response.status===429){const retryAfter=retrySeconds(response.headers.get('retry-after'),now());blockedUntil=now()+retryAfter*1000;throw {quota:true,retryAfter}}
  if(!response.ok)throw Error('UPSTREAM_HTTP_'+response.status);
  const body=await response.json() as Body;
  if(body.code===429){blockedUntil=now()+900000;throw {quota:true,retryAfter:900}}
  return body;
 }
 async function lookup(title:string,kind:'game'|'console',apiKey:string):Promise<CoverResult>{
  if(!apiKey)return {url:null,error:'API_KEY_MISSING'};
  try{
   const found=await request(kind==='console'?'Platforms/ByPlatformName':'Games/ByGameName',new URLSearchParams({apikey:apiKey,name:title}));
   const records=kind==='console'?found.data?.platforms:found.data?.games;
   const candidates=Array.isArray(records)?records:Object.values(records||{});
   const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
   const match=candidates.find(x=>normalize(x.game_title||x.name||'')===normalize(title))||candidates[0];
   if(!match?.id)return {url:null,error:'NOT_FOUND',images:[]};
   const result=await request(kind==='console'?'Platforms/Images':'Games/Images',new URLSearchParams({apikey:apiKey,[kind==='console'?'platforms_id':'games_id']:String(match.id)}));
   const base=result.data?.base_url?.original||result.data?.base_url?.large||result.data?.base_url?.medium;
   const pictures=result.data?.images?.[String(match.id)]||[];
   const images=pictures.filter(p=>p.filename&&base).map(p=>({url:String(base).replace(/\/$/,'')+'/'+String(p.filename).replace(/^\//,''),type:p.type||'',side:p.side||''})).filter(p=>{try{const url=new URL(p.url);return url.protocol==='https:'&&['cdn.thegamesdb.net','thegamesdb.net'].includes(url.hostname)}catch{return false}}).slice(0,40);
   const chosen=images.find(p=>p.type==='boxart'&&p.side==='front')||images.find(p=>p.type==='boxart')||images[0];
   return {url:chosen?.url||null,source:chosen?'TheGamesDB':null,id:match.id,title:match.game_title||match.name||title,images,error:chosen?null:'NO_IMAGE'};
  }catch(error){const limited=error as {quota?:boolean;retryAfter?:number};return limited.quota?{url:null,error:'RATE_LIMITED',retryAfter:limited.retryAfter||900}:{url:null,error:error instanceof Error&&error.message.startsWith('UPSTREAM_HTTP_')?error.message:'UPSTREAM_ERROR'}}
 }
 return {lookup(title:string,kind:'game'|'console',apiKey:string){const key=JSON.stringify([title.toLowerCase().trim(),kind,apiKey]);const existing=pending.get(key);if(existing)return existing;const job=queue.then(()=>lookup(title,kind,apiKey));queue=job.catch(()=>{});pending.set(key,job);void job.finally(()=>pending.delete(key));return job}};
}
