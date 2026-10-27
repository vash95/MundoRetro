import {google} from 'googleapis';
import {NextRequest,NextResponse} from 'next/server';
import {Readable} from 'node:stream';
export const runtime='nodejs';
const MAX_BYTES=8*1024*1024;
const ALLOWED_HOSTS=new Set(['cdn.thegamesdb.net','thegamesdb.net','images.igdb.com']);
function auth(){
 const clientId=process.env.GOOGLE_DRIVE_CLIENT_ID,clientSecret=process.env.GOOGLE_DRIVE_CLIENT_SECRET,refreshToken=process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
 if(!clientId||!clientSecret||!refreshToken)throw Error('DRIVE_OAUTH_NOT_CONFIGURED');
 const oauth=new google.auth.OAuth2(clientId,clientSecret);
 oauth.setCredentials({refresh_token:refreshToken});return oauth;
}
export async function POST(request:NextRequest){
 const expected=process.env.MUNDO_RETRO_ADMIN_TOKEN;
 if(!expected||request.headers.get('authorization')!==`Bearer ${expected}`)return NextResponse.json({error:'UNAUTHORIZED'},{status:401});
 const folderId=process.env.GOOGLE_DRIVE_COVERS_FOLDER_ID;
 if(!folderId)return NextResponse.json({error:'DRIVE_FOLDER_NOT_CONFIGURED'},{status:503});
 try{
  const input=await request.json() as {url?:string;name?:string};
  const source=new URL(input.url||'');
  if(source.protocol!=='https:'||!ALLOWED_HOSTS.has(source.hostname)||source.port||source.username||source.password)return NextResponse.json({error:'SOURCE_NOT_ALLOWED'},{status:400});
  const res=await fetch(source,{redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!res.ok)return NextResponse.json({error:'SOURCE_HTTP_'+res.status},{status:502});
  const mime=(res.headers.get('content-type')||'').split(';')[0];
  if(!['image/jpeg','image/png','image/webp'].includes(mime))return NextResponse.json({error:'INVALID_IMAGE_TYPE'},{status:415});
  const len=Number(res.headers.get('content-length')||0);
  if(len>MAX_BYTES)return NextResponse.json({error:'IMAGE_TOO_LARGE'},{status:413});
  const chunks:Uint8Array[]=[];let size=0;
  for await(const chunk of res.body||[]){size+=chunk.length;if(size>MAX_BYTES)return NextResponse.json({error:'IMAGE_TOO_LARGE'},{status:413});chunks.push(chunk)}
  const buffer=Buffer.concat(chunks.map(x=>Buffer.from(x)));
  const extension=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
  const name=(input.name||'portada').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,70)||'portada';
  const drive=google.drive({version:'v3',auth:auth()});
  const file=await drive.files.create({requestBody:{name:`${name}-${Date.now()}.${extension}`,parents:[folderId]},media:{mimeType:mime,body:Readable.from(buffer)},fields:'id,name,webViewLink'});
  return NextResponse.json({id:file.data.id,name:file.data.name,url:file.data.webViewLink});
 }catch(e){return NextResponse.json({error:e instanceof Error&&e.message==='DRIVE_OAUTH_NOT_CONFIGURED'?'DRIVE_OAUTH_NOT_CONFIGURED':'UPLOAD_FAILED'},{status:503})}
}
