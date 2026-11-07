# Correcciones de auditoría — 2026-11-05

## Checkout

- El BFF acepta los ítems tal como los envía el carrito (`{ product, quantity }`); antes todo checkout del Storefront respondía `409 INSUFFICIENT_STOCK`.
- Precios, IGV, costo de envío y total se recalculan en el servidor.
- El cliente elige solo el distrito; el BFF asigna la tienda de origen más próxima según la tabla de tarifas y la muestra en checkout y en el detalle.

## Pedidos

- `GET /orders` exige sesión de cliente; `GET/PATCH /orders/:id` exigen la cuenta dueña o el token del pedido (`X-Order-Token`).
- El Storefront guarda solo el token de los pedidos de invitado (no los datos del pedido) y carga historial y detalle desde el BFF.
- Cancelar libera el stock reservado, también cuando se cancela desde Admin.
- Cambiar de distrito recalcula el envío.

## Experiencia de compra

- Botón de tres puntos siempre visible en cada ficha con Ver detalle, Más de la categoría y Copiar enlace.
- El diálogo de producto agregado incluye Finalizar compra (lleva al checkout).
- El carrito persiste al recargar; al cargar el catálogo se ajustan cantidades al stock y se quitan productos retirados o agotados.

## Galería y Admin

- Galería de fotos por producto: gestión en Admin (URL o carga de imagen ≤400 KB, máximo 6 adicionales), también para el rol de catálogo; ficha con miniaturas.
- Guard del Admin corregido (NG0203): sin sesión, la app quedaba en blanco en lugar de ir al login.
- Assets del Admin publicados en `/assets` (antes `/src/assets`), para que carguen las vistas previas.
- Concurrencia: revisión en el BFF, guardados parciales del Admin y reintento automático que conserva el stock vendido.
- Los formularios del Admin (productos, usuarios, banners, envíos, marcas, clientes, categorías) vuelven limpios después de guardar: `resetForm()` en lugar de `form.reset()`.
- Categorías: la lista se muestra en orden jerárquico (cada subcategoría debajo de su padre, con sangría); el selector de padre excluye la propia categoría y sus subcategorías; el BFF rechaza (400 `INVALID_CATEGORY_TREE`) ciclos y padres inexistentes.

## Verificación

- `npm run validate:contract`: smoke BFF ampliado con checkout, autorización, stock al cancelar y envíos.
- `npm run build:all` y los dos typechecks en verde.
- Recorrido en el navegador: carrito → checkout como invitado → pedido confirmado → recarga → Mis pedidos → detalle → cancelar (stock 9 → 8 → 9), sin errores de consola.
- Admin recorrido en el navegador con ambos roles: dashboard, productos (galería), inventario, categorías, marcas, clientes, usuarios, pedidos (cancelar devuelve stock), banners, envíos (un origen nuevo cambia la cotización del checkout), reclamaciones; venta en la tienda con el Admin abierto sin pérdida de stock (12 → 9 → 7 conservado).
- Menú de tres puntos, Copiar enlace, Finalizar compra y carrito tras recarga (cantidad 99 guardada → 6 según stock; producto inexistente descartado) probados en escritorio y móvil.
