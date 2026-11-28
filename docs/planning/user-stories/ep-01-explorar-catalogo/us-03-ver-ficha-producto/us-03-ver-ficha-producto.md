# US03 — Ver la ficha de un producto

- Épica: [EP01 — Explorar el catálogo](../ep-01-explorar-catalogo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Storefront: detalle de producto, stock); [TRACEABILITY](../../../TRACEABILITY.md) («Detalle de producto (fotos, descripción, características)», «Stock visible y compra bloqueada sin stock»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Storefront: PDP con precio, descripción, características y stock; compra bloqueada sin stock)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** comprador
- **Quiero** ver el precio, las fotos, la descripción, las características y el stock de un producto
- **Para** decidir si lo compro

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Detalle del producto

- **Dado** que el comprador abre la ficha de un producto
- **Cuando** la ficha carga
- **Entonces** muestra el precio, la descripción, las características, el stock y una galería con miniaturas de sus fotos.

### Escenario 02 – Producto sin stock

- **Dado** que un producto no tiene stock
- **Cuando** el comprador lo ve en la tarjeta o en la ficha
- **Entonces** la tienda indica que no hay stock y no permite comprarlo.

### Escenario 03 – Ampliar la foto

- **Dado** que el comprador está en la ficha de un producto
- **Cuando** pulsa la foto principal (con el cursor de ampliar y una lupa en la esquina; su nombre accesible empieza con «Ampliar foto»)
- **Entonces** se abre la foto grande en una vista ampliada con el nombre del producto; con varias fotos, «Foto anterior», «Foto siguiente» y las flechas del teclado recorren la galería y dan la vuelta, y el conteo dice «Foto N de M»; con una sola, no hay flechas. Esc o «Cerrar foto ampliada» la cierran, la ficha queda en la última foto vista y el foco vuelve a la foto. A 375 px ocupa toda la pantalla.

> Añadido el 2026-11-27 por el lote 52 ([ADR-0037](../../../../adrs/0037-cerrar-por-lotes-los-pendientes-que-no-dependen-de-terceros.md); PBI-0282; decisión de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Lotes 50 a 56»), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-orden-y-foto-ampliada.spec.ts`.
