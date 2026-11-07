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
