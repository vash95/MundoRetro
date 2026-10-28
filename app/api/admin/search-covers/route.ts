import {NextRequest,NextResponse} from 'next/server';
import {lookupImages} from '../../../../lib/cover-service';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const secret=process.env.MUNDO_RETRO_ADMIN_TOKEN;
 if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'UNAUTHORIZED'},{status:401});
 const title=(req.nextUrl.searchParams.get('title')||'').trim().slice(0,120);
 const kind=req.nextUrl.searchParams.get('kind')==='console'?'console':'game';
 if(title.length<2)return NextResponse.json({error:'INVALID_TITLE'},{status:400});
 try{
 const result=await lookupImages(title,kind);
 const status=result.error==='RATE_LIMITED'?429:result.error==='API_KEY_MISSING'?503:200;
 return NextResponse.json(result,{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':String(result.retryAfter||900)}:{})}});
 }catch{return NextResponse.json({error:'UPSTREAM_ERROR'},{status:502})}
}
