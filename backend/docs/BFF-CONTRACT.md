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

Los ajustes públicos incluyen la identidad visual, navegación y el contenido configurable de Contacto, Envíos, Privacidad y Términos.

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

| Rol          | Puede                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `superadmin` | Todo, incluida la gestión de usuarios y el reinicio de la demo                                                                                       |
| `admin`      | Toda la operación (catálogo, inventario, categorías, marcas, clientes, pedidos, banners, contenido, tarifas y reclamaciones), sin gestionar usuarios |
| `vendedor`   | Resumen, ficha de productos existentes (nombre, descripción, imágenes, características, stock), inventario y estado de pedidos                       |

Reglas del servidor:

- Si el `PUT` incluye una colección que el rol no puede modificar, responde `403 INSUFFICIENT_ROLE` con `details.collection`.
- El vendedor no puede crear ni eliminar productos (`403 CATALOG_SCOPE_VIOLATION`); precio, SKU, categoría, marca y estado se conservan del servidor.
- Un usuario con un rol fuera de los tres fijos se rechaza con `400 INVALID_ROLE`.
- Debe quedar al menos un superadministrador activo (`409 LAST_SUPERADMIN`) y nadie puede eliminarse, desactivarse ni cambiarse el rol a sí mismo (`409 SELF_LOCKOUT`).
- Un usuario eliminado o desactivado pierde sus sesiones abiertas.

Migración: los datos guardados por versiones anteriores (sin `schemaVersion`) pasan `owner` → `superadmin` y `catalog-maintainer` → `vendedor`, y se agrega la cuenta demo `admin@webstore.demo` si no existe. Se ejecuta una sola vez (`schemaVersion: 2`).

## Convenciones y protección local

- Errores: `{ "message": "...", "error": { "code": "...", "message": "..." } }`.
- Límite de cuerpo: 2 MB.
- CORS local restringido por defecto a los puertos 4200 y 4300.
- Validación de DTOs antes de persistir.
- Tokens almacenados como digest, no en texto legible.

## Producción

El endpoint snapshot es deliberadamente compacto para la demo. Un BFF productivo debe dividir comandos/queries, usar un proveedor de identidad, aplicar rate limiting y auditoría, proteger concurrencia de stock, incorporar idempotencia de checkout y usar persistencia transaccional.
