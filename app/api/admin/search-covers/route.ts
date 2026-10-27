import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
const API='https://api.thegamesdb.net/v1';
type Picture={filename?:string;type?:string;side?:string};
export async function GET(req:NextRequest){
 const secret=process.env.MUNDO_RETRO_ADMIN_TOKEN;
 if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'UNAUTHORIZED'},{status:401});
 const key=process.env.THEGAMESDB_API_KEY;
 if(!key)return NextResponse.json({error:'API_KEY_MISSING'},{status:503});
 const name=(req.nextUrl.searchParams.get('title')||'').trim().slice(0,100);
 const kind=req.nextUrl.searchParams.get('kind')==='console'?'console':'game';
 if(name.length<2)return NextResponse.json({error:'INVALID_TITLE'},{status:400});
 try{
  const search=new URLSearchParams({apikey:key,name});
  const resource=kind==='console'?'Platforms/ByPlatformName':'Games/ByGameName';
  const found=await fetch(`${API}/${resource}?${search}`,{cache:'no-store'});
  if(!found.ok)return NextResponse.json({error:'SEARCH_HTTP_'+found.status},{status:502});
  const json=await found.json();
  const records=kind==='console'?json.data?.platforms:json.data?.games;
  const candidates=(Array.isArray(records)?records:Object.values(records||{}).flat()) as Array<{id:number;game_title?:string;name?:string}>;
  const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const selected=candidates.find(c=>normalize(c.game_title||c.name||'')===normalize(name))||candidates[0];
  if(!selected?.id)return NextResponse.json({error:'NOT_FOUND',images:[]});
  const params=new URLSearchParams({apikey:key,[kind==='console'?'platforms_id':'games_id']:String(selected.id)});
  const response=await fetch(`${API}/${kind==='console'?'Platforms/Images':'Games/Images'}?${params}`,{cache:'no-store'});
  if(!response.ok)return NextResponse.json({error:'IMAGES_HTTP_'+response.status},{status:502});
  const data=await response.json();
  const base=data.data?.base_url?.original||data.data?.base_url?.large||data.data?.base_url?.medium;
  const images:Picture[]=data.data?.images?.[String(selected.id)]||[];
  const output=images.filter(p=>p.filename&&base).map(p=>({url:String(base).replace(/\/$/,'')+'/'+String(p.filename).replace(/^\//,''),type:p.type||'',side:p.side||''})).filter(p=>{try{const u=new URL(p.url);return u.protocol==='https:'&&['cdn.thegamesdb.net','thegamesdb.net'].includes(u.hostname)}catch{return false}});
  return NextResponse.json({title:selected.game_title||selected.name||name,id:selected.id,images:output.slice(0,40)},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'UPSTREAM_ERROR'},{status:502})}
}
