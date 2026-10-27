import { google } from 'googleapis';
export type RecordRow = Record<string,string>;
const ALLOWED: Record<string,string[]> = {
 Videojuegos:['ID','Juego','Plataforma','Estado','Formato','Género','Lanzamiento (origen)','Imagen URL','Tengo','Año completado','Fecha completado','Fecha compra'],
 Consolas:['ID','Nombre','Tengo','Fabricante','Año lanzamiento (origen)','Cantidad','Con caja','Tipo','Imagen URL','Imágenes URL','Variantes','Fecha compra'],
 Wishlist:['ID origen','Categoría','Elemento'],
 Progreso:['ID juego','Estado (vinculado)','Fecha actualización (manual)','Fecha completado','Año completado'],
 Accesorios:['ID','Nombre','Tengo','Fabricante','Cantidad','Con caja','Tipo','Imagen URL','Imágenes URL','Variantes']
};
export async function getPublicCollection(){
 const email=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
 const key=process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g,'\n');
 const sheet=process.env.GOOGLE_SHEET_ID;
 if(!email||!key||!sheet) return {configured:false,games:[],consoles:[],accessories:[],wishlist:[],progress:[]};
 const auth=new google.auth.JWT({email,key,scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
 const api=google.sheets({version:'v4',auth});
 const read=async(tab:string):Promise<RecordRow[]>=>{
  const response=await api.spreadsheets.values.get({spreadsheetId:sheet,range:`'${tab}'!A1:P2000`});
  const [headers,...rows]=(response.data.values||[]) as string[][];
  if(!headers) return [];
  return rows.filter(row=>row.some(Boolean)).map(row=>Object.fromEntries(ALLOWED[tab].map(col=>[col,String(row[headers.indexOf(col)]||'')]))).filter(item=>item.ID||item['ID origen']||item['ID juego']);
 };
 const [games,consoles,accessories,wishlist,progress]=await Promise.all([read('Videojuegos'),read('Consolas'),read('Accesorios'),read('Wishlist'),read('Progreso')]);
 return {configured:true,games,consoles,accessories,wishlist,progress};
}
