# US04 — Agregar un producto al carrito

- Épica: [EP02 — Comprar](../ep-02-comprar.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Storefront: carrito); [TRACEABILITY](../../../TRACEABILITY.md) («Confirmación al agregar al carrito»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Storefront: confirmación al añadir)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** comprador
- **Quiero** agregar un producto al carrito y ver una confirmación
- **Para** decidir si sigo comprando o termino la compra

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Confirmación al agregar

- **Dado** que un producto tiene stock
- **Cuando** el comprador lo agrega al carrito
- **Entonces** la tienda muestra la confirmación «Producto agregado» con dos opciones, Seguir comprando y Ver carrito, en ese orden, y Ver carrito como botón principal.

> Actualizado el 2026-11-13 por la feature [004](../../../../specs/features/004-ajustes-de-la-tienda/specification.md#ac-01--diálogo-al-agregar-al-carrito) (AC-01, PBI-0035), entregada con el [PR #26](https://github.com/sebastianaviladev01-xyz/WebStore/pull/26). Antes, la confirmación tenía tres opciones: Seguir comprando, Ver carrito y Finalizar compra. Desde el lote 04 (PBI-0076), al abrirse la confirmación el foco está en Ver carrito.

### Escenario 02 – Sin stock para agregar

- **Dado** que el carrito ya tiene todas las unidades disponibles de un producto, o solo cabe una parte de las pedidas
- **Cuando** el comprador lo agrega otra vez
- **Entonces** la confirmación no dice «Producto agregado» si no se agregó nada: dice «No se agregaron unidades» y cuántas tiene ya; si se agregó una parte, dice cuántas de las pedidas entraron.

> Añadido el 2026-11-14 por el lote 04 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0065, decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md), confirmada por Daniel el 2026-11-20), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-carrito-checkout.spec.ts`.

### Escenario 03 – Productos sugeridos

- **Dado** que el comprador agregó un producto
- **Cuando** ve la confirmación
- **Entonces** la tienda le sugiere, bajo «También te puede interesar», hasta tres productos de la misma categoría con stock, que llevan a su ficha.

> Añadido el 2026-11-15 por el lote 05 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0039, decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md), confirmada por Daniel el 2026-11-20; el panel lateral es PBI-0179), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-catalogo-accesibilidad.spec.ts`.

### Escenario 04 – Sugeridos en un panel lateral

- **Dado** que la configuración de la tienda eligió «En un panel lateral»
- **Cuando** el comprador agrega un producto
- **Entonces** la confirmación y los sugeridos se muestran en un panel lateral en lugar del diálogo; por defecto sigue el diálogo.

> Añadido el 2026-11-23 por el lote 16 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0179; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueban `frontend/tests/e2e/storefront-checkout-panel.spec.ts` y `admin-contenido.spec.ts`.
