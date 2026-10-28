export type Item = Record<string,string>;
export const fields = {
 games:['ID','Juego','Plataforma','Estado','Formato','Género','Lanzamiento (origen)','Imagen URL','Imágenes URL','Tengo','Cantidad','Año completado','Fecha completado','Fecha compra','Descripción','Curiosidades'],
 consoles:['ID','Nombre','Tengo','Fabricante','Año lanzamiento (origen)','Cantidad','Con caja','Tipo','Imagen URL','Imágenes URL','Variantes','Fecha compra','Descripción','Curiosidades'],
 accessories:['ID','Nombre','Tengo','Fabricante','Cantidad','Con caja','Tipo','Imagen URL','Imágenes URL','Variantes','Fecha compra','Descripción','Curiosidades']
} as const;
export type Kind=keyof typeof fields;
export const sheetTabs:Record<Kind,string>={games:'Videojuegos',consoles:'Consolas',accessories:'Accesorios'};
export function imageUrls(item:Item){return [...new Set([item['Imagen URL'],...(item['Imágenes URL']||'').split(/[\n;,]+/)].map(x=>x?.trim()).filter((x):x is string=>!!x&&/^https:\/\//i.test(x)))]}
export function validateItem(kind:Kind,input:unknown):Item{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Ficha no válida.');
 const source=input as Record<string,unknown>,result:Item={};
 for(const key of fields[kind]){const value=source[key]??'';if(typeof value!=='string'||value.length>(key==='Imágenes URL'?16000:4000))throw Error('Revisa el campo '+key);result[key]=value.trim();}
 const name=kind==='games'?'Juego':'Nombre';if(!result[name]||result[name].length>200)throw Error('Escribe un nombre de hasta 200 caracteres.');
 if(result.ID&&!/^[A-Za-z0-9_-]{1,80}$/.test(result.ID))throw Error('ID no válido.');
 if(result.Cantidad&&!/^\d{1,6}$/.test(result.Cantidad))throw Error('La cantidad debe ser un número entero positivo o cero.');
 if(result.Tengo&&!['Sí','Si','No'].includes(result.Tengo))throw Error('Posesión no válida.');
 const images=[result['Imagen URL'],...(result['Imágenes URL']||'').split(/[\n;,]+/)].map(x=>x.trim()).filter(Boolean);
 if(images.length>8)throw Error('Puedes guardar hasta ocho fotografías.');
 for(const url of images){let parsed:URL;try{parsed=new URL(url)}catch{throw Error('Usa enlaces HTTPS para las imágenes.')}if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('Usa enlaces HTTPS para las imágenes.');}
 return result;
}
