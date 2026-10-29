import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {searchMetadata} from '../../../../lib/metadata-service';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:NextRequest){
 const headers={'Cache-Control':'no-store'},secret=process.env.MUNDO_RETRO_ADMIN_TOKEN,supplied=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 if(!secret)return NextResponse.json({error:'Administración no configurada.'},{status:503,headers});
 const a=Buffer.from(secret),b=Buffer.from(supplied);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'Clave de administración incorrecta.'},{status:401,headers});
 const title=(request.nextUrl.searchParams.get('title')||'').trim(),kind=request.nextUrl.searchParams.get('kind');
 if(title.length<2||title.length>200||!['games','consoles'].includes(kind||''))return NextResponse.json({error:'Introduce un nombre de entre 2 y 200 caracteres.'},{status:400,headers});
 const key=process.env.THEGAMESDB_API_KEY;if(!key)return NextResponse.json({error:'Falta THEGAMESDB_API_KEY en Vercel.'},{status:503,headers});
 try{return NextResponse.json({source:'TheGamesDB',choices:await searchMetadata(title,kind as 'games'|'consoles',key)},{headers})}
 catch(error){const code=error instanceof Error?error.message:'';return NextResponse.json({error:code==='RATE_LIMITED'?'Cuota de TheGamesDB agotada. Vuelve a intentarlo cuando se renueve.':code==='API_ACCESS_DENIED'?'TheGamesDB ha rechazado la clave o la cuota de acceso.':'No se pudieron consultar los datos. Inténtalo más tarde.'},{status:code==='RATE_LIMITED'?429:502,headers})}
}
