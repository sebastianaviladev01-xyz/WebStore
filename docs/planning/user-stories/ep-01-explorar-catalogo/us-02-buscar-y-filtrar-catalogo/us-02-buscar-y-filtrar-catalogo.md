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
- **Entonces** el catálogo muestra lo que dice la dirección (`buscar`, `categoria` y `precio`); «Limpiar filtros» la deja sin filtros.

### Escenario 05 – Sin tope de precio y sin tildes

- **Dado** que el comprador no eligió un precio máximo
- **Cuando** abre el catálogo o busca un nombre con o sin tildes
- **Entonces** ve todos los productos, también los de más de S/ 5,000, y la búsqueda no distingue tildes ni mayúsculas.

> Añadido el 2026-11-15 por el lote 05 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0108 y PBI-0115, decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md); el 2026-11-20 Daniel pidió un rango con mínimo y máximo, PBI-0181), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-catalogo-accesibilidad.spec.ts`.

## Fuera de alcance y pendientes

- El comparador de productos está pendiente de evaluar (PBI-0001 del [backlog](../../../backlog.md)).
