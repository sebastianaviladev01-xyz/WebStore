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

## Fuera de alcance y pendientes

- El comparador de productos está pendiente de evaluar (PBI-0001 del [backlog](../../../backlog.md)).
