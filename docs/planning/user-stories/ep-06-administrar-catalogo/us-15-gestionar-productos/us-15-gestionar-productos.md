# US15 — Gestionar productos

- Épica: [EP06 — Administrar el catálogo](../ep-06-administrar-catalogo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: productos); [TRACEABILITY](../../../TRACEABILITY.md) («Gestión de productos», «Detalle de producto (fotos, descripción, características)», «Vendedor»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: productos; roles)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador o vendedor
- **Quiero** crear, editar y eliminar productos y sus fotos
- **Para** que la tienda muestre un catálogo correcto

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Cambios publicados en la tienda

- **Dado** que un administrador crea, edita o elimina un producto
- **Cuando** guarda el cambio
- **Entonces** el catálogo público refleja el cambio.

### Escenario 02 – Fotos adicionales

- **Dado** que un administrador o un vendedor edita un producto
- **Cuando** agrega fotos cargando un archivo (el Admin lo reduce antes de guardarlo; lote 06, PBI-0119)
- **Entonces** la ficha del producto muestra esas fotos después de la imagen principal.

> Cambiado el 2026-11-24 por el lote 25 ([ADR-0025](../../../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); PBI-0214 y PBI-0227; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Revisión de la demo: destacados, categorías, imágenes y listado»): antes también se agregaban por URL. El BFF rechaza una URL nueva en la galería; las fotos que el producto ya tenía siguen valiendo. Lo prueban `admin-catalogo-filtros.spec.ts` y `admin-productos-movil.spec.ts`.

### Escenario 03 – Alcance del vendedor

- **Dado** que un vendedor está en Productos
- **Cuando** crea un producto o modifica cualquiera de sus campos (también SKU, precio, categoría, marca y estado; el stock, desde el lote 23, en Inventario), de cualquier producto de la tienda
- **Entonces** el cambio se guarda; si intenta eliminar un producto, el Admin no se lo ofrece y el BFF lo rechaza (`403 CATALOG_SCOPE_VIOLATION`).

> Cambiado el 2026-11-15 por el lote 07 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0013), con los permisos de la reunión del 11/11: antes el vendedor no creaba productos ni cambiaba SKU, precio, categoría, marca ni estado. Daniel lo confirmó el 2026-11-18 ([decisiones pendientes](../../../PENDING-DECISIONS.md), «Permisos de los roles»); si el vendedor elimina productos se confirma con él al especificar PBI-0170. Lo prueban `admin-catalogo-filtros.spec.ts` (TEST-17) y `admin-permisos.spec.ts`.

### Escenario 04 – Fotos que no bloquean el guardado

- **Dado** que un usuario del Admin carga una foto grande o el catálogo ya tiene muchas fotos guardadas
- **Cuando** guarda un producto o su stock
- **Entonces** la foto se reduce y se comprime antes de guardarse (o se rechaza con un motivo si aun así no cabe), y el guardado lleva solo lo que cambió, sin las fotos de los demás productos.

### Escenario 05 – SKU y dirección de ficha únicos

- **Dado** que ya hay un producto con ese SKU, o con un nombre que da la misma dirección de ficha (sin contar mayúsculas ni tildes)
- **Cuando** el usuario guarda otro producto con ese SKU o ese nombre
- **Entonces** el Admin no lo envía y dice, junto al campo, qué producto ya lo usa; el BFF también lo rechaza.

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0119, PBI-0129 y PBI-0142), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts`.

### Escenario 06 – Imagen principal como archivo

- **Dado** que un usuario del backoffice registra o edita un producto
- **Cuando** carga la imagen principal como archivo (PNG, JPG o WebP)
- **Entonces** el backoffice genera la imagen de la ficha y la miniatura de los listados; ve la imagen actual y puede reemplazarla. No hay campo para escribir una URL, y el BFF rechaza una URL nueva.

> Añadido el 2026-11-24 por el lote 24 ([ADR-0025](../../../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); PBI-0214; [ADR-0026](../../../../adrs/0026-guardar-las-imagenes-cargadas-en-el-bff-y-servirlas-por-direccion.md); decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Revisión de la demo: destacados, categorías, imágenes y listado»), sin especificación propia: lo prueba `frontend/tests/e2e/admin-imagenes-y-banners.spec.ts`.

### Escenario 07 – Producto destacado

- **Dado** que un usuario del backoffice edita un producto
- **Cuando** marca o desmarca «Es destacado» y guarda
- **Entonces** el inicio de la tienda lo muestra o deja de mostrarlo entre los destacados ([US01](../../ep-01-explorar-catalogo/us-01-ver-inicio/us-01-ver-inicio.md), Escenario 06).

> Añadido el 2026-11-24 por el lote 22 ([ADR-0025](../../../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); PBI-0215; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Revisión de la demo: destacados, categorías, imágenes y listado»), sin especificación propia: lo prueba `frontend/tests/e2e/admin-destacados-y-categorias.spec.ts`.

### Escenario 08 – El stock fuera del registro

- **Dado** que un usuario del backoffice registra o edita un producto
- **Cuando** mira el registro
- **Entonces** no hay campo «Stock»: una línea remite a Inventario. Un producto nuevo empieza sin stock, y guardar el registro no cambia el stock que puso Inventario o dejó una venta.

> Añadido el 2026-11-24 por el lote 23 ([ADR-0025](../../../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); PBI-0226; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Revisión de la demo: inventario, stock y SKU»), sin especificación propia: lo prueba `frontend/tests/e2e/admin-catalogo-filtros.spec.ts`.

### Escenario 09 – Listado de Productos

- **Dado** que un usuario del backoffice abre Productos
- **Cuando** mira la lista
- **Entonces** el SKU va en su propia columna, sin el conteo de características ni de fotos, y el precio lleva dos decimales.

> Añadido el 2026-11-24 por el lote 25 ([ADR-0025](../../../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); PBI-0218 y PBI-0219; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Revisión de la demo: mantenimientos»), sin especificación propia: lo prueban `frontend/tests/e2e/admin-listados.spec.ts` y `admin-productos-movil.spec.ts`.

### Escenario 10 – Categoría con búsqueda

- **Dado** que un usuario del backoffice filtra Productos por categoría o elige la categoría de un producto
- **Cuando** escribe al menos tres caracteres en el campo «Categoría»
- **Entonces** ve las categorías de cualquier nivel del árbol que coinciden, cada una con su ruta, y elige una sola; Enter elige la primera.

> Añadido el 2026-11-24 por el lote 29 ([ADR-0027](../../../../adrs/0027-cerrar-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-20.md); PBI-0238; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Reunión del 2026-11-20: editor de temas y categoría con búsqueda»), sin especificación propia: lo prueba `frontend/tests/e2e/admin-categoria-con-busqueda.spec.ts`. El filtro sigue incluyendo las subcategorías, y la categoría sigue siendo obligatoria en el registro.

## Fuera de alcance y pendientes

- Daniel respondió el 2026-11-18: el vendedor modifica todos los campos de todos los productos y, además, gestiona Inventario y ve Pedidos (PBI-0170 del [backlog](../../../backlog.md)). Si el vendedor elimina productos se confirma con él al especificar PBI-0170.
- Productos propios de cada vendedor (que solo vea los que creó): no, el vendedor trabaja sobre todos los productos de la tienda (confirmado por Daniel el 2026-11-18). Depende del modelo de datos (PBI-0043).
- El SKU sigue siendo un código por producto. Que identifique cada unidad y se reserve al comprar es parte del modelo de datos base (PBI-0043), que define Daniel (PBI-0226).
