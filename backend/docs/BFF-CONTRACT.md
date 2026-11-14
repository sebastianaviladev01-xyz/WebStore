# Contrato BFF — Demo y evolución

Base URL: `/bff` (proxy local a `http://localhost:3000`).

## Catálogo

- `GET /catalog/categories`
- `GET /catalog/products`
- `GET /catalog/products/:slug`

## Contenido

- `GET /content/settings`
- `GET /content/banners`

Cada banner incluye `imageFit` (`cover` para fotos de ambiente, `contain` para producto completo) e `imageTone` (`light` u `dark`, por defecto `light`): con `dark` la tienda muestra los controles del carrusel oscuros, para que se lean sobre fotos oscuras. `imageFocusY` (0–100 o `null`) es la posición vertical de una foto de ambiente; sin valor, la tienda usa 31,5.

Los ajustes públicos incluyen la identidad visual (nombre, logo y tipografía), navegación y el contenido configurable de Contacto, Envíos, Privacidad y Términos.

**Cambio incompatible (`schemaVersion: 3`, feature 002):** los ajustes ya no traen `primaryColor` ni `secondaryColor`. El color vive solo en los temas (D3). Tampoco los trae la `config` del snapshot del Admin, y si un `PUT /admin/snapshot` los envía, se descartan sin error y no se publican.

## Envíos

- `GET /shipping/rates`
- `GET /shipping/quote?destination=...[&origin=...]` → `{ price, origin }`. Sin `origin`, elige la tarifa más baja para el destino: la tabla refleja la distancia, así que corresponde a la tienda más próxima.

## Checkout y pedidos

- `POST /checkout/orders`
  - acepta los ítems del carrito (`{ product, quantity }` o `{ productId, quantity }`);
  - valida y descuenta stock;
  - recalcula en servidor precios, IGV, origen, costo de envío y total (los montos del cliente no se usan);
  - crea el pedido, lo vincula a la cuenta si llega `Authorization: Bearer`, y crea/actualiza el cliente;
  - devuelve el pedido más un `accessToken` de un solo uso de entrega (solo se guarda su digest).
- `GET /orders` — requiere sesión de cliente; devuelve los pedidos de la cuenta y los hechos con su correo verificado.
- `GET /orders/:id`
- `PATCH /orders/:id/shipping` — recalcula origen y costo de envío si cambia el distrito.
- `PATCH /orders/:id/delivery-date`
- `PATCH /orders/:id/cancel` — libera el stock reservado.

`GET /orders/:id` y los `PATCH` exigen la sesión de la cuenta dueña del pedido o la cabecera `x-order-token` del invitado. Sin autorización responden `404`, igual que un pedido inexistente. Las mutaciones validan en servidor la ventana de 24 h. Un cambio de estado desde Admin a `cancelled` también libera stock, y reactivarlo lo vuelve a reservar.

## Cuenta del cliente

- `POST /accounts` — registra la cuenta y genera un código temporal.
- `POST /account-verifications` — activa la cuenta.
- `POST /account-sessions` — valida credenciales y entrega un token opaco.
- `GET /account-sessions/current`
- `DELETE /account-sessions/current`
- `POST /password-reset-requests`
- `POST /password-resets`
- `PATCH /accounts/current`
- `DELETE /accounts/current`

Las contraseñas se derivan con `scrypt` y sal individual. Los códigos caducan a los 15 minutos; solo se devuelven en el entorno local de demostración. Las sesiones caducan y pueden revocarse.

## Libro de reclamaciones

- `POST /complaints` — valida el formulario, persiste el reclamo y devuelve un código `REC-YYYY-xxxxx` con fecha límite calculada a 15 días hábiles de Lima (lunes a viernes). Feriados y días no laborables adicionales se pasan en `WEBSTORE_NON_WORKING_DATES` como fechas ISO separadas por comas.

La obligación de responder en 15 días hábiles está descrita por [Indecopi](https://consumidor.gob.pe/libro-de-reclamaciones/). El mock registra la respuesta en Admin, pero no envía correo ni conserva constancia de entrega; el canal transaccional sigue pendiente.

## Administración

- `POST /admin/sessions`
- `GET /admin/sessions/current`
- `DELETE /admin/sessions/current`
- `GET /admin/snapshot`
- `PUT /admin/snapshot`
- `POST /admin/reset` — solo `superadmin` (permiso `store.reset`), en el Mock BFF/testing.

El snapshot expone `revision`, `roles` (los tres roles fijos con sus permisos), productos, categorías, marcas, clientes, usuarios administrativos, banners, tarifas, pedidos, reclamos y configuración. Requiere `Authorization: Bearer <token>`. Cada colección solo viaja con contenido al rol que puede gestionarla; para los demás llega vacía.

Los pedidos del snapshot traen el detalle para despachar: cliente, correo, teléfono, dirección, distrito, tienda de origen, fecha de entrega, medio de pago, líneas (`productId`, `name`, `quantity`, `unitPrice`), subtotal, envío y total. Nunca incluyen el token de acceso del cliente.

`PUT /admin/snapshot` recibe `revision` y solo las colecciones modificadas, y devuelve el snapshot actualizado. Si `revision` no coincide con la del BFF (hubo una venta, un cambio de pedido, un reclamo u otro guardado), responde `409 STALE_SNAPSHOT` sin aplicar nada. El Admin recarga y reaplica el cambio; si no tocó el stock de un producto, conserva el del BFF.

Los productos tienen `gallery` (fotos adicionales). El catálogo público expone `images`: la imagen principal primero y luego la galería. El rol `vendedor` puede editar la galería.

### Roles fijos (acordados el 05/11)

Los roles no se crean ni se editan; solo se asignan. La tabla vive en `backend/src/domain/sesion/rol.rules.mjs` y el Admin la replica en `frontend/projects/admin/src/app/features/sesion/domain/rol.rules.ts` solo para mostrar u ocultar opciones.

| Rol          | Puede                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `superadmin` | Todo, incluida la gestión de usuarios, el reinicio de la demo y los temas (`themes.manage`)                                                                   |
| `admin`      | Toda la operación (catálogo, inventario, categorías, marcas, clientes, pedidos, banners, contenido, tarifas y reclamaciones), sin gestionar usuarios ni temas |
| `vendedor`   | Resumen, ficha de productos existentes (nombre, descripción, imágenes, características, stock), inventario y estado de pedidos                                |

Reglas del servidor:

- Si el `PUT` incluye una colección que el rol no puede modificar, responde `403 INSUFFICIENT_ROLE` con `details.collection`.
- El vendedor no puede crear ni eliminar productos (`403 CATALOG_SCOPE_VIOLATION`); precio, SKU, categoría, marca y estado se conservan del servidor.
- Un usuario con un rol fuera de los tres fijos se rechaza con `400 INVALID_ROLE`.
- Debe quedar al menos un superadministrador activo (`409 LAST_SUPERADMIN`) y nadie puede eliminarse, desactivarse ni cambiarse el rol a sí mismo (`409 SELF_LOCKOUT`).
- Un usuario eliminado o desactivado pierde sus sesiones abiertas.

Migraciones de los datos guardados por versiones anteriores. Cada una se ejecuta una sola vez, al arrancar el BFF:

- `schemaVersion: 2`: sin `schemaVersion`, los roles pasan `owner` → `superadmin` y `catalog-maintainer` → `vendedor`, y se agrega la cuenta demo `admin@webstore.demo` si no existe.
- `schemaVersion: 3`: el estado gana `appearance` (`revision`, `activeThemeId` y `customThemes`), con B activo. Si los colores de Contenido difieren de los de B (`#1D4ED8` y `#C2410C`, sin distinguir mayúsculas), se crea con ellos el tema propio «Colores de Contenido» (con el fondo principal, el fondo secundario y el contraste de B) y queda activo; si el nombre ya existe, «Colores de Contenido (2)», «(3)»… Un color ausente, que no es `#RRGGBB` o el anterior por defecto (borgoña `#6E173C` o bronce `#8C6845`) cuenta como el de B. Después, `primaryColor` y `secondaryColor` se quitan de la configuración. Un tema activo que no existe pasa a B. `POST /admin/reset` vuelve a B, sin temas propios.

## Apariencia y temas

El BFF es la fuente de los temas ([ADR-0010](../../docs/adrs/0010-aplicar-el-tema-activo-con-una-hoja-de-estilos-del-bff.md), [ADR-0011](../../docs/adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md) y [ADR-0012](../../docs/adrs/0012-activar-el-modo-demo-y-recordar-la-vista-previa-en-una-cookie.md)). Los predefinidos A («Violeta tienda»), B («Azul cobalto») y C («Grafito y ámbar») viven en el código y no se editan ni se borran; los temas propios y el tema activo se guardan en `appearance`, con una revisión propia, independiente de la del snapshot: una venta no invalida un guardado de temas, ni un guardado de temas invalida el snapshot.

| Método   | Ruta                           | Petición                                                                                       | Respuesta                                                                                                                                                | Errores (`code`)                                                                                                                                                                     | Roles                          |
| -------- | ------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `GET`    | `/appearance`                  | —                                                                                              | `200 Apariencia`: `{ demoMode, activeThemeId, themes }`. En modo demo, `themes` trae todos los temas; fuera de él, solo el activo                        | —                                                                                                                                                                                    | Público                        |
| `GET`    | `/appearance/theme.css`        | Cookie `ws_tema_vista_previa`, que solo se lee en modo demo. Cabecera opcional `If-None-Match` | `200 text/css; charset=utf-8` con `Cache-Control: no-cache`, `ETag` y `Vary: Cookie`; `304` sin cuerpo si `If-None-Match` coincide con el `ETag` vigente | — (nunca falla por la cookie: si no es un tema, sirve el activo)                                                                                                                     | Público                        |
| `GET`    | `/admin/themes`                | Bearer                                                                                         | `200 TemasAdmin`: `{ revision, activeThemeId, themes }`, con todos los temas                                                                             | `401 ADMIN_AUTHENTICATION_REQUIRED`, `403 INSUFFICIENT_ROLE`                                                                                                                         | `superadmin` (`themes.manage`) |
| `POST`   | `/admin/themes`                | `{ revision, name, colors }`                                                                   | `201 TemasAdmin`. El tema nuevo no queda activo                                                                                                          | `400 INVALID_THEME_NAME`, `400 INVALID_THEME_COLOR` (`details.field`), `400 INSUFFICIENT_THEME_CONTRAST` (`details.pairs`), `409 THEME_NAME_TAKEN`, `409 STALE_THEMES`, `401`, `403` | `superadmin`                   |
| `PUT`    | `/admin/themes/:id`            | `{ revision, name, colors }`                                                                   | `200 TemasAdmin`                                                                                                                                         | Los de `POST`, `404 THEME_NOT_FOUND` y `409 PREDEFINED_THEME_READ_ONLY`                                                                                                              | `superadmin`                   |
| `DELETE` | `/admin/themes/:id?revision=N` | —                                                                                              | `200 TemasAdmin`                                                                                                                                         | `404 THEME_NOT_FOUND`, `409 PREDEFINED_THEME_READ_ONLY`, `409 ACTIVE_THEME_IN_USE`, `409 STALE_THEMES`, `401`, `403`                                                                 | `superadmin`                   |
| `PUT`    | `/admin/active-theme`          | `{ revision, themeId }`                                                                        | `200 TemasAdmin`                                                                                                                                         | `404 THEME_NOT_FOUND`, `409 STALE_THEMES`, `401`, `403`                                                                                                                              | `superadmin`                   |

Formas y reglas:

- `Tema`: `{ id, name, kind: 'predefined' | 'custom', colors: { primary, secondary, background, surface, contrast }, tokens: { '--ws-primary': '#1D4ED8', … } }`. Los `tokens` se calculan al leer y no se guardan. Los colores de un tema propio se guardan en `#RRGGBB` en mayúsculas.
- `Tema.tokens` tiene 32 claves, en el orden de `TOKENS_DEL_TEMA`. `'--ws-on-link'` es el texto y las marcas sobre el color de los enlaces ([ADR-0014](../../docs/adrs/0014-dar-al-tema-un-token-para-el-texto-sobre-el-enlace.md)) y va justo después de `'--ws-link'`: es el más legible sobre el enlace entre el blanco, `colors.contrast` y `colors.surface` (en un tema oscuro, la superficie); vale `#FFFFFF` en A y C, `#ffffff` en B y se calcula en un tema propio, sin heredarse de un predefinido. Material pinta con él su `on-primary`. Un cliente que ignore la clave sigue funcionando. `'--ws-store-bg'` es el lienzo de la tienda ([ADR-0013](../../docs/adrs/0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md)) y va justo antes de `'--ws-bg'`: en A, B y C es un literal propio de cada uno, y en un tema propio es su `colors.background`, herede o no la escala neutra de un predefinido. La tienda pinta su lienzo con él y el Admin sigue con `'--ws-bg'`. Un cliente que ignore la clave sigue funcionando.
- Orden de `themes`: A, B y C, y después los propios por nombre (`localeCompare('es')`).
- Nombre: recortado, de 1 a 40 caracteres y único entre todos los temas, predefinidos incluidos, sin distinguir mayúsculas.
- `details.pairs` de `INSUFFICIENT_THEME_CONTRAST`: `[{ pair: 'contrast/background' | 'contrast/surface', ratio: 2.1, minimum: 4.5 }]`, con la relación redondeada a un decimal hacia abajo, como la muestra el Admin. Solo esos dos pares bloquean; el resto de los 21 pares que se miden, incluidos los cuatro sobre el lienzo de la tienda, `borderStrong/surface` y `onLink/link` (el texto sobre el enlace, a 4.5:1), son avisos que el Admin muestra y que no impiden guardar.
- Cada `POST`, `PUT` y `DELETE` exige la `revision` vigente de los temas. Ausente o distinta, responde `409 STALE_THEMES` («Otra persona cambió los temas. Recarga la lista y vuelve a intentarlo.») y no cambia nada. El Admin no reintenta: avisa y recarga la lista.
- `ACTIVE_THEME_IN_USE`: «Activa otro tema antes de borrar este.»
- Las rutas del Admin validan la sesión y el permiso antes de leer el cuerpo.
- `theme.css` es un único bloque `:root:root { --ws-…: …; }`, solo con declaraciones de variables (32, una por clave de `Tema.tokens` y en su orden, con `--ws-on-link` justo después de `--ws-link` y `--ws-store-bg` justo antes de `--ws-bg`), con el mapa del tema activo o, en modo demo, el de la vista previa de la cookie si es un tema existente. El selector repetido gana a `:root` de `tokens.css`, que se carga después. No lleva cabeceras CORS: se carga con `<link>` desde el mismo origen.
- Caché de `theme.css`: el `ETag` es el SHA-256 recortado, entre comillas, del cuerpo que se sirve. Cambia al activar otro tema, al editar el activo, al cambiar la vista previa y si una versión nueva cambia los valores de un predefinido. `no-cache` obliga a revalidar en cada carga, y `Vary: Cookie` evita que un intermediario sirva la vista previa de una persona a otra.
- Modo demo: lo enciende `WEBSTORE_DEMO_MODE=true` (solo `true`, sin distinguir mayúsculas ni espacios en los extremos). Sin él, `demoMode` es `false` y la cookie se ignora. La cookie no se guarda en el BFF ni afecta a nadie más.

## Convenciones y protección local

- Errores: `{ "message": "...", "error": { "code": "...", "message": "..." } }`.
- Límite de cuerpo: 2 MB.
- CORS local restringido por defecto a los puertos 4200 y 4300.
- Validación de DTOs antes de persistir.
- Tokens almacenados como digest, no en texto legible.

## Producción

El endpoint snapshot es deliberadamente compacto para la demo. Un BFF productivo debe dividir comandos/queries, usar un proveedor de identidad, aplicar rate limiting y auditoría, proteger concurrencia de stock, incorporar idempotencia de checkout y usar persistencia transaccional.

`/appearance/theme.css` bloquea el primer pintado de la tienda y del Admin ([ADR-0010](../../docs/adrs/0010-aplicar-el-tema-activo-con-una-hoja-de-estilos-del-bff.md)). Un BFF productivo debe servirla rápido y con caché: conservar el `ETag`, el `Cache-Control: no-cache` y el `Vary: Cookie`, responder el `304` sin recalcular el mapa (por ejemplo, con la hoja y su `ETag` en memoria hasta el siguiente cambio de temas) y, si hay CDN o proxy delante, que respete `Vary: Cookie` o que no guarde la hoja en modo demo.
