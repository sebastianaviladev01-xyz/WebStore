# US02 — Buscar y filtrar el catálogo

- Épica: [EP01 — Explorar el catálogo](../ep-01-explorar-catalogo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Storefront: búsqueda/filtros por nombre/categoría/precio); [TRACEABILITY](../../../TRACEABILITY.md) («Filtros nombre/categoría/precio», «Opciones con botón de tres puntos (sin hover)»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Storefront: catálogo con filtros acordados; estados vacíos y sin resultados)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** comprador
- **Quiero** buscar productos por nombre y filtrarlos por categoría y precio
- **Para** comparar solo lo que me interesa

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Filtrar el catálogo

- **Dado** que el comprador está en el catálogo
- **Cuando** busca por nombre o filtra por categoría o por precio
- **Entonces** el catálogo muestra solo los productos que cumplen los criterios.

### Escenario 02 – Sin resultados

- **Dado** que ningún producto cumple los criterios
- **Cuando** el comprador aplica la búsqueda o los filtros
- **Entonces** la tienda muestra un estado sin resultados.

### Escenario 03 – Opciones de la tarjeta

- **Dado** que el comprador ve la tarjeta de un producto
- **Cuando** abre su botón de tres puntos
- **Entonces** puede ver el detalle, ver más productos de la categoría o copiar el enlace, sin depender del hover.

### Escenario 04 – Filtros en la dirección

- **Dado** que el comprador filtró el catálogo
- **Cuando** busca desde la cabecera, elige una categoría del menú o del pie, vuelve atrás o comparte la dirección
- **Entonces** el catálogo muestra lo que dice la dirección (`buscar`, `categoria`, `precioMin` y `precioMax`; desde el lote 16); «Limpiar filtros» la deja sin filtros.

### Escenario 05 – Sin tope de precio y sin tildes

- **Dado** que el comprador no eligió un rango de precio
- **Cuando** abre el catálogo o busca un nombre con o sin tildes
- **Entonces** ve todos los productos, también los de más de S/ 5,000, y la búsqueda no distingue tildes ni mayúsculas.

> Añadido el 2026-11-15 por el lote 05 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0108 y PBI-0115, decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md); el 2026-11-20 Daniel pidió un rango con mínimo y máximo, PBI-0181), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-catalogo-accesibilidad.spec.ts`.

### Escenario 06 – Rango de precio

- **Dado** que el comprador está en el catálogo
- **Cuando** escribe un precio mínimo, un máximo o los dos y sale del campo o pulsa Enter
- **Entonces** el catálogo muestra los productos de ese rango y la dirección guarda `precioMin` y `precioMax`; un rango al revés se avisa en el campo, y la ayuda muestra el precio más bajo y el más alto del catálogo. Un enlace antiguo con `precio` se lee como máximo.

> Añadido el 2026-11-23 por el lote 16 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0181; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-catalogo.spec.ts`.

### Escenario 07 – Comparar productos

- **Dado** que el comprador marca «Comparar» en la tarjeta o en la ficha de hasta 4 productos
- **Cuando** abre «Comparar (N)» de la cabecera
- **Entonces** ve en `/comparar` una tabla con la imagen, el nombre, la marca, la categoría, el precio, la disponibilidad y las características de cada uno, con «Agregar al carrito» y «Quitar»; la dirección guarda la lista y se puede compartir.

> Añadido el 2026-11-23 por el lote 19 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0001; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-comparador.spec.ts`.

### Escenario 08 – Ordenar el catálogo

- **Dado** que el comprador está en el catálogo, con o sin filtros
- **Cuando** elige en «Ordenar por» «Relevancia» (el orden de siempre, por defecto), «Precio: menor a mayor», «Precio: mayor a menor», «Nombre: A–Z» o «Nombre: Z–A»
- **Entonces** ve los mismos productos en ese orden; la dirección guarda `orden` (sin él, o con un valor desconocido, es «Relevancia») junto a los filtros, que se conservan al cambiar el orden, y «Limpiar filtros» quita los filtros y deja el orden. El nombre se ordena en español sin distinguir mayúsculas ni tildes y, a igual precio o nombre, manda el orden de «Relevancia». A 375 px, «Ordenar por» ocupa su propia fila debajo de «Filtros».

> Añadido el 2026-11-27 por el lote 52 ([ADR-0037](../../../../adrs/0037-cerrar-por-lotes-los-pendientes-que-no-dependen-de-terceros.md); PBI-0278; decisión de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Lotes 50 a 56»), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-orden-y-foto-ampliada.spec.ts`.

## Fuera de alcance y pendientes

- El comparador se construyó en el lote 19 (escenario 07, PBI-0001). Su lista no se guarda en el navegador: vive en memoria y en la dirección.
