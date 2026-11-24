# Contrato BFF — Demo y evolución

Base URL: `/bff` (proxy local a `http://localhost:3000`). Este documento describe lo que hace el código del BFF de prueba, con sus códigos de estado y de error; el smoke test ([`contrato.smoke.mjs`](../tests/integration/contrato.smoke.mjs)) lo recorre ([PBI-0101](../../docs/planning/backlog.md), lote 01).

## Convenciones

- Errores (Problem): `{ "message": "...", "error": { "code": "...", "message": "...", "details": { … } } }`. `details` solo viaja cuando la tabla lo indica. Los mensajes están en español y la interfaz los puede mostrar tal cual.
- Cuerpo: JSON de hasta 2 MB. Sin cuerpo cuenta como `{}`.
- Cabeceras de todas las respuestas JSON (también los errores y los `204`): `Cache-Control: no-store` y `X-Content-Type-Options: nosniff`, porque llevan tokens y datos personales.
- CORS local restringido por defecto a los puertos 4200 y 4300 (`WEBSTORE_ALLOWED_ORIGINS`).
- Tokens de sesión, códigos temporales y tokens de acceso a pedidos se guardan como digest, no en texto legible. Las contraseñas, con `scrypt` y sal individual.
- Un cambio de rutas, campos o códigos de error se refleja aquí y en el smoke test.

Errores comunes a todas las rutas:

| Estado | `code` | Cuándo |
| --- | --- | --- |
| `400` | `INVALID_JSON` | El cuerpo no es JSON |
| `400` | `INVALID_BODY` | El cuerpo es JSON pero no un objeto (`null`, una lista, un texto o un número) |
| `400` | `INVALID_PATH` | La ruta trae una secuencia `%` mal formada |
| `400` | `VALIDATION_ERROR` | Faltan campos obligatorios; `details.fields` los lista |
| `404` | `ROUTE_NOT_FOUND` | Método y ruta sin handler |
| `413` | `PAYLOAD_TOO_LARGE` | El cuerpo supera 2 MB |
| `500` | `INTERNAL_ERROR` | Error no previsto; no expone detalles. El BFF sigue respondiendo |

## Salud

| Método | Ruta | Respuesta |
| --- | --- | --- |
| `GET` | `/health` (sin `/bff`) | `200 { ok: true, service }` |

## Catálogo

| Método | Ruta | Respuesta | Errores (`code`) |
| --- | --- | --- | --- |
| `GET` | `/catalog/categories` | `200` lista de categorías, ordenadas por padre, `order` y nombre; cada una con `imageUrl` (la imagen pequeña de la categoría o `null`, lote 07b, PBI-0052) | — |
| `GET` | `/catalog/products` | `200` lista de productos activos | — |
| `GET` | `/catalog/products/:slug` | `200` el producto activo con ese slug | `404 PRODUCT_NOT_FOUND`, `400 INVALID_PATH` |

## Visitas de la tienda

Sin rutas desde el lote 13 ([ADR-0021](../../docs/adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md), PBI-0172): Daniel pidió el 2026-11-20 quitar «Personas en línea» del Dashboard, y con ella se quitaron el latido de la tienda y `POST /visits` (lote 07b, PBI-0027), que hoy responde `404 ROUTE_NOT_FOUND`. El snapshot ya no trae `onlineVisitors`.

## Contenido

- `GET /content/settings` → `200`.
- `GET /content/banners` → `200`.

Cada banner incluye `imageFit` (`cover` para fotos de ambiente, `contain` para producto completo) e `imageTone` (`light` u `dark`, por defecto `light`): con `dark` la tienda muestra los controles del carrusel oscuros, para que se lean sobre fotos oscuras. `imageFocusY` (0–100 o `null`) es la posición vertical de una foto de ambiente; sin valor, la tienda usa 31,5.

Botones (lote 12, [ADR-0021](../../docs/adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md), PBI-0184, provisional): cada banner lleva hasta dos botones opcionales, el principal (`ctaLabel` y `ctaUrl`), con la paleta primaria del tema, y el secundario (`secondaryCtaLabel` y `secondaryCtaUrl`), con la secundaria. Un botón sin configurar llega con el texto vacío y la tienda no lo muestra. El enlace es una ruta de la tienda (`/catalogo?categoria=cat-tv`) o una dirección externa (`https://…`, `http://…` o `mailto:`). La tienda abre `https://…` y `http://…` en otra pestaña, con `rel="noopener noreferrer"`; `mailto:` y las rutas de la tienda, en la misma (PBI-0174). En el Admin (`PUT /admin/snapshot`), los campos guardados son `cta`, `ctaUrl`, `secondaryCta` y `secondaryCtaUrl`. Un banner guardado antes del lote 12 sin `secondaryCta` lo recibe al cargar el estado: los principales, «Ver todos los productos» hacia `/catalogo` (el enlace fijo que el inicio mostraba a su lado); los demás, vacío.

Los ajustes públicos incluyen la identidad visual (nombre, logo y tipografía), la navegación lateral, los beneficios y el contenido configurable de Contacto, Envíos, Privacidad y Términos.

Listas de Contenido (lote 15, [ADR-0021](../../docs/adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); provisional, por confirmar con Daniel). Sustituyen a `contactEmail`, `contactPhone`, `headerMessage` y `topNavigation`, que ya no existen, y al texto `quickLinks`:

| Campo | Cada elemento | Reglas (`PUT /admin/snapshot`, `400 INVALID_COLLECTION` con `details.field` igual al campo) |
| --- | --- | --- |
| `contactEmails` (PBI-0169) | `{ value, label }` | Hasta 5. `value`, un correo válido, sin repetir (sin distinguir mayúsculas); `label`, opcional, hasta 30 caracteres («Ventas»). El primero es el principal |
| `contactPhones` (PBI-0169) | `{ value, label }` | Hasta 5. `value`, de 6 a 15 dígitos, con espacios, `+`, guiones o paréntesis, sin repetir (por sus dígitos); `label` como en los correos. El primero es el principal |
| `socialLinks` (PBI-0169) | `{ label, url }` | Hasta 8. `label`, el nombre de la red (obligatorio, hasta 30); `url`, una dirección `https://`. La tienda las abre en otra pestaña, con `rel="noopener noreferrer"` |
| `announcements` (PBI-0175) | `{ text, url }` | Hasta 5 avisos para los clientes en la barra superior de la tienda. `text`, obligatorio, hasta 140 caracteres; `url`, opcional: vacío, una ruta de la tienda (`/catalogo`, una sola `/` al principio y sin espacios) o `https://` |
| `quickLinks` (PBI-0185) | `{ group, label, url }` | Hasta 24 accesos del pie de la tienda, en hasta tres grupos (cada grupo es una columna, además de «Productos»). `group` hasta 30 caracteres; `label` hasta 40; `url`, una ruta de la tienda o `https://`. La tienda no muestra un acceso a una página informativa desactivada |

El BFF recorta los textos y guarda solo esos campos de cada elemento. La tienda ya no deduce el destino de las palabras de la «Navegación superior» (PBI-0153).

Sugeridos al agregar al carrito (lote 16, [ADR-0021](../../docs/adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md), PBI-0179; provisional, por confirmar con Daniel): `addToCartDisplay` dice dónde muestra la tienda «Producto agregado» con los productos sugeridos: `dialog` (el diálogo, por defecto) o `side-panel` (un panel lateral). En `PUT /admin/snapshot`, otro valor responde `400 INVALID_COLLECTION` con `details.field: "addToCartDisplay"`. Un estado guardado sin el campo, o con un valor desconocido, carga con `dialog`, sin migración ni cambio de `schemaVersion`.

**Cambio incompatible (`schemaVersion: 3`, feature 002):** los ajustes ya no traen `primaryColor` ni `secondaryColor`. El color vive solo en los temas (D3). Tampoco los trae la `config` del snapshot del Admin, y si un `PUT /admin/snapshot` los envía, se descartan sin error y no se publican.

## Envíos

- `GET /shipping/rates` → `200` la tabla de tarifas.
- `GET /shipping/quote?destination=...[&origin=...]` → `200 { price, origin }`. Sin `origin`, elige la tarifa más baja para el destino: la tabla refleja la distancia, así que corresponde a la tienda más próxima. Sin tarifa, `price` y `origin` son `null`.

## Checkout y pedidos

| Método | Ruta | Petición | Respuesta | Errores (`code`) |
| --- | --- | --- | --- | --- |
| `POST` | `/checkout/orders` | `{ customer, shipping, deliveryDate, paymentMethod, items, termsAccepted, total? }`; Bearer de cliente opcional; cabecera `Idempotency-Key` opcional | `201` el pedido más `accessToken`; `200` el mismo pedido si la `Idempotency-Key` ya creó uno | `400 VALIDATION_ERROR`, `400 INVALID_EMAIL`, `400 INVALID_DELIVERY_DATE` (`details.minimum`), `400 INVALID_PAYMENT_METHOD`, `400 EMPTY_ORDER`, `400 INVALID_ORDER_ITEMS`, `400 TERMS_NOT_ACCEPTED`, `400 INVALID_IDEMPOTENCY_KEY`, `400 SHIPPING_UNAVAILABLE`, `409 INSUFFICIENT_STOCK` (`details.productId`), `409 PRODUCT_UNAVAILABLE` (`details.productId`), `409 ORDER_TOTAL_CHANGED` (`details.subtotal`, `details.shippingCost`, `details.total`) |
| `GET` | `/orders` | Bearer de cliente | `200` los pedidos de la cuenta y los hechos con su correo verificado | `401 AUTHENTICATION_REQUIRED` |
| `GET` | `/orders/:id` | Bearer de la cuenta dueña o `x-order-token` | `200` el pedido | `404 ORDER_NOT_FOUND`, `400 INVALID_PATH` |
| `PATCH` | `/orders/:id/shipping` | `{ shipping }` | `200` el pedido, con origen, envío y total recalculados | `404`, `409 ORDER_NOT_MODIFIABLE`, `409 ORDER_WINDOW_EXPIRED`, `400 VALIDATION_ERROR`, `400 SHIPPING_UNAVAILABLE` |
| `PATCH` | `/orders/:id/delivery-date` | `{ deliveryDate }` | `200` el pedido | `404`, `409 ORDER_NOT_MODIFIABLE`, `409 ORDER_WINDOW_EXPIRED`, `400 INVALID_DELIVERY_DATE` |
| `PATCH` | `/orders/:id/cancel` | — | `200` el pedido cancelado; libera el stock | `404`, `409 ORDER_NOT_MODIFIABLE`, `409 ORDER_WINDOW_EXPIRED` |

Reglas del checkout (lote 01, [ADR-0017](../../docs/adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md)):

- `items`: `{ productId, quantity }` o `{ product: { id }, quantity }` (el CartItem de la tienda). `quantity` es un número entero positivo; un decimal, cero, un negativo o un texto responden `INVALID_ORDER_ITEMS`. Las líneas del mismo producto se unen en una y se validan juntas contra el stock.
- Un producto inactivo no se vende (`PRODUCT_UNAVAILABLE`), aunque se pida por su `productId`.
- `deliveryDate`: `AAAA-MM-DD` que exista, desde el día de hoy en Lima. Es provisional: el 2026-11-20 Daniel pidió que la primera fecha se configure por tienda (PBI-0178; [decisiones pendientes](../../docs/planning/PENDING-DECISIONS.md)). Al cambiarla con `PATCH`, reenviar la que el pedido ya tiene se acepta aunque haya pasado.
- `paymentMethod`: `card`, `yape-plin` o `transfer`.
- `customer` (`fullName`, `email`, `phone`, `document`) y `shipping` (`addressLine`, `district`, `province`, `department` y `reference` opcional) se guardan con lista blanca: cualquier otro campo se descarta, también en `PATCH /orders/:id/shipping`.
- El BFF recalcula precios, IGV, origen, costo de envío y total; los montos del cliente no se usan para cobrar. Vincula el pedido a la cuenta si llega `Authorization: Bearer` y crea o actualiza el cliente.

Reglas del checkout (lote 04, [ADR-0017](../../docs/adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md)):

- `termsAccepted`: el booleano `true` (PBI-0040). Ausente, `false` o de otro tipo, `400 TERMS_NOT_ACCEPTED` («Acepta los términos y condiciones para finalizar la compra.»), que se comprueba después del resto de los campos. El pedido guarda `termsAcceptedAt`, la fecha y hora de la aceptación (igual a `createdAt`), y la vista pública lo incluye. El 2026-11-20 Daniel pidió guardar también la versión de los términos aceptada (PBI-0177; [decisiones pendientes](../../docs/planning/PENDING-DECISIONS.md)); los pedidos anteriores no lo tienen.
- `total`: el total que vio el comprador (PBI-0106). Si llega como número y difiere en medio céntimo o más del que calcula el BFF con los precios y la tarifa vigentes, responde `409 ORDER_TOTAL_CHANGED` con `details: { subtotal, shippingCost, total }` vigentes, sin crear el pedido ni tocar el stock. Sin `total` no se compara. `INSUFFICIENT_STOCK` y `PRODUCT_UNAVAILABLE` se comprueban antes. La tienda siempre lo envía.
- Errores de compra (lote 13, PBI-0173, provisional): ver [Errores de compra](#errores-de-compra).
- `Idempotency-Key` (PBI-0086): clave del intento de compra que genera la tienda (de 16 a 128 caracteres `A-Z`, `a-z`, `0-9`, `-` o `_`; si no, `400 INVALID_IDEMPOTENCY_KEY`). El pedido guarda su digest, que no sale en ninguna vista. Si la clave ya creó un pedido, responde `200` con ese pedido, sin validar el cuerpo, sin crear otro y sin descontar stock; como el BFF solo guarda el digest del `accessToken`, emite uno nuevo que sustituye al anterior. Sin cabecera, cada `POST` es un pedido nuevo. La búsqueda y la creación ocurren sin esperas entre medio: dos envíos con la misma clave no crean dos pedidos. La cabecera está en `access-control-allow-headers`.

### Errores de compra

Lote 13 ([ADR-0021](../../docs/adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md), PBI-0173; provisional, por confirmar con Daniel). Un checkout rechazado porque la tienda cambió bajo el comprador, algo que el equipo puede resolver, queda como error de compra para la campana del Admin: `ORDER_TOTAL_CHANGED`, `INSUFFICIENT_STOCK`, `PRODUCT_UNAVAILABLE` y `SHIPPING_UNAVAILABLE`. Los errores del formulario (`VALIDATION_ERROR`, `INVALID_*`, `EMPTY_ORDER`, `TERMS_NOT_ACCEPTED`) no lo son: los corrige el comprador. El BFF de prueba no rechaza pagos, así que no hay «pago rechazado».

- El estado guarda `checkoutErrors`, los 50 más recientes, cada uno `{ id, at, code, productId, attempt }`: `productId` solo si el producto existe en el catálogo (si no, `null`) y `attempt`, el digest de la `Idempotency-Key` (o `null`). Ningún dato del comprador, de la dirección ni del pago. El mismo intento con el mismo código se anota una vez.
- Anotarlo no cambia la `revision` del snapshot ni la respuesta del checkout. `POST /admin/reset` los borra.

Acceso y cambios del pedido:

- `GET /orders/:id` y los `PATCH` exigen la sesión de la cuenta dueña del pedido o la cabecera `x-order-token` del invitado. Sin autorización responden `404`, igual que un pedido inexistente.
- `accessToken` es el token de acceso del invitado a **ese** pedido: se entrega una sola vez, en la respuesta del checkout, y el BFF solo guarda su digest. No es de un solo uso: sirve para consultar y cambiar el pedido mientras exista. La tienda lo conserva para mostrar el pedido.
- El cliente puede cambiar la dirección o la fecha, o cancelar, dentro de las 24 horas posteriores a la compra (`ORDER_WINDOW_EXPIRED`) y solo si el pedido no está enviado, entregado ni cancelado (`ORDER_NOT_MODIFIABLE`, que se comprueba primero).
- Un cambio de estado desde Admin a `cancelled` también libera stock, y reactivarlo lo vuelve a reservar.

## Cuenta del cliente

| Método | Ruta | Petición | Respuesta | Errores (`code`) |
| --- | --- | --- | --- | --- |
| `POST` | `/accounts` | `{ fullName, email, phone, document, password }` | `201 { verificationRequired: true, message }` y `testCode` si se exponen los códigos | `400 VALIDATION_ERROR`, `400 INVALID_EMAIL`, `400 WEAK_PASSWORD` |
| `POST` | `/account-verification-requests` | `{ email }` | `202 { message }` y `testCode` si hay una cuenta sin verificar y se exponen los códigos | `400 INVALID_EMAIL` |
| `POST` | `/account-verifications` | `{ email, code }` | `204` | `400 VALIDATION_ERROR`, `400 INVALID_VERIFICATION_CODE` |
| `POST` | `/account-sessions` | `{ email, password }` | `201 { token, user }` | `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `403 ACCOUNT_NOT_VERIFIED` |
| `GET` | `/account-sessions/current` | Bearer | `200 { user }` | `401 AUTHENTICATION_REQUIRED` |
| `DELETE` | `/account-sessions/current` | Bearer | `204` | — |
| `POST` | `/password-reset-requests` | `{ email }` | `202 { message }` y `testCode` si la cuenta existe y se exponen los códigos | `400 INVALID_EMAIL` |
| `POST` | `/password-resets` | `{ email, code, password }` | `204`; revoca todas las sesiones de la cuenta | `400 VALIDATION_ERROR`, `400 WEAK_PASSWORD`, `400 INVALID_RESET_CODE` |
| `PATCH` | `/accounts/current` | Bearer; `{ fullName, phone, document }` | `200 { user }` | `401 AUTHENTICATION_REQUIRED`, `400 VALIDATION_ERROR` |
| `DELETE` | `/accounts/current` | Bearer | `204` | `401 AUTHENTICATION_REQUIRED` |

Reglas:

- Respuestas uniformes: el alta, el reenvío y la recuperación responden lo mismo exista o no la cuenta. El alta no devuelve la cuenta ni responde un conflicto: con un correo ya verificado no cambia nada; con uno sin verificar, solo si su código ya venció rehace la cuenta con los datos nuevos (para que un registro ajeno no bloquee el correo); si el código sigue vigente, no cambia nada. Con los códigos expuestos, que llegue o no `testCode` sí lo deja ver: es solo para pruebas.
- Los códigos son de seis dígitos y caducan a los 15 minutos. Pedir uno nuevo anula el anterior. Tras 5 intentos fallidos el código se anula y responde igual que uno incorrecto (`INVALID_VERIFICATION_CODE` o `INVALID_RESET_CODE`): hay que pedir otro.
- `testCode` solo viaja con `WEBSTORE_EXPOSE_TEST_CODES=true` o en modo demo; por defecto no, aunque no sea `NODE_ENV=production`. No hay correo real: el canal transaccional sigue pendiente (PBI-0008).
- El ingreso compara la contraseña aunque el correo no exista, para tardar lo mismo. `ACCOUNT_NOT_VERIFIED` solo responde con la contraseña correcta.
- Las sesiones caducan a las 8 horas y pueden revocarse.

## Libro de reclamaciones

| Método | Ruta | Petición | Respuesta | Errores (`code`) |
| --- | --- | --- | --- | --- |
| `POST` | `/complaints` | `{ name, document, email, phone, address, subject, type, detail, request, amount? }` | `201` el reclamo, con `id` `REC-AAAA-NNNNN` y `dueAt` | `400 VALIDATION_ERROR`, `400 INVALID_EMAIL`, `400 INVALID_COMPLAINT_TYPE`, `400 INVALID_COMPLAINT_AMOUNT` |

- `type`: `reclamo` o `queja`. `amount`: número no negativo; sin valor, `0`.
- El código lleva el año de Lima y un correlativo que sigue al mayor emitido ese año, así que no se repite. Empieza en 1 cada año.
- `dueAt`: fin del día de Lima a 15 días hábiles (lunes a viernes). Feriados y días no laborables adicionales se pasan en `WEBSTORE_NON_WORKING_DATES` como fechas ISO separadas por comas.

La obligación de responder en 15 días hábiles está descrita por [Indecopi](https://consumidor.gob.pe/libro-de-reclamaciones/). El mock registra la respuesta en Admin, pero no envía correo ni conserva constancia de entrega; el canal transaccional sigue pendiente.

## Administración

| Método | Ruta | Petición | Respuesta | Errores (`code`) |
| --- | --- | --- | --- | --- |
| `POST` | `/admin/sessions` | `{ email, password }` | `201 { token, user }` | `400 VALIDATION_ERROR`, `401 INVALID_ADMIN_CREDENTIALS` |
| `GET` | `/admin/sessions/current` | Bearer | `200 { user }` | `401 ADMIN_AUTHENTICATION_REQUIRED` |
| `DELETE` | `/admin/sessions/current` | Bearer | `204` | — |
| `GET` | `/admin/snapshot` | Bearer | `200` snapshot | `401 ADMIN_AUTHENTICATION_REQUIRED` |
| `PUT` | `/admin/snapshot` | Bearer; `{ revision, …colecciones modificadas }` | `200` snapshot actualizado | `401`, `403 INSUFFICIENT_ROLE` (`details.collection`), `403 CATALOG_SCOPE_VIOLATION`, `403 USER_SCOPE_VIOLATION`, `409 STALE_SNAPSHOT`, `400 INVALID_COLLECTION` (`details.collection`, `field`, `id`), `400 INVALID_PRODUCTS`, `400 INVALID_CATEGORY_TREE` (`details.categoryId`), `400 INVALID_ROLE`, `400 WEAK_PASSWORD`, `409 LAST_SUPERADMIN`, `409 SELF_LOCKOUT`, `409 COMPLAINTS_READ_ONLY`, `409 INSUFFICIENT_STOCK`, `409 BRAND_IN_USE` (`details.brandId`, `products`), `409 CATEGORY_IN_USE` (`details.categoryId`, `products`), `409 CATEGORY_HAS_CHILDREN` (`details.categoryId`, `children`), `413 PAYLOAD_TOO_LARGE` |
| `POST` | `/admin/reset` | Bearer | `200` snapshot de la demo | `401`, `403 INSUFFICIENT_ROLE`, `403 STORE_RESET_DISABLED` |
| `PATCH` | `/admin/profile` | Bearer; `{ name, email }` | `200 { user }` | `401 ADMIN_AUTHENTICATION_REQUIRED`, `400 VALIDATION_ERROR`, `400 INVALID_EMAIL`, `409 ADMIN_EMAIL_TAKEN` |
| `PUT` | `/admin/profile/password` | Bearer; `{ currentPassword, newPassword }` | `204`; cierra las demás sesiones de esa persona | `401 ADMIN_AUTHENTICATION_REQUIRED`, `400 VALIDATION_ERROR`, `400 INVALID_CURRENT_PASSWORD`, `400 WEAK_PASSWORD` |
| `GET` | `/admin/notifications` | Bearer | `200 { seenAt, total, counts, items }` | `401`, `403 INSUFFICIENT_ROLE` (sin `orders.view`, `complaints.manage` ni `orders.manage`) |
| `PUT` | `/admin/notifications/seen` | Bearer; `{ until }` | `200 { seenAt, total, counts, items }` | `401`, `403 INSUFFICIENT_ROLE`, `400 INVALID_SEEN_AT` |

El ingreso compara la contraseña aunque el correo no exista o el usuario esté inactivo, para tardar lo mismo.

Perfil propio (lote 07b, PBI-0034; el 2026-11-18 Daniel pidió que el correo nuevo se verifique, PBI-0161): los tres roles editan su nombre y su correo y cambian su contraseña, con una ruta propia que no pasa por el snapshot. Las rutas validan la sesión antes de leer el cuerpo. El nombre se recorta; el correo se guarda en minúsculas y no puede ser el de otro usuario del panel (`ADMIN_EMAIL_TAKEN`, «Ese correo ya lo usa otro usuario del panel.»). Cambiar los datos avanza la `revision` del snapshot (los usuarios viajan en él). La contraseña nueva sigue la política de las cuentas (10 caracteres, una letra y un número: `WEAK_PASSWORD`); la actual equivocada responde `INVALID_CURRENT_PASSWORD` («La contraseña actual no es correcta.») sin cerrar nada. Al cambiarla se cierran las demás sesiones de esa persona y se conserva la que hizo el cambio.

Notificaciones (lote 07b, PBI-0033; confirmadas por Daniel el 2026-11-18; desde el lote 13, [ADR-0021](../../docs/adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md), PBI-0173, también reclamos y errores de compra, provisional): cada rol recibe los avisos de lo que gestiona, creados después de `seenAt` (todos si es `null`):

| Tipo (`type`) | Quién lo recibe | Qué es nuevo | Campos del aviso |
| --- | --- | --- | --- |
| `order` | `orders.view` (los tres roles desde el lote 11, PBI-0170) | Pedido en estado `confirmed` | `{ type, id, at, customer, total }`; `at` es el `createdAt` del pedido |
| `complaint` | `complaints.manage` (superadministrador y administrador) | Reclamo en estado `received` | `{ type, id, at, complaintType }` (`reclamo` o `queja`); sin quien reclama ni su detalle |
| `checkout-error` | `orders.manage` (superadministrador y administrador) | [Error de compra](#errores-de-compra) | `{ type, id, at, code, product }`; `product` es el nombre del producto del catálogo o `null` |

`items` mezcla los tres tipos, del más reciente al más antiguo, como mucho 20 (sin datos de contacto); `total` los cuenta todos y `counts` (`{ orders, complaints, checkoutErrors }`) los cuenta por tipo, con 0 en los que el rol no recibe. `PUT /admin/notifications/seen` recibe `until`, el `at` del aviso más reciente que la persona vio en el menú (fecha ISO en UTC; si no, `INVALID_SEEN_AT`): así un aviso que llegó mientras tanto sigue siendo nuevo. Un solo «visto» por persona vale para los tres tipos. «Visto» se guarda por usuario en el estado (`adminNotificationsSeen`), nunca retrocede ni pasa de la hora del BFF, no cambia la `revision` y se borra si se elimina el usuario.

El snapshot expone `revision`, `roles` (los tres roles fijos con sus permisos), productos, categorías, marcas, clientes, usuarios administrativos, banners, tarifas, pedidos, reclamos y configuración. Cada colección solo viaja con contenido al rol que puede gestionarla; para los demás llega vacía. Los pedidos viajan a quien los ve (`orders.view`), aunque no pueda cambiar su estado (`orders.manage`; lote 11, PBI-0170).

Desde el lote 07b, para el Dashboard completo (roles con `orders.manage`, no el vendedor, aunque vea los pedidos: la actividad nombra a clientes y reclamos que no ve). Las personas en línea (`onlineVisitors`) se quitaron en el lote 13 (PBI-0172); Daniel no pidió cambios en la actividad:

- `activity` (PBI-0028): los últimos eventos, del más reciente al más antiguo, cada uno `{ id, at, type, description }`; `[]` para el vendedor. `type` es `order-created`, `order-status-changed` (desde el Admin, «El equipo pasó el pedido … a «…».», o una cancelación del cliente desde la tienda), `account-registered` o `complaint-registered`. La descripción no lleva correo, teléfono, documento ni dirección: solo el nombre que el Admin ya muestra (el comprador en Pedidos, quien reclama en Reclamaciones); la de una cuenta no dice de quién es, porque el Admin no muestra las cuentas. El estado guarda los últimos 50 (`activity`); no se edita desde el Admin.

Los pedidos del snapshot traen el detalle para despachar: cliente, correo, teléfono, dirección, distrito, tienda de origen, fecha de entrega, medio de pago, `termsAcceptedAt` (cuándo aceptó el comprador los términos; `null` en los pedidos anteriores a esa casilla, lote 06, PBI-0145), líneas (`productId`, `name`, `quantity`, `unitPrice`), subtotal, envío y total. Nunca incluyen el token de acceso del cliente.

`PUT /admin/snapshot` recibe `revision` y solo las colecciones modificadas, y devuelve el snapshot actualizado. Si `revision` no coincide con la del BFF (hubo una venta, un cambio de pedido, un reclamo u otro guardado), responde `409 STALE_SNAPSHOT` sin aplicar nada.

Cambios por registro (lote 06, PBI-0119 y PBI-0120): cada colección puede llegar como la lista completa, que la reemplaza, o como cambios `{ upsert, remove }`:

- `upsert`: registros con `id`. Si el registro existe, solo se aplican los campos que trae y el resto se conserva del servidor (fotos, stock vendido, lo que cambió otra persona); un campo con `null` se quita. Si no existe, se agrega al final y debe venir completo.
- `remove`: los `id` que se eliminan. Un `id` no puede estar en los dos.
- La lista resultante se valida entera, igual que si hubiera llegado completa. Otra forma responde `400 INVALID_COLLECTION`.
- `orders` acepta solo `{ upsert: [{ id, status }] }`: los pedidos no se crean ni se eliminan desde el panel. En `complaints`, un `upsert` cambia `status` y `providerResponse` del reclamo; un `remove` responde `409 COMPLAINTS_READ_ONLY`. El vendedor no puede eliminar productos (`403 CATALOG_SCOPE_VIOLATION`), y el administrador no puede usar `remove` en `users` (`403 USER_SCOPE_VIOLATION`).

El Admin envía siempre cambios: solo los registros y los campos que tocó la persona. Así un guardado no lleva las fotos de otros productos y no choca con el límite del cuerpo (`413 PAYLOAD_TOO_LARGE`, 2 MB). Ante `409 STALE_SNAPSHOT` recarga y vuelve a enviar el mismo cambio si ninguno de esos campos cambió en el servidor mientras tanto; si alguno cambió, o si el registro ya no existe, no guarda y avisa.

Validación del guardado (lote 01): los cambios se aplican sobre una copia del estado y se confirman solo si todo es válido, así que cualquier error deja el estado como estaba. Antes de aplicar, cada colección se valida en forma y contenido (`INVALID_COLLECTION`):

| Colección | Reglas |
| --- | --- |
| Todas | Lista de objetos con `id` de texto, no vacío y único |
| `products` (rol con `products.manage`: los tres roles fijos desde el lote 07; sin él, `403 INSUFFICIENT_ROLE`) | `name`, `sku` (único sin distinguir mayúsculas; el mensaje dice qué producto lo usa), `categoryId` y `brandId` con texto; `price` número `>= 0`; `stock` entero `>= 0`; `active` booleano; `description`, `imageUrl`, `thumbnailUrl`, `highlights` y `gallery` del tipo que corresponde si vienen. Dirección de ficha única (PBI-0129): un producto nuevo o renombrado cuyo slug (el del nombre, sin mayúsculas ni tildes) ya usa otro se rechaza con `field: 'slug'` y el nombre del otro; dos que ya lo compartían no bloquean otros guardados |
| `categories` | `name` con texto; `parentId` texto o vacío; `order` número o vacío; `imageUrl` opcional (lote 07b, PBI-0052; lote 11, PBI-0176): la única versión de la imagen, una Data URL en base64 de un PNG, un JPG o un WebP de exactamente 100 × 100 px y de hasta 100 000 caracteres, o `null` para quitarla (`field: 'imageUrl'`). El BFF lee el formato y las medidas en los bytes: un tipo declarado que no es el de los bytes, otras medidas o SVG se rechazan. Una imagen que la categoría ya tenía guardada (del lote 07b: hasta 160 px, también SVG) se acepta sin volver a medirla mientras no cambie. Ver [Imagen de la categoría](#imagen-de-la-categoría); sin ciclos ni padres inexistentes (`INVALID_CATEGORY_TREE`). Dirección única (lote 07, PBI-0148): una categoría nueva o renombrada cuyo slug (el del nombre, sin mayúsculas ni tildes) ya usa otra se rechaza con `field: 'slug'` y el nombre de la otra; dos que ya lo compartían no bloquean otros guardados. Una categoría eliminada no puede tener subcategorías (`409 CATEGORY_HAS_CHILDREN`) ni productos (`409 CATEGORY_IN_USE`) |
| `brands` | `name` con texto y `active` booleano. Una marca eliminada no puede tener productos (`409 BRAND_IN_USE`, con cuántos en `details.products`). El uso se mide después de aplicar los productos del mismo guardado (PBI-0131) |
| `customers` | `name` y `email` con texto; `orders` entero `>= 0` si viene |
| `banners` | `title` texto; `placement` `hero`, `promotion` o `secondary`; `active` booleano; `imageFit`, `imageTone` e `imageFocusY` de sus valores si vienen; `endAt` igual o posterior a `startAt` (PBI-0128). Cada botón (`cta` y `ctaUrl`; `secondaryCta` y `secondaryCtaUrl`) va completo o vacío: con texto y sin enlace se rechaza en el enlace, y con enlace y sin texto, en el texto; el texto admite hasta 40 caracteres. Un botón guardado antes a medias se acepta mientras no cambie (lote 12, PBI-0184) |
| `rates` | `origin` y `destination` con texto; `price` número `>= 0` |
| `config` | Un objeto. Solo las claves conocidas, cada una del tipo de su valor vigente (texto o booleano), y `storeName` con texto. Las listas de Contenido siguen sus reglas ([Contenido](#contenido)). Las claves desconocidas se descartan; las ausentes conservan su valor |
| `users` | `name` con texto, `email` válido y único, `active` booleano y un rol fijo (`INVALID_ROLE`). El administrador solo crea, cambia o deja en su rol a los vendedores, y no elimina usuarios (`USER_SCOPE_VIOLATION`) |
| `orders` | `status`: `confirmed`, `processing`, `shipped`, `delivered` o `cancelled` |
| `complaints` | Los mismos reclamos que tiene el BFF: no se crean ni se borran (`COMPLAINTS_READ_ONLY`). De cada uno solo se aplican `status` (`received`, `in-review` o `resolved`) y `providerResponse`; monto, detalle y datos de quien reclama se conservan |

Los productos tienen `gallery` (fotos adicionales). El catálogo público expone `images`: la imagen principal primero y luego la galería.

`POST /admin/reset` vuelve a los datos de demostración y solo funciona en modo demo o con `WEBSTORE_ALLOW_STORE_RESET=true` (para pruebas); fuera, responde `403 STORE_RESET_DISABLED` y no borra nada. Exige el permiso `store.reset` (solo `superadmin`).

### Roles fijos (acordados el 05/11)

Los roles no se crean ni se editan; solo se asignan. La tabla vive en `backend/src/domain/sesion/rol.rules.mjs` y el Admin la replica en `frontend/projects/admin/src/app/features/sesion/domain/rol.rules.ts` solo para mostrar u ocultar opciones.

Permisos de la reunión del 11/11 (lote 07, [ADR-0017](../../docs/adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md), PBI-0013). Daniel los confirmó el 2026-11-18 con un cambio, construido en el lote 11 ([ADR-0021](../../docs/adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md), PBI-0170; provisional, por confirmar con Daniel): el vendedor también gestiona Inventario y ve Pedidos sin cambiar su estado ([decisiones pendientes](../../docs/planning/PENDING-DECISIONS.md), «Permisos de los roles»):

| Rol | Permisos | Puede |
| --- | --- | --- |
| `superadmin` | Todos | La configuración de la tienda (`content.manage`, `themes.manage` y `store.reset`), eliminar usuarios (`users.delete`) y todo lo de los otros roles. Ve y gestiona a los usuarios de cualquier rol |
| `admin` | `dashboard.view`, `products.edit`, `products.manage`, `products.delete`, `inventory.manage`, `categories.manage`, `brands.manage`, `customers.manage`, `users.manage`, `orders.view`, `orders.manage`, `banners.manage`, `shipping.manage` y `complaints.manage` | Toda la operación: catálogo (también eliminar productos), inventario, categorías, marcas, clientes, pedidos, banners, tarifas y reclamaciones. Ve y gestiona solo a los vendedores (crear, editar, activar y desactivar), sin eliminarlos ni asignar otro rol. Sin Contenido ni temas |
| `vendedor` | `dashboard.view`, `products.edit`, `products.manage`, `inventory.manage` y `orders.view` | Dashboard, Productos, Inventario y Pedidos: crea productos y modifica todos sus campos (también SKU, precio, categoría, marca, estado y stock), de cualquier producto de la tienda, sin eliminarlos; gestiona el stock en Inventario; ve los pedidos y su detalle y la campana de pedidos nuevos, sin cambiar su estado (`orders` en el guardado responde `403 INSUFFICIENT_ROLE`). Sin clientes, usuarios ni la actividad reciente del Resumen |

Reglas del servidor:

- Si el `PUT` incluye una colección que el rol no puede modificar, responde `403 INSUFFICIENT_ROLE` con `details.collection` (por ejemplo, `config` del administrador u `orders` del vendedor).
- Un rol con `products.manage` sin `products.delete` (el vendedor) no puede eliminar productos, ni con `remove` ni enviando la lista sin uno: `403 CATALOG_SCOPE_VIOLATION` («Tu rol no puede eliminar productos.»). Cambiar productos pide `products.manage`; sin él, `403 INSUFFICIENT_ROLE` (lote 07b, PBI-0158: se quitó la rama de «solo la ficha», que ningún rol fijo usaba; si Daniel decide un vendedor con permisos parciales, hay que volver a añadirla).
- Usuarios: el snapshot solo trae los usuarios de los roles que gestiona quien pide (el administrador, los vendedores). Crear, cambiar o dejar en otro rol a un usuario fuera de esos roles, o eliminar usuarios sin `users.delete`, responde `403 USER_SCOPE_VIOLATION` sin cambiar nada («Tu rol solo puede gestionar usuarios con rol Vendedor.» o «Tu rol no puede eliminar usuarios. Desactívalo para quitarle el acceso.»). Se comprueba antes que `INVALID_ROLE`, `LAST_SUPERADMIN` y `SELF_LOCKOUT`; un rol fuera de los fijos responde `INVALID_ROLE`.
- Un usuario con un rol fuera de los tres fijos se rechaza con `400 INVALID_ROLE`.
- Debe quedar al menos un superadministrador activo (`409 LAST_SUPERADMIN`) y nadie puede eliminarse, desactivarse ni cambiarse el rol a sí mismo (`409 SELF_LOCKOUT`).
- Un usuario eliminado o desactivado pierde sus sesiones abiertas.

Migraciones de los datos guardados por versiones anteriores. Cada una se ejecuta una sola vez, al arrancar el BFF:

- `schemaVersion: 2`: sin `schemaVersion`, los roles pasan `owner` → `superadmin` y `catalog-maintainer` → `vendedor`, y se agrega la cuenta demo `admin@webstore.demo` si no existe.
- `schemaVersion: 3`: el estado gana `appearance` (`revision`, `activeThemeId` y `customThemes`), con B activo. Si los colores de Contenido difieren de los de B (`#1D4ED8` y `#C2410C`, sin distinguir mayúsculas), se crea con ellos el tema propio «Colores de Contenido» (con el fondo principal, el fondo secundario y el contraste de B) y queda activo; si el nombre ya existe, «Colores de Contenido (2)», «(3)»… Un color ausente, que no es `#RRGGBB` o el anterior por defecto (borgoña `#6E173C` o bronce `#8C6845`) cuenta como el de B. Después, `primaryColor` y `secondaryColor` se quitan de la configuración. Un tema activo que no existe pasa a B. `POST /admin/reset` vuelve a B, sin temas propios.
- Lote 07b, sin migración ni cambio de `schemaVersion`: un estado sin `activity` ni `adminNotificationsSeen` las carga vacías; al cargar se descartan los elementos mal formados y `activity` se recorta a 50.
- Lote 13 (PBI-0173), sin migración ni cambio de `schemaVersion`: un estado sin `checkoutErrors` la carga vacía; al cargar se descartan los mal formados y se recorta a 50.
- Lote 16 (PBI-0179), sin migración ni cambio de `schemaVersion`: un estado sin `config.addToCartDisplay`, o con un valor que no es `dialog` ni `side-panel`, carga con `dialog`.
- `schemaVersion: 4` (lote 15, ADR-0021): las listas de Contenido. `contactEmail` y `contactPhone` pasan a ser el primero de `contactEmails` y `contactPhones` (vacíos, listas vacías, nunca los de la demo), y `socialLinks` empieza vacía. `headerMessage` pasa a ser el primer aviso, sin enlace; le siguen los textos de `topNavigation` que la cabecera no ofrece por su cuenta (Inicio, Productos, Pedidos y Envíos sí), con el enlace que la tienda les deducía o sin él. El texto `quickLinks`, que la tienda no usaba, pasa a ser el pie que se veía (Mi cuenta, Información y Ayuda). Los datos migrados se conservan tal cual y se validan cuando el Admin vuelve a guardar esa lista. Los cuatro campos anteriores se quitan.

En cada arranque, además, cada tema propio guardado pasa por las reglas con que se crea (lote 03, PBI-0068): un nombre con caracteres invisibles los pierde y uno repetido se renombra con «(2)», «(3)»…; un tema que no es un objeto, sin `id` de texto, con un `id` repetido o de un predefinido, con un color que no es `#RRGGBB`, un nombre inválido o un contraste que impediría guardarlo se descarta. Si el descartado era el activo, queda B. Cada cambio se escribe en el log del BFF (`console.warn`), con el tema descartado completo para poder recuperarlo. Así, un tema guardado a mano o por una versión anterior ya no deja `/appearance` ni `/appearance/theme.css` respondiendo `500`.

## Apariencia y temas

El BFF es la fuente de los temas ([ADR-0010](../../docs/adrs/0010-aplicar-el-tema-activo-con-una-hoja-de-estilos-del-bff.md), [ADR-0011](../../docs/adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md) y [ADR-0012](../../docs/adrs/0012-activar-el-modo-demo-y-recordar-la-vista-previa-en-una-cookie.md)). Los predefinidos A («Violeta tienda»), B («Azul cobalto») y C («Grafito y ámbar») viven en el código y no se editan ni se borran; los temas propios y el tema activo se guardan en `appearance`, con una revisión propia, independiente de la del snapshot: una venta no invalida un guardado de temas, ni un guardado de temas invalida el snapshot.

| Método   | Ruta                           | Petición                                                                                       | Respuesta                                                                                                                                                | Errores (`code`)                                                                                                                                                                     | Roles                          |
| -------- | ------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `GET`    | `/appearance`                  | —                                                                                              | `200 Apariencia`: `{ demoMode, testCredentials, activeThemeId, themes }`. En modo demo, `themes` trae A, B y C y, si el activo es un tema propio, también el activo (nunca los demás propios, ADR-0022); fuera de él, solo el activo | —                                                                                                                                                                                    | Público                        |
| `GET`    | `/appearance/theme.css`        | Cookie `ws_tema_vista_previa`, que solo se lee en modo demo y solo vale si es A, B o C. Cabecera opcional `If-None-Match` | `200 text/css; charset=utf-8` con `Cache-Control: no-cache`, `ETag`, `X-Content-Type-Options: nosniff` y, solo en modo demo, `Vary: Cookie`; `304` sin cuerpo si `If-None-Match` coincide con el `ETag` vigente | — (nunca falla por la cookie: si no es un predefinido, sirve el activo)                                                                                                                     | Público                        |
| `GET`    | `/admin/themes`                | Bearer                                                                                         | `200 TemasAdmin`: `{ revision, activeThemeId, themes }`, con todos los temas                                                                             | `401 ADMIN_AUTHENTICATION_REQUIRED`, `403 INSUFFICIENT_ROLE`                                                                                                                         | `superadmin` (`themes.manage`) |
| `POST`   | `/admin/themes`                | `{ revision, name, colors }`                                                                   | `201 TemasAdmin`. El tema nuevo no queda activo                                                                                                          | `400 INVALID_THEME_NAME`, `400 INVALID_THEME_COLOR` (`details.field`), `400 INSUFFICIENT_THEME_CONTRAST` (`details.pairs`), `409 THEME_NAME_TAKEN`, `409 STALE_THEMES`, `401`, `403` | `superadmin`                   |
| `PUT`    | `/admin/themes/:id`            | `{ revision, name, colors }`                                                                   | `200 TemasAdmin`                                                                                                                                         | Los de `POST`, `404 THEME_NOT_FOUND` y `409 PREDEFINED_THEME_READ_ONLY`                                                                                                              | `superadmin`                   |
| `DELETE` | `/admin/themes/:id?revision=N` | —                                                                                              | `200 TemasAdmin`                                                                                                                                         | `404 THEME_NOT_FOUND`, `409 PREDEFINED_THEME_READ_ONLY`, `409 ACTIVE_THEME_IN_USE`, `409 STALE_THEMES`, `401`, `403`                                                                 | `superadmin`                   |
| `PUT`    | `/admin/active-theme`          | `{ revision, themeId }`                                                                        | `200 TemasAdmin`                                                                                                                                         | `404 THEME_NOT_FOUND`, `409 STALE_THEMES`, `401`, `403`                                                                                                                              | `superadmin`                   |

Formas y reglas:

- `Tema`: `{ id, name, kind: 'predefined' | 'custom', colors: { primary, secondary, background, surface, contrast }, tokens: { '--ws-primary': '#1D4ED8', … } }`. Los `tokens` se calculan al leer y no se guardan. Los colores de un tema propio se guardan en `#RRGGBB` en mayúsculas.
- `Tema.tokens` tiene 38 claves, en el orden de `TOKENS_DEL_TEMA`. `'--ws-on-link'` es el texto y las marcas sobre el color de los enlaces ([ADR-0014](../../docs/adrs/0014-dar-al-tema-un-token-para-el-texto-sobre-el-enlace.md)) y va justo después de `'--ws-link'`: es el más legible sobre el enlace entre el blanco, `colors.contrast` y `colors.surface` (en un tema oscuro, la superficie); vale `#FFFFFF` en A y C, `#ffffff` en B y se calcula en un tema propio, sin heredarse de un predefinido. Material pinta con él su `on-primary`. Un cliente que ignore la clave sigue funcionando. `'--ws-store-bg'` es el lienzo de la tienda ([ADR-0013](../../docs/adrs/0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md)) y va justo antes de `'--ws-bg'`: en A, B y C es un literal propio de cada uno, y en un tema propio es su `colors.background`, herede o no la escala neutra de un predefinido. La tienda pinta su lienzo con él y el Admin sigue con `'--ws-bg'`. Un cliente que ignore la clave sigue funcionando.
- Borde del acento ([ADR-0023](../../docs/adrs/0023-dar-al-tema-un-borde-del-acento-y-un-acento-fuerte-legible.md), lote 14, PBI-0189): `'--ws-accent-line'` va justo después de `'--ws-on-accent'`. Es `colors.secondary` si llega a 3:1 sobre `colors.background` y `colors.surface`; si no, su primera mezcla con `colors.contrast`, de 10 en 10 % (`color-mix(in srgb, <secundario> 90%, <contraste>)`, 80 %…), que llega; en último caso, `colors.contrast`. Vale `color-mix(in srgb, #F5A524 70%, #17151C)` en A, `var(--ws-accent)` en B y `#1F2328` en C. La tienda y el Admin contornean con él los componentes rellenos con el acento. Desde el mismo lote, `'--ws-accent-strong'` de un tema propio es el secundario si el texto sobre el acento no llega a 4.5:1 sobre la mezcla al 78 % con el contraste; A, B y C no cambian. Un cliente que ignore la clave sigue funcionando.
- Error y alerta ([ADR-0019](../../docs/adrs/0019-calcular-con-el-tema-el-error-la-alerta-y-el-texto-sobre-el-principal.md), lote 03): `'--ws-danger'`, `'--ws-danger-soft'`, `'--ws-danger-line'`, `'--ws-warning'` y `'--ws-warning-soft'` van justo después de `'--ws-on-topbar'`. En A, B y C valen lo que `tokens.css` fijaba antes (`#B42318`, `#FEF3F2`, `#FECDCA`, `#8A4B08` y `#FFF6E5`; en minúsculas en B). En un tema propio se elige, para el error y para la alerta por separado, la variante cuyo texto se lee mejor sobre `colors.background` y `colors.surface`: sobre fondos claros, la de A, B y C; sobre fondos oscuros, `#FDA29B` y `#FEC84B`, con el fondo suave al 12 % y la línea al 40 % mezclados con la superficie. Son claves nuevas: un cliente que las ignore sigue funcionando con las de `tokens.css`.
- Texto sobre el principal (ADR-0019): en un tema propio, `'--ws-on-primary'` es el más legible sobre el principal entre el blanco, `colors.contrast` y `colors.surface`, como `'--ws-on-link'`; `'--ws-on-topbar'` usa los mismos candidatos sobre la franja. Con un principal muy claro sobre una base oscura es la superficie. A, B y C no cambian.
- Orden de `themes`: A, B y C, y después los propios por nombre (`localeCompare('es')`).
- Nombre: recortado, de 1 a 40 caracteres, sin caracteres invisibles (de control o de formato, como los de ancho cero: `400 INVALID_THEME_NAME`, «El nombre del tema no puede llevar caracteres invisibles.») y único entre todos los temas, predefinidos incluidos, a la vista: sin distinguir mayúsculas, espacios repetidos ni formas Unicode equivalentes (NFKC: un espacio duro, una letra con la tilde combinada o de ancho completo cuentan como la normal). Se guarda tal como se escribió, recortado (lote 03, PBI-0069).
- `details.pairs` de `INSUFFICIENT_THEME_CONTRAST`: `[{ pair: 'contrast/background' | 'contrast/surface', ratio: 2.1, minimum: 4.5 }]`, con la relación redondeada a un decimal hacia abajo, como la muestra el Admin. Solo esos dos pares bloquean; el resto de los 27 pares que se miden, incluidos los cuatro sobre el lienzo de la tienda, `borderStrong/surface`, `onLink/link` (el texto sobre el enlace, a 4.5:1) y los seis del error y la alerta (`danger/background`, `danger/surface`, `danger/dangerSoft`, `warning/background`, `warning/surface` y `warning/warningSoft`, a 4.5:1), son avisos que el Admin muestra y que no impiden guardar.
- Cada `POST`, `PUT` y `DELETE` exige la `revision` vigente de los temas. Ausente o distinta, responde `409 STALE_THEMES` («Otra persona cambió los temas. Recarga la lista y vuelve a intentarlo.») y no cambia nada. El Admin no reintenta: avisa y recarga la lista.
- `ACTIVE_THEME_IN_USE`: «Activa otro tema antes de borrar este.»
- Las rutas del Admin validan la sesión y el permiso antes de leer el cuerpo.
- `theme.css` es un único bloque `:root:root { --ws-…: …; }`, solo con declaraciones de variables (38, una por clave de `Tema.tokens` y en su orden, con `--ws-accent-line` justo después de `--ws-on-accent`, `--ws-on-link` justo después de `--ws-link`, el error y la alerta justo después de `--ws-on-topbar` y `--ws-store-bg` justo antes de `--ws-bg`), con el mapa del tema activo o, en modo demo, el de la vista previa de la cookie si es un tema predefinido (A, B o C; la tuerca del Admin solo ofrece esos, ADR-0022). El selector repetido gana a `:root` de `tokens.css`, que se carga después. No lleva cabeceras CORS: se carga con `<link>` desde el mismo origen.
- Caché de `theme.css`: el `ETag` es el SHA-256 recortado, entre comillas, del cuerpo que se sirve. Cambia al activar otro tema, al editar el activo, al cambiar la vista previa y si una versión nueva cambia los valores de un predefinido. `no-cache` obliga a revalidar en cada carga. En modo demo, `Vary: Cookie` evita que un intermediario sirva la vista previa de una persona a otra; fuera de él la cookie no cambia la hoja, así que no se envía y una cookie cualquiera no parte la caché compartida (PBI-0073).
- Modo demo: lo enciende `WEBSTORE_DEMO_MODE=true` (solo `true`, sin distinguir mayúsculas ni espacios en los extremos). Sin él, `demoMode` es `false` y la cookie se ignora. La cookie no se guarda en el BFF ni afecta a nadie más. Solo la escribe la tuerca del Admin; la tienda no tiene tuerca y solo la lee (lote 14, PBI-0188, [ADR-0022](../../docs/adrs/0022-quitar-la-tuerca-de-la-tienda-y-limitar-la-demo-a-los-temas-predefinidos.md)).
- `testCredentials`: si el acceso del Admin muestra las credenciales de prueba (PBI-0071). Es `true` en modo demo o con `WEBSTORE_SHOW_TEST_CREDENTIALS=true`, que no enciende la tuerca ni la vista previa ([ADR-0020](../../docs/adrs/0020-publicar-la-demo-en-render.md)). Un cliente que no conozca el campo puede usar `demoMode`.

## Imagen de la categoría

Daniel pidió el 2026-11-19 que el Admin adjunte una foto de menos de 1 MB y que el backend reduzca su peso y su tamaño y guarde una sola versión de 100 × 100 px (PBI-0176; lote 11, [ADR-0021](../../docs/adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md), provisional). El contrato fija el resultado: la categoría guarda y publica solo esa versión.

**Límite del BFF de prueba:** no tiene dependencias (STD-14) y Node no decodifica ni codifica imágenes, así que no puede reducirlas. Por eso el Admin acepta la foto original (PNG, JPG o WebP de hasta 1 MB), la encaja entera en un cuadrado de 100 × 100 px y la comprime en el navegador, y el BFF solo valida lo que recibe: formato real (firma y cabecera de PNG, JPEG o WebP), medidas exactas y tamaño. Un BFF productivo debe recibir la foto original y hacer él la reducción (por ejemplo, con una librería de imágenes), con la misma salida de 100 × 100 px; el Admin dejaría entonces de reducirla.

## Producción

El endpoint snapshot es deliberadamente compacto para la demo. Un BFF productivo debe dividir comandos/queries, usar un proveedor de identidad, aplicar rate limiting y auditoría, proteger concurrencia de stock, guardar las claves de idempotencia del checkout con vencimiento y comparar el cuerpo repetido, y usar persistencia transaccional.

`/appearance/theme.css` bloquea el primer pintado de la tienda y del Admin ([ADR-0010](../../docs/adrs/0010-aplicar-el-tema-activo-con-una-hoja-de-estilos-del-bff.md)). Un BFF productivo debe servirla rápido y con caché: conservar el `ETag`, el `Cache-Control: no-cache` y, en modo demo, el `Vary: Cookie`, responder el `304` sin recalcular el mapa (por ejemplo, con la hoja y su `ETag` en memoria hasta el siguiente cambio de temas) y, si hay CDN o proxy delante, que respete `Vary: Cookie` o que no guarde la hoja en modo demo.
