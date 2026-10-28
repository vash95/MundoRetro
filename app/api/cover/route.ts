import {NextRequest,NextResponse} from 'next/server';
import {lookupImages} from '../../../lib/cover-service';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const title=(request.nextUrl.searchParams.get('title')||'').trim().slice(0,120);
 const kind=request.nextUrl.searchParams.get('kind')==='console'?'console':'game';
 if(title.length<2)return NextResponse.json({url:null,error:'INVALID_TITLE'},{status:400});
 try{
 const result=await lookupImages(title,kind);
 if(result.error==='RATE_LIMITED')return NextResponse.json(result,{status:429,headers:{'Retry-After':String(result.retryAfter||900),'Cache-Control':'public, s-maxage=60'}});
 return NextResponse.json(result,{status:result.error==='API_KEY_MISSING'?503:200,headers:{'Cache-Control':result.url?'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400':'public, max-age=60, s-maxage=300'}});
 }catch{return NextResponse.json({url:null,error:'UPSTREAM_ERROR'},{status:502,headers:{'Cache-Control':'no-store'}})}
}
