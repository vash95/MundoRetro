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
5. Comparte el Google Sheets con el email de esa cuenta de servicio con rol **Lector** para consultar o **Editor** para guardar desde la web.
6. Redeploy en Vercel. Los cambios en Sheets se reflejan tras aproximadamente 5 minutos.

## Seguridad
- Nunca subas el JSON de credenciales ni un archivo .env a GitHub.
- El repositorio puede ser público. La hoja debe seguir privada.
- La lectura se ejecuta en el servidor de Next.js, no en el navegador.
- Solo se exponen los campos explícitamente permitidos en `lib/sheets.ts`; se excluyen precios, notas y fuentes.
- El catálogo público permite consultar las fichas. Las escrituras del editor requieren `MUNDO_RETRO_ADMIN_TOKEN`, validado solo en el servidor.
- La clave no se incluye en el código público ni se persiste en el navegador. Solo vive en memoria mientras la página permanece abierta.
- El editor escribe únicamente las columnas públicas permitidas y conserva las demás columnas (precios, notas y fuentes).

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

## Editor web de la colección

En la cabecera, **Añadir pieza** crea consolas, juegos o accesorios. **Editar ficha** aparece en cada tarjeta y en su detalle. Los formularios permiten cambiar nombre, plataforma/fabricante, año, cantidad, estado, descripción y curiosidades. Los textos de descripción y curiosidades son públicos: no introduzcas notas privadas.

Las fotografías se configuran con enlaces HTTPS directos (hasta ocho por ficha). Puedes quitar o reordenar imágenes con las flechas; la primera es la portada. Desde dos imágenes aparece un carrusel con contador. Las fotos propias tienen prioridad sobre la búsqueda automática de portadas. No se suben archivos al servidor ni se necesita Google Drive para utilizar enlaces de imágenes.

### Activar el guardado

1. Configura una clave aleatoria larga en **Vercel → Settings → Environment Variables → MUNDO_RETRO_ADMIN_TOKEN**. Si ya existe para la administración de Drive, se reutiliza.
2. Comparte el inventario con la cuenta indicada en **GOOGLE_SERVICE_ACCOUNT_EMAIL** con rol **Editor**.
3. Vuelve a desplegar después de cambiar variables. Introduce la clave en el formulario de edición; nunca la añadas al repositorio ni uses un prefijo NEXT_PUBLIC_.
4. Al guardar, las columnas públicas que falten se añaden al final de la pestaña. Las columnas privadas existentes no se modifican. Los elementos nuevos reciben un ID único.
5. La ficha se actualiza inmediatamente en el navegador que guarda y se invalida la página pública para las siguientes visitas.

Si falta la clave, se rechaza cualquier escritura. Si la cuenta solo es lectora, el formulario explica que debes darle permiso de Editor. La aplicación no genera una clave predeterminada ni convierte la hoja en pública.

### Comprobación

Con Node.js 22.18+ o 24: `node --experimental-strip-types --test tests/collection.test.mjs`.
Las pruebas cubren autorización, validación, galerías, altas, edición, preservación de columnas privadas y errores de permisos. Para comprobar tipos y la aplicación completa: `npm run build`.

## Portadas y límites de TheGamesDB

Las consultas se activan cuando una tarjeta sin imágenes propias entra en pantalla. El navegador deduplica solicitudes, usa una cola de una consulta a la vez y conserva portadas resueltas durante siete días. Al recibir HTTP 429 o un error heredado SEARCH_HTTP_429, detiene las solicitudes pendientes y comparte la pausa entre pestañas mediante almacenamiento local. Respeta Retry-After; sin ese encabezado usa una pausa conservadora de 15 minutos. Los resultados en caché y las fotos propias siguen visibles.

El servidor comparte la consulta entre catálogo y buscador de administración. Usa la Data Cache de Next para peticiones upstream durante siete días y guarda los resultados (incluidos fallos) durante 15 minutos. Una cola y un cortacircuitos reducen las ráfagas en cada instancia activa; no son un límite global distribuido. No se reintenta automáticamente un 429. Una cuota agotada no se restablece con un despliegue: debe recuperarla TheGamesDB.

Pruebas: `node --experimental-strip-types --test tests/collection.test.mjs tests/covers.test.mjs`.
