# US16 — Gestionar el inventario

- Épica: [EP06 — Administrar el catálogo](../ep-06-administrar-catalogo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: inventario); [TRACEABILITY](../../../TRACEABILITY.md) («Gestión de inventario», «Inventario consistente entre Admin y Storefront», «Productos e inventario obligatorios»); [contrato del BFF](../../../../../backend/docs/BFF-CONTRACT.md) (PUT /admin/snapshot)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador (el vendedor cambia el stock desde la ficha de cada producto, en Productos)
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

- **Dado** que un vendedor abre el Admin
- **Cuando** busca Inventario en el menú o escribe `/inventario`
- **Entonces** no lo ve y la ruta lo lleva al Resumen; el stock lo cambia en la ficha del producto. El superadministrador y el administrador entran en Inventario, que tiene el panel de filtros (por nombre o SKU y por estado del stock).

> Añadido el 2026-11-15 por el lote 07 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0013 y PBI-0139). Provisional, por confirmar con Daniel ([decisiones pendientes](../../../PENDING-DECISIONS.md), «Permisos de los roles»). Lo prueban `admin-acceso.spec.ts` y `admin-listados.spec.ts`.
