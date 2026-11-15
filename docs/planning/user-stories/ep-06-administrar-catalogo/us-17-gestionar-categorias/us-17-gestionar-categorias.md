# US17 — Gestionar categorías jerárquicas

- Épica: [EP06 — Administrar el catálogo](../ep-06-administrar-catalogo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: categorías jerárquicas); [TRACEABILITY](../../../TRACEABILITY.md) («Gestión de categorías», «Subcategorías/niveles», «Orden explícito o alfabético»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: categorías jerárquicas y ordenables)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador
- **Quiero** organizar las categorías en niveles y ordenarlas
- **Para** que el comprador navegue el catálogo con facilidad

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Subcategorías

- **Dado** que existe una categoría
- **Cuando** el administrador crea otra dentro de ella
- **Entonces** el Admin muestra la lista jerárquica.

### Escenario 02 – Sin ciclos

- **Dado** que el administrador asigna como padre de una categoría a una de sus descendientes
- **Cuando** guarda
- **Entonces** el Admin y el BFF rechazan la jerarquía.

### Escenario 03 – Orden

- **Dado** que el administrador definió un orden para las categorías
- **Cuando** la tienda las muestra
- **Entonces** respeta ese orden y, sin orden explícito, las ordena alfabéticamente.

### Escenario 04 – Categoría en uso

- **Dado** que una categoría tiene subcategorías o productos
- **Cuando** el administrador la elimina
- **Entonces** no se elimina: el Admin dice por qué y cuántas subcategorías o productos la usan, y el BFF lo rechaza.

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0131; decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts`.

### Escenario 05 – Imagen de la categoría

- **Dado** que el administrador edita una categoría
- **Cuando** le carga una imagen pequeña y guarda
- **Entonces** el Admin la reduce a 160 px antes de guardarla, la tienda la muestra junto al nombre de la categoría en sus menús y, si se quita, la tienda se ve como antes.

> Añadido el 2026-11-15 por el lote 07b ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0052; decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueban `frontend/tests/e2e/admin-funciones-nuevas.spec.ts` y `storefront-categoria-imagen.spec.ts`.
