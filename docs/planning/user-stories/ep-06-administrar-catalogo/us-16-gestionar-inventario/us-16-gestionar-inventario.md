# US16 — Gestionar el inventario

- Épica: [EP06 — Administrar el catálogo](../ep-06-administrar-catalogo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: inventario); [TRACEABILITY](../../../TRACEABILITY.md) («Gestión de inventario», «Inventario consistente entre Admin y Storefront», «Productos e inventario obligatorios»); [contrato del BFF](../../../../../backend/docs/BFF-CONTRACT.md) (PUT /admin/snapshot)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador o vendedor (desde el lote 11, PBI-0170)
- **Quiero** actualizar el stock de los productos
- **Para** que la tienda venda solo lo que hay

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Stock compartido

- **Dado** que un usuario del Admin cambia el stock de un producto
- **Cuando** guarda el cambio
- **Entonces** el catálogo público muestra el stock nuevo.

### Escenario 02 – Guardado desactualizado

- **Dado** que hubo una venta u otro cambio después de que el Admin cargó los datos
- **Cuando** el usuario guarda
- **Entonces** el BFF rechaza el guardado por desactualizado; el Admin recarga, reaplica el cambio y conserva el stock vendido.

### Escenario 03 – Stock que no se puede guardar

- **Dado** que un usuario deja vacío el stock de un producto en Inventario o escribe un número con decimales
- **Cuando** sale del campo
- **Entonces** el stock no se guarda (antes, vacío era 0) y el campo dice qué escribir.

### Escenario 04 – Cambio de stock que choca con una venta

- **Dado** que hubo una venta después de que el Admin cargó los datos y el usuario cambió el stock de ese mismo producto
- **Cuando** guarda
- **Entonces** el Admin no pisa el stock vendido: no guarda y pide revisar los datos actuales. Si el usuario cambió otro campo, el Admin lo reaplica y conserva el stock vendido (Escenario 02).

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0120 y PBI-0127), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts`.

### Escenario 05 – Quién entra en Inventario

- **Dado** que una persona del equipo abre el backoffice
- **Cuando** busca Inventario en el menú o escribe `/inventario`
- **Entonces** entra si es superadministrador, administrador o, desde el lote 11 (PBI-0170), vendedor; Inventario tiene el panel de filtros (por nombre o SKU y por estado del stock).

> Añadido el 2026-11-15 por el lote 07 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0013 y PBI-0139). El 2026-11-18 Daniel pidió que el vendedor también gestione Inventario (PBI-0170; [decisiones pendientes](../../../PENDING-DECISIONS.md), «Permisos de los roles»). Cambiado el 2026-11-23 por el lote 11 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md)). Lo prueban `admin-acceso.spec.ts`, `admin-permisos.spec.ts` y `admin-listados.spec.ts`.

### Escenario 06 – El stock solo en Inventario

- **Dado** que un usuario del backoffice quiere cambiar el stock de un producto
- **Cuando** busca dónde hacerlo
- **Entonces** lo cambia en Inventario: el registro del producto ya no tiene «Stock» y remite a Inventario. Un producto nuevo empieza sin stock, y el BFF conserva el stock vigente cuando el registro del producto llega sin él.

> Añadido el 2026-11-24 por el lote 23 ([ADR-0025](../../../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); PBI-0226; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Revisión de la demo: inventario, stock y SKU»), sin especificación propia: lo prueban `inventario.rules.test.mjs`, `snapshot-cambios.use-cases.test.mjs` y `frontend/tests/e2e/admin-catalogo-filtros.spec.ts`. Antes de los lotes 11 y 23, el vendedor cambiaba el stock desde el registro de cada producto.
