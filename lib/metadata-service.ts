export type MetadataChoice={id:number;title:string;platform:string;year:string;fields:Record<string,string>};
type Entry={id:number;game_title?:string;name?:string;release_date?:string;platform?:number;overview?:string;genres?:number[];developer?:string};
type Body={code?:number;data?:{games?:Entry[]|Record<string,Entry>;platforms?:Entry[]|Record<string,Entry>;genres?:Record<string,{name?:string}>}};
type Fetcher=(url:string,options?:RequestInit&{next?:{revalidate:number}})=>Promise<Response>;
export function metadataChoices(entries:Entry[],kind:'games'|'consoles',genres:Record<string,{name?:string}>={},platforms:Entry[]=[]):MetadataChoice[]{
 return entries.slice(0,20).map(entry=>{
  const year=/^(19|20)\d{2}/.exec(entry.release_date||'')?.[0]||'';
  const genre=(entry.genres||[]).map(id=>genres[String(id)]?.name).filter(Boolean).join(', ');
  const platform=platforms.find(p=>p.id===entry.platform)?.name||'';
  const fields:Record<string,string>=kind==='games'?{'Lanzamiento (origen)':year,'Género':genre,'Descripción':(entry.overview||'').slice(0,4000),'Plataforma':platform}:{'Fabricante':entry.developer||'','Descripción':(entry.overview||'').slice(0,4000)};
  return {id:entry.id,title:entry.game_title||entry.name||'',platform,year,fields:Object.fromEntries(Object.entries(fields).filter(([,v])=>v))};
 }).filter(x=>x.title);
}
export async function searchMetadata(title:string,kind:'games'|'consoles',key:string,fetcher:Fetcher=fetch):Promise<MetadataChoice[]>{
 async function request(path:string,params:Record<string,string>,ttl:number):Promise<Body>{
  const response=await fetcher('https://api.thegamesdb.net/v1/'+path+'?'+new URLSearchParams({apikey:key,...params}),{next:{revalidate:ttl},signal:AbortSignal.timeout(12000)});
  if(response.status===429)throw Error('RATE_LIMITED');
  if(!response.ok)throw Error(response.status===403?'API_ACCESS_DENIED':'UPSTREAM_ERROR');
  const body=await response.json() as Body;if(body.code===429)throw Error('RATE_LIMITED');if(body.code&&body.code>=400)throw Error('UPSTREAM_ERROR');return body;
 }
 const found=await request(kind==='games'?'Games/ByGameName':'Platforms/ByPlatformName',{name:title,fields:kind==='games'?'genres,overview,platform':'overview'},604800);
 const records=kind==='games'?found.data?.games:found.data?.platforms,entries=Array.isArray(records)?records:Object.values(records||{});
 if(!entries.length)return [];
 if(kind==='consoles')return metadataChoices(entries,kind);
 const [genres,platforms]=await Promise.all([entries.some(e=>e.genres?.length)?request('Genres',{},2592000):Promise.resolve({} as Body),request('Platforms',{},2592000)]);
 const raw=platforms.data?.platforms;
 return metadataChoices(entries,kind,genres.data?.genres||{},Array.isArray(raw)?raw:Object.values(raw||{}));
}
