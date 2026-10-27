import { NextRequest, NextResponse } from 'next/server';
export const revalidate=86400;
const endpoint='https://en.wikipedia.org/w/api.php';
export async function GET(request:NextRequest){
 const title=(request.nextUrl.searchParams.get('title')||'').trim().slice(0,100);
 const kind=request.nextUrl.searchParams.get('kind')==='console'?'console':'video game';
 if(title.length<3)return NextResponse.json({url:null},{status:400});
 try{
  const params=new URLSearchParams({action:'query',generator:'search',gsrsearch:'intitle:"'+title.replace(/["<>]/g,'')+'" '+kind,gsrlimit:'4',prop:'pageimages|info',pithumbsize:'440',format:'json',origin:'*'});
  const res=await fetch(endpoint+'?'+params.toString(),{next:{revalidate:86400},headers:{'User-Agent':'MundoRetro/1.0 (public game catalog)'}});
  if(!res.ok)throw Error('Wikipedia unavailable');
  const body=await res.json();
  const pages=Object.values(body.query?.pages||{}) as Array<{title?:string;thumbnail?:{source?:string}}>;
  const normalized=(x:string)=>x.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const match=pages.filter(p=>p.thumbnail?.source).sort((a,b)=>Number(normalized(b.title||'').includes(normalized(title)))-Number(normalized(a.title||'').includes(normalized(title))))[0];
  return NextResponse.json({url:match?.thumbnail?.source||null,source:match?'Wikipedia / Wikimedia Commons':null},{headers:{'Cache-Control':'public, s-maxage=86400, stale-while-revalidate=604800'}});
 }catch{return NextResponse.json({url:null},{status:200});}
}
