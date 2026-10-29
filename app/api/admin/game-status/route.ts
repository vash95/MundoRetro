import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {google} from 'googleapis';
import {revalidatePath} from 'next/cache';
export const runtime='nodejs';
export async function PATCH(request:NextRequest){
 const headers={'Cache-Control':'no-store'},secret=process.env.MUNDO_RETRO_ADMIN_TOKEN,supplied=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 if(!secret)return NextResponse.json({error:'Administración no configurada.'},{status:503,headers});
 const a=Buffer.from(secret),b=Buffer.from(supplied);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'Clave de administración incorrecta.'},{status:401,headers});
 if(request.headers.get('origin')&&request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Origen no permitido.'},{status:403,headers});
 let body;try{const raw=await request.text();if(raw.length>1000)throw Error();body=JSON.parse(raw)}catch{return NextResponse.json({error:'Petición no válida.'},{status:400,headers})}
 if(typeof body?.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(body.id)||!['Pendiente','Jugado','Completado'].includes(body.status))return NextResponse.json({error:'Estado no válido.'},{status:400,headers});
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,'\n'),spreadsheetId=process.env.GOOGLE_SHEET_ID;
 if(!email||!key||!spreadsheetId)return NextResponse.json({error:'Google Sheets no configurado.'},{status:503,headers});
 try{
 const api=google.sheets({version:'v4',auth:new google.auth.JWT({email,key,scopes:['https://www.googleapis.com/auth/spreadsheets']})});
 const response=await api.spreadsheets.values.get({spreadsheetId,range:"'Videojuegos'"});
 const rows=(response.data.values||[]) as string[][],cols=rows[0]||[],idIndex=cols.indexOf('ID'),stateIndex=cols.indexOf('Estado');
 if(idIndex<0||stateIndex<0)throw Error('Missing columns');
 const matches=rows.map((r,i)=>i>0&&String(r[idIndex])===body.id?i:-1).filter(i=>i>0);
 if(matches.length!==1)return NextResponse.json({error:'No se ha encontrado una ficha única. Recarga la página.'},{status:409,headers});
 let col='',n=stateIndex+1;while(n>0){col=String.fromCharCode(65+(n-1)%26)+col;n=Math.floor((n-1)/26)}
 await api.spreadsheets.values.update({spreadsheetId,range:"'Videojuegos'!"+col+(matches[0]+1),valueInputOption:'RAW',requestBody:{values:[[body.status]]}});
 revalidatePath('/');return NextResponse.json({id:body.id,status:body.status},{headers});
 }catch{return NextResponse.json({error:'No se pudo guardar el estado en Google Sheets.'},{status:502,headers})}
}
