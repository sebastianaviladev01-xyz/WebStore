# 0026. Guardar las imágenes cargadas en el BFF y servirlas por dirección

- Estado: Propuesta
- Fecha: 2026-11-24

Provisional, por confirmar con Daniel Avila. Tomada en el lote 24 ([ADR-0025](0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md), PBI-0214), que manda registrar en un ADR cómo se guardan las imágenes del producto y del banner.

## Contexto

### Por qué había que decidir

En la revisión de la demo del 2026-11-17, Daniel rechazó que la imagen principal, la miniatura y las imágenes del banner se escriban como URL: «solamente cargas el archivo una sola vez y no adjuntas como URL». El servicio guarda la original para la ficha y una copia reducida para los listados, y «si tú lo guardas en una URL o como binario en la base de datos es una gestión que queda como arquitectura» ([backlog](../planning/backlog.md), PBI-0214). El BFF de prueba no tiene dependencias ni base de datos: guarda todo en `data.json` y no puede reducir imágenes. Hasta ahora, las fotos de la galería y la imagen de la categoría viajan como Data URL dentro del JSON (lotes 06 y 11), y la tienda pinta la imagen principal y la miniatura con `NgOptimizedImage`, que no admite Data URL.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Data URL guardada en el BFF y servida por dirección (elegida)** | El Admin genera las versiones y las envía como Data URL; el BFF las valida en los bytes, las guarda en `data.json` y la tienda recibe `/bff/images/{collection}/{id}/{field}?v={versión}`, que el BFF sirve como archivo | La tienda trata la imagen como cualquier foto: caché del navegador, `NgOptimizedImage` y un catálogo que no crece con cada foto. Es la forma que tendrá en producción, con un almacén de archivos detrás | Una ruta nueva en el contrato; `data.json` sigue guardando las imágenes |
| Data URL en el JSON, como la galería y la categoría | El catálogo y los banners públicos llevan la imagen dentro | Sin ruta nueva; el patrón del lote 11 | Cada producto con foto suma hasta 310 KB a cada carga del catálogo; `NgOptimizedImage` rechaza la Data URL (NG02952), así que habría que cambiar cinco plantillas de la tienda y perder la prioridad de las fotos |
| Archivos en disco servidos por el BFF | El BFF escribe cada imagen en una carpeta y guarda su ruta | `data.json` no crece | El BFF de prueba se reinicia con los datos de ejemplo en Render (ADR-0020): habría que limpiar y copiar la carpeta junto con el estado, y las pruebas, borrarla |

## Decisión

Guardaremos las imágenes cargadas del producto y del banner como Data URL en el estado del BFF de prueba y la tienda las pedirá por dirección:

- **Versiones que genera el backoffice** en el navegador, a partir de un archivo PNG, JPG o WebP de hasta 15 MB (el mismo límite que las fotos de la galería): la imagen principal del producto, de hasta 1600 px por lado y 250 KB de Data URL, para la ficha; su miniatura, la reducción de esa imagen a 480 px por lado y hasta 60 KB, para los listados; la imagen de escritorio del banner, de hasta 2560 px por lado (las de ejemplo miden 2560 × 1024) y 550 KB; y la del celular, opcional, de hasta 1200 px y 200 KB. Se comprimen en WebP (JPEG si el navegador no lo genera), probando calidades de mayor a menor hasta que caben.
- **El BFF valida en los bytes** (`imagen.rules.mjs`) una imagen nueva o cambiada: formato real, lado mayor y peso, y que la miniatura sea la reducción de la imagen principal. Rechaza una URL nueva. Las imágenes guardadas antes (rutas de `assets/`) siguen valiendo mientras no cambien.
- **La tienda recibe una dirección**: `GET /bff/images/{collection}/{id}/{field}` sirve la imagen con su tipo. La versión (`?v=`) es un resumen de la imagen: con ella la caché es larga e inmutable; sin ella, se revalida. Una ruta de `assets/` llega como siempre.

En el lote 24, la galería y la imagen de la categoría siguieron como estaban (Data URL dentro del JSON), porque no eran parte de PBI-0214. El lote 25 las lleva a la misma forma ([Ampliación del lote 25](#ampliación-del-lote-25)).

*Motivo:* es la única opción en la que la tienda no paga en cada carga el peso de las fotos ni deja de optimizarlas, y su forma (una dirección por imagen) es la que tendrá el backend de producción.

### Ampliación del lote 25

Tomada en el lote 25 ([ADR-0025](0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md)); provisional, por confirmar con Daniel Avila. Lo que el lote 24 dejó como estaba se cierra con la misma decisión:

- **Las fotos de la galería se cargan como archivo**, como la imagen principal: el backoffice ya no ofrece «URL de foto» (Daniel: «no adjuntas como URL»). El BFF valida una foto nueva con el lado y el peso de la imagen principal (1600 px y 250 KB de Data URL) y rechaza una URL o una ruta nuevas (`field: 'gallery'`). Las fotos que el producto ya tenía (URL, rutas de `assets/` o Data URL de antes) siguen valiendo mientras sigan en su galería.
- **La tienda recibe una dirección por foto**: `/bff/images/products/{id}/gallery/{n}?v={versión}`, donde `n` es la posición de la foto en la galería guardada. La posición puede cambiar al quitar o reordenar fotos; la versión, que es el resumen de la imagen, hace que el navegador no confunda una foto con otra.
- **La imagen de la categoría** llega como `/bff/images/categories/{id}/image?v={versión}`. Una imagen guardada antes que no es PNG, JPEG ni WebP (la SVG del lote 07b) sigue llegando dentro del JSON: servir SVG desde el origen de la tienda abriría la puerta a guiones, y esas imágenes desaparecen al volver a cargarlas.
- **Los pedidos** guardan la ficha pública del producto, así que desde el lote guardan las direcciones de la galería, no sus Data URL. Los pedidos creados antes conservaban lo que guardaron hasta el lote 27 ([ADR-0025](0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md), PBI-0236): desde entonces, al arrancar, el BFF cambia cada Data URL de esos pedidos por la dirección vigente de la foto, si el producto todavía la tiene, o la quita, porque nada muestra la galería de un pedido ([contrato](../../backend/docs/BFF-CONTRACT.md#administración)).
- **La foto de un pedido cuyo producto se eliminó** deja de servirse (`404 IMAGE_NOT_FOUND`). El detalle del pedido de la tienda muestra entonces un recuadro neutro del mismo tamaño en lugar de la imagen rota; el nombre del producto, el precio y la cantidad siguen a la vista. Se descartó guardar una copia de la miniatura en cada pedido: haría crecer cada pedido unos 60 KB por línea y la dirección de esa copia, pública para que la cargue un `<img>`, diría qué compró cada pedido a quien adivine su código. En producción, el almacén de objetos conservará los archivos que use un pedido aunque el producto se elimine.

## Consecuencias

**Más fácil:** cargar una foto una sola vez y que la ficha y los listados usen su versión; cambiar el almacenamiento en producción sin tocar la tienda, que solo ve direcciones.

**Más difícil:**

- `data.json` crece con cada imagen (hasta unos 310 KB por producto y 750 KB por banner). Es aceptable en el BFF de prueba, que se reinicia con los datos de ejemplo; el backend de producción guardará los archivos en un almacén de objetos y la base de datos, solo su dirección (PBI-0197 y PBI-0198).
- El BFF de prueba no reduce imágenes: lo hace el backoffice y el BFF solo comprueba lo que recibe, como con la categoría. El backend de producción recibirá la original y generará él las versiones, con las mismas medidas; el backoffice dejará entonces de reducirlas.
- Un pedido guarda la dirección de la miniatura: si el producto se elimina, su foto deja de verse en el detalle del pedido (`404 IMAGE_NOT_FOUND`). Desde el lote 25, la tienda pinta en su lugar un recuadro neutro.
- Por confirmar con Daniel: si se guarda la original además de las versiones, los tamaños y pesos máximos, y el límite de 15 MB del archivo (para la categoría pidió menos de 1 MB).

**Vigencia:** provisional hasta que Daniel la confirme. Responsable: Sebastián Avila.
