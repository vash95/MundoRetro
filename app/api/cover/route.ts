import { NextRequest, NextResponse } from 'next/server';
export const revalidate = 86400;
const API = 'https://api.thegamesdb.net/v1';
type Picture = { filename?: string; type?: string; side?: string };
export async function GET(request: NextRequest) {
 const title = (request.nextUrl.searchParams.get('title') || '').trim().slice(0, 120);
 const kind = request.nextUrl.searchParams.get('kind') === 'console' ? 'console' : 'game';
 const key = process.env.THEGAMESDB_API_KEY;
 if (!title || title.length < 2) return NextResponse.json({url:null}, {status:400});
 if (!key) return NextResponse.json({url:null, error:'API_KEY_MISSING'});
 try {
  const search = new URLSearchParams({apikey:key, name:title});
  const resource = kind === 'console' ? 'Platforms/ByPlatformName' : 'Games/ByGameName';
  const response = await fetch(`${API}/${resource}?${search}`, {next:{revalidate:86400}});
  if (!response.ok) return NextResponse.json({url:null,error:'SEARCH_HTTP_'+response.status});
  const found = await response.json();
  const records = kind === 'console' ? found.data?.platforms : found.data?.games;
  const candidates = Array.isArray(records) ? records : Object.values(records || {}).flat();
  const normalize = (s:string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const target = normalize(title);
  const match = (candidates as Array<{id:number;game_title?:string;name?:string}>).find(x=>normalize(x.game_title||x.name||'')===target) || candidates[0];
  if (!match?.id) return NextResponse.json({url:null,error:'NOT_FOUND'});
  const imageResource = kind === 'console' ? 'Platforms/Images' : 'Games/Images';
  const imageParams = new URLSearchParams({apikey:key, [kind==='console'?'platforms_id':'games_id']:String(match.id)});
  const imagesResponse = await fetch(`${API}/${imageResource}?${imageParams}`,{next:{revalidate:86400}});
  if (!imagesResponse.ok) return NextResponse.json({url:null,error:'IMAGES_HTTP_'+imagesResponse.status});
  const images = await imagesResponse.json();
  const pictures:Picture[] = images.data?.images?.[String(match.id)] || [];
  const chosen = pictures.find(x=>x.type==='boxart' && x.side==='front') || pictures.find(x=>x.type==='boxart') || pictures[0];
  const base = images.data?.base_url?.original || images.data?.base_url?.large || images.data?.base_url?.medium;
  const url = chosen?.filename && base ? base.replace(/\/$/,'')+'/'+chosen.filename.replace(/^\//,'') : null;
  return NextResponse.json({url,source:url?'TheGamesDB':null,id:match.id,error:url?null:'NO_IMAGE'},{headers:{'Cache-Control':'public, s-maxage=86400, stale-while-revalidate=604800'}});
 } catch {return NextResponse.json({url:null,error:'UPSTREAM_ERROR'});}
}
