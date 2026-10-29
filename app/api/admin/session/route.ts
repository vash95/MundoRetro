import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 const headers={'Cache-Control':'no-store'};
 if(request.headers.get('origin')&&request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Origen no permitido.'},{status:403,headers});
 const secret=process.env.MUNDO_RETRO_ADMIN_TOKEN;
 const supplied=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 if(!secret)return NextResponse.json({error:'Administración no configurada.'},{status:503,headers});
 const a=Buffer.from(secret),b=Buffer.from(supplied);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'Clave de administración incorrecta.'},{status:401,headers});
 return NextResponse.json({ok:true},{headers});
}
