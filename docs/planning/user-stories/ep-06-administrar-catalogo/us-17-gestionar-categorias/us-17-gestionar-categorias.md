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

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0131; decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md), confirmada por Daniel el 2026-11-18), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts`.

### Escenario 05 – Imagen de la categoría

- **Dado** que el administrador edita una categoría
- **Cuando** le carga una imagen pequeña y guarda
- **Entonces** el backoffice acepta un PNG, JPG o WebP de menos de 1 MB y guarda una sola versión de 100 × 100 px (desde el lote 11, PBI-0176), que el BFF comprueba; la imagen se ve en la lista de Categorías, en los menús de la tienda, en el filtro del catálogo y en «Compra por categoría» (PBI-0162) y, si se quita, todo se ve como antes.

> Añadido el 2026-11-15 por el lote 07b ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0052; decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md); el 2026-11-19 Daniel pidió que el Admin adjunte una foto de menos de 1 MB y que el servicio backend de la tienda, hoy el BFF, la optimice en una sola versión de 100 × 100 px, PBI-0176), sin especificación propia. Cambiado el 2026-11-23 por el lote 11 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); provisional, por confirmar con Daniel). Lo prueban `frontend/tests/e2e/admin-funciones-nuevas.spec.ts` y `storefront-categoria-imagen.spec.ts`.
