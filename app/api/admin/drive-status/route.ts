import {google} from 'googleapis';
import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const admin=process.env.MUNDO_RETRO_ADMIN_TOKEN;
 if(!admin||request.headers.get('authorization')!==`Bearer ${admin}`)return NextResponse.json({ok:false,error:'UNAUTHORIZED'},{status:401});
 const id=process.env.GOOGLE_DRIVE_COVERS_FOLDER_ID;
 const client=process.env.GOOGLE_DRIVE_CLIENT_ID,secret=process.env.GOOGLE_DRIVE_CLIENT_SECRET,refresh=process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
 if(!id||!client||!secret||!refresh)return NextResponse.json({ok:false,error:'MISSING_CONFIGURATION',missing:[!id?'GOOGLE_DRIVE_COVERS_FOLDER_ID':null,!client?'GOOGLE_DRIVE_CLIENT_ID':null,!secret?'GOOGLE_DRIVE_CLIENT_SECRET':null,!refresh?'GOOGLE_DRIVE_REFRESH_TOKEN':null].filter(Boolean)},{status:503});
 try{
  const auth=new google.auth.OAuth2(client,secret);
  auth.setCredentials({refresh_token:refresh});
  const drive=google.drive({version:'v3',auth});
  const {data}=await drive.files.get({fileId:id,fields:'id,name,mimeType,capabilities/canAddChildren'});
  if(data.mimeType!=='application/vnd.google-apps.folder')return NextResponse.json({ok:false,error:'NOT_A_FOLDER'},{status:400});
  return NextResponse.json({ok:true,folder:data.name,canAddChildren:data.capabilities?.canAddChildren===true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  const err=e as {response?:{status?:number}};
  return NextResponse.json({ok:false,error:'DRIVE_ACCESS_FAILED',status:err.response?.status||null},{status:502});
 }
}
