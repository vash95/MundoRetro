import {getPublicCollection} from '../lib/sheets';
import Catalog from './ui';
export const revalidate=300;
export default async function Page(){
 let data;
 try { data=await getPublicCollection(); } catch { data={configured:false,games:[],consoles:[],accessories:[]}; }
 return <Catalog data={data}/>;
}
