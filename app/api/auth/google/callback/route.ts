import {google} from 'googleapis';
import {NextRequest,NextResponse} from 'next/server';
import {createHash,timingSafeEqual} from 'node:crypto';
export const runtime='nodejs';
const redirect='https://mundo-retro.vercel.app/api/auth/google/callback';
function digest(s:string){return createHash('sha256').update(s).digest('hex')}
export async function GET(req:NextRequest){
 const state=req.nextUrl.searchParams.get('state')||'';
 const cookie=req.cookies.get('mundo_retro_oauth_state')?.value||'';
 const expected=digest(state);
 if(!state||!cookie||cookie.length!==expected.length||!timingSafeEqual(Buffer.from(cookie),Buffer.from(expected)))return NextResponse.json({error:'INVALID_STATE'},{status:403});
 const code=req.nextUrl.searchParams.get('code');
 if(!code)return NextResponse.json({error:'OAUTH_CANCELLED'},{status:400});
 try{
  const oauth=new google.auth.OAuth2(process.env.GOOGLE_DRIVE_CLIENT_ID,process.env.GOOGLE_DRIVE_CLIENT_SECRET,redirect);
  const {tokens}=await oauth.getToken(code);
  if(!tokens.refresh_token)return NextResponse.json({error:'NO_REFRESH_TOKEN',hint:'Revoke existing access and retry with consent'},{status:400});
  // The token is shown only in the direct OAuth callback response, not stored in GitHub.
  const response=NextResponse.json({success:true,refresh_token:tokens.refresh_token,next:'Save GOOGLE_DRIVE_REFRESH_TOKEN in Vercel Production environment variables, then redeploy.'});
  response.headers.set('Cache-Control','no-store');
  response.cookies.delete('mundo_retro_oauth_state');
  return response;
 }catch{return NextResponse.json({error:'OAUTH_EXCHANGE_FAILED'},{status:502})}
}
