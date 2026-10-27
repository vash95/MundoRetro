import {google} from 'googleapis';
import {NextRequest,NextResponse} from 'next/server';
import {randomBytes,createHash} from 'node:crypto';
export const runtime='nodejs';
const redirect='https://mundo-retro.vercel.app/api/auth/google/callback';
function oauth(){const id=process.env.GOOGLE_DRIVE_CLIENT_ID,secret=process.env.GOOGLE_DRIVE_CLIENT_SECRET;if(!id||!secret)throw Error('OAUTH_NOT_CONFIGURED');return new google.auth.OAuth2(id,secret,redirect)}
function digest(s:string){return createHash('sha256').update(s).digest('hex')}
export async function GET(req:NextRequest){
 const admin=process.env.MUNDO_RETRO_ADMIN_TOKEN;
 if(!admin)return NextResponse.json({error:'ADMIN_TOKEN_NOT_CONFIGURED'},{status:503});
 // Admin secret is provided only to this one-time setup route; never put it in URL.
 if(req.headers.get('authorization')!==`Bearer ${admin}`)return NextResponse.json({error:'UNAUTHORIZED'},{status:401});
 try{
  const state=randomBytes(32).toString('hex');
  const url=oauth().generateAuthUrl({access_type:'offline',prompt:'consent',scope:['https://www.googleapis.com/auth/drive'],state});
  const res=NextResponse.json({authorization_url:url});
  res.cookies.set('mundo_retro_oauth_state',digest(state),{httpOnly:true,secure:true,sameSite:'lax',path:'/api/auth/google',maxAge:600});
  return res;
 }catch{return NextResponse.json({error:'OAUTH_NOT_CONFIGURED'},{status:503})}
}
