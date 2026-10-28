import {unstable_cache} from 'next/cache';
import {createHash} from 'node:crypto';
import {createTheGamesDb,type CoverResult} from './thegamesdb';
const service=createTheGamesDb(fetch);
export async function lookupImages(title:string,kind:'game'|'console'):Promise<CoverResult>{
 const key=process.env.THEGAMESDB_API_KEY;
 if(!key)return {url:null,error:'API_KEY_MISSING'};
 // The key itself never becomes a cache argument or response; rotate its fingerprint.
 const fingerprint=createHash('sha256').update(key).digest('hex').slice(0,16);
 return unstable_cache((name:string,type:'game'|'console')=>service.lookup(name,type,key),['tgdb-images-v2',fingerprint],{revalidate:900})(title.trim().toLowerCase(),kind);
}
