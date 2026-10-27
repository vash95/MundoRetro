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

## Archivo de portadas en Google Drive (en preparación)

Carpeta creada: https://drive.google.com/drive/folders/1qiU0RG77ef6pSzgEoptruk61zw6q4Mj6

El endpoint privado `POST /api/admin/save-cover` permite archivar una imagen autorizada desde una URL HTTPS permitida. No se activa hasta configurar estas variables en Vercel:

- `GOOGLE_DRIVE_COVERS_FOLDER_ID` = `1qiU0RG77ef6pSzgEoptruk61zw6q4Mj6`
- `GOOGLE_DRIVE_CLIENT_ID` = cliente OAuth de Google Cloud con Google Drive API habilitada
- `GOOGLE_DRIVE_CLIENT_SECRET` = secreto del cliente OAuth
- `GOOGLE_DRIVE_REFRESH_TOKEN` = token de actualización obtenido con consentimiento y scope `https://www.googleapis.com/auth/drive.file` (o scope de Drive apropiado para carpeta preexistente)
- `MUNDO_RETRO_ADMIN_TOKEN` = secreto aleatorio largo para proteger las operaciones de escritura

La cuenta OAuth debe tener acceso de escritura a la carpeta. Para carpetas existentes, `drive.file` por sí solo no garantiza acceso; puede requerir selección/autorización de la carpeta mediante Google Picker o permisos más amplios con consentimiento explícito. No se debe exponer ninguna de estas variables al navegador.

Ejemplo de petición autenticada (desde servidor o herramienta privada; no desde una página pública):

```http
POST /api/admin/save-cover
Authorization: Bearer <admin-token>
Content-Type: application/json

{"url":"https://cdn.thegamesdb.net/.../cover.jpg","name":"Super Mario 64"}
```

El endpoint devuelve el ID del archivo de Drive. **Pendiente**: completar la autorización OAuth, vincular los IDs a las filas de Google Sheets, servir imágenes mediante un proxy autenticado y construir la interfaz de importación. No hacer pública la carpeta por defecto. El fallo HTTP 403 de TheGamesDB impide obtener sus imágenes hasta resolver el acceso y comprobar los derechos de almacenamiento.
