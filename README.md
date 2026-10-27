# Mundo Retro

Catálogo público de colección gaming con Next.js + Vercel + Google Sheets privado.

## Despliegue en Vercel
1. Importa este repositorio desde https://vercel.com/new.
2. Framework: Next.js. Build: `npm run build`.
3. En Vercel > Project Settings > Environment Variables configura:
   - `GOOGLE_SHEET_ID`: ID de la hoja de inventario
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: email de la cuenta de servicio
   - `GOOGLE_PRIVATE_KEY`: clave privada de la cuenta de servicio, con los saltos de línea codificados como `\\n` o como clave multilínea.
4. En Google Cloud Console habilita Google Sheets API, crea una cuenta de servicio y una clave JSON.
5. Comparte el Google Sheets con el email de esa cuenta de servicio con rol **Lector**.
6. Redeploy en Vercel. Los cambios en Sheets se reflejan tras aproximadamente 5 minutos.

## Seguridad
- Nunca subas el JSON de credenciales ni un archivo .env a GitHub.
- El repositorio puede ser público. La hoja debe seguir privada.
- La lectura se ejecuta en el servidor de Next.js, no en el navegador.
- Solo se exponen los campos explícitamente permitidos en `lib/sheets.ts`; se excluyen precios, notas y fuentes.
- La edición se hace en Google Sheets, solo por las personas con permisos.
- La página no implementa un panel de edición.

## Desarrollo local
`npm install` y `npm run dev`.

## Nota
La primera versión usa iconos genéricos, no portadas de terceros. No se muestran datos ficticios cuando falta configurar Google Sheets.
