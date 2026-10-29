import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual,randomUUID} from 'node:crypto';
import {google} from 'googleapis';
import {revalidatePath} from 'next/cache';
import {fields,sheetTabs,validateItem,type Kind} from '../../../../lib/collection-schema';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 const headers={'Cache-Control':'no-store'};
 const secret=process.env.MUNDO_RETRO_ADMIN_TOKEN;
 if(!secret)return NextResponse.json({error:'La edición no está activada. Configura MUNDO_RETRO_ADMIN_TOKEN en Vercel.'},{status:503,headers});
 const supplied=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 const a=Buffer.from(secret),b=Buffer.from(supplied);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'Clave de administración incorrecta.'},{status:401,headers});
 if(request.headers.get('origin')&&request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Origen no permitido.'},{status:403,headers});
 if(!request.headers.get('content-type')?.includes('application/json'))return NextResponse.json({error:'Formato no válido.'},{status:415,headers});
 let body;try{const raw=await request.text();if(raw.length>40000)throw Error();body=JSON.parse(raw)}catch{return NextResponse.json({error:'La ficha no es válida o es demasiado grande.'},{status:400,headers})}
 if(!['games','consoles','accessories'].includes(body?.kind))return NextResponse.json({error:'Categoría no válida.'},{status:400,headers});
 const kind=body.kind as Kind;let item;try{item=validateItem(kind,body.item)}catch(err){return NextResponse.json({error:err instanceof Error?err.message:'Ficha no válida.'},{status:400,headers})}
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,'\n'),spreadsheetId=process.env.GOOGLE_SHEET_ID;
 if(!email||!key||!spreadsheetId)return NextResponse.json({error:'Falta configurar Google Sheets en Vercel.'},{status:503,headers});
 try{
 const auth=new google.auth.JWT({email,key,scopes:['https://www.googleapis.com/auth/spreadsheets']});
 const api=google.sheets({version:'v4',auth});const tab="'"+sheetTabs[kind]+"'";
 const response=await api.spreadsheets.values.get({spreadsheetId,range:tab});
 const rows=(response.data.values||[]) as string[][],columns=[...(rows[0]||[])];
 if(!columns.includes('ID'))return NextResponse.json({error:'La hoja debe tener una columna ID.'},{status:409,headers});
 const idIndex=columns.indexOf('ID');let rowIndex=item.ID?rows.findIndex((row,n)=>n>0&&String(row[idIndex])===item.ID):-1;
 if(item.ID&&rowIndex<1)return NextResponse.json({error:'La pieza ya no existe en la hoja. Recarga la página.'},{status:409,headers});
 if(!item.ID)item.ID=(kind==='games'?'V':kind==='consoles'?'C':'A')+'-'+randomUUID();
 const missing=fields[kind].filter(name=>!columns.includes(name));columns.push(...missing);
 function letter(n:number){let out='';for(n++;n>0;n=Math.floor((n-1)/26))out=String.fromCharCode(65+(n-1)%26)+out;return out}
 if(missing.length){const metadata=await api.spreadsheets.get({spreadsheetId,fields:'sheets(properties(sheetId,title,gridProperties))'});const properties=metadata.data.sheets?.find(sheet=>sheet.properties?.title===sheetTabs[kind])?.properties;if(!properties?.gridProperties?.columnCount||properties.sheetId==null)throw Error('Hoja no disponible');if(columns.length>properties.gridProperties.columnCount)await api.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:[{appendDimension:{sheetId:properties.sheetId,dimension:'COLUMNS',length:columns.length-properties.gridProperties.columnCount}}]}});}
 if(missing.length)await api.spreadsheets.values.update({spreadsheetId,range:tab+'!A1:'+letter(columns.length-1)+'1',valueInputOption:'RAW',requestBody:{values:[columns]}});
 if(rowIndex>0){const changes=Object.entries(item).filter(([name])=>name!=='ID').map(([name,value])=>({range:tab+'!'+letter(columns.indexOf(name))+(rowIndex+1),values:[[value]]}));await api.spreadsheets.values.batchUpdate({spreadsheetId,requestBody:{valueInputOption:'RAW',data:changes}})}
 else await api.spreadsheets.values.append({spreadsheetId,range:tab+'!A:'+letter(columns.length-1),valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:[columns.map(name=>item[name]||'')]}});
 revalidatePath('/');return NextResponse.json({item},{headers});
 }catch{return NextResponse.json({error:'No se pudo guardar en Google Sheets. Comprueba que la cuenta de servicio tenga permiso de Editor y vuelve a intentarlo.'},{status:502,headers})}
}

export async function DELETE(request:NextRequest){
 const headers={'Cache-Control':'no-store'};
 const secret=process.env.MUNDO_RETRO_ADMIN_TOKEN,supplied=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 if(!secret)return NextResponse.json({error:'Administración no configurada.'},{status:503,headers});
 const a=Buffer.from(secret),b=Buffer.from(supplied);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'Clave de administración incorrecta.'},{status:401,headers});
 if(request.headers.get('origin')&&request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Origen no permitido.'},{status:403,headers});
 let body;try{const raw=await request.text();if(raw.length>1000)throw Error();body=JSON.parse(raw)}catch{return NextResponse.json({error:'Petición no válida.'},{status:400,headers})}
 if(!['games','consoles','accessories'].includes(body?.kind)||typeof body.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(body.id))return NextResponse.json({error:'Ficha no válida.'},{status:400,headers});
 const kind=body.kind as Kind,email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key=process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,'\n'),spreadsheetId=process.env.GOOGLE_SHEET_ID;
 if(!email||!key||!spreadsheetId)return NextResponse.json({error:'Google Sheets no configurado.'},{status:503,headers});
 try{
 const auth=new google.auth.JWT({email,key,scopes:['https://www.googleapis.com/auth/spreadsheets']});
 const api=google.sheets({version:'v4',auth}),tab=sheetTabs[kind];
 const response=await api.spreadsheets.values.get({spreadsheetId,range:"'"+tab+"'"});
 const rows=(response.data.values||[]) as string[][],idIndex=(rows[0]||[]).indexOf('ID');
 if(idIndex<0)throw Error('Missing ID');
 const matches=rows.map((r,i)=>i>0&&String(r[idIndex])===body.id?i:-1).filter(i=>i>0);
 if(matches.length!==1)return NextResponse.json({error:matches.length?'Hay IDs duplicados. Revisa la hoja antes de eliminar.':'La ficha ya no existe. Recarga la página.'},{status:409,headers});
 const metadata=await api.spreadsheets.get({spreadsheetId,fields:'sheets(properties(sheetId,title))'});
 const sheetId=metadata.data.sheets?.find(s=>s.properties?.title===tab)?.properties?.sheetId;
 if(sheetId==null)throw Error('Missing sheet');
 await api.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:[{deleteDimension:{range:{sheetId,dimension:'ROWS',startIndex:matches[0],endIndex:matches[0]+1}}}]}});
 revalidatePath('/');
 return NextResponse.json({deleted:body.id,kind},{headers});
 }catch{return NextResponse.json({error:'No se pudo eliminar en Google Sheets. Comprueba los permisos de Editor.'},{status:502,headers})}
}
