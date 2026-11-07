# US05 — Gestionar el carrito

- Épica: [EP02 — Comprar](../ep-02-comprar.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Storefront: carrito, IGV); [TRACEABILITY](../../../TRACEABILITY.md) («Carrito agregar/ver/cambiar/eliminar», «Valor de venta e IGV explícitos»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Storefront: carrito con cantidad, eliminación, valor de venta, IGV y subtotal)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** comprador
- **Quiero** cambiar cantidades, eliminar productos y ver el valor de venta y el IGV
- **Para** saber cuánto voy a pagar

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Cambiar y eliminar

- **Dado** que el carrito tiene productos
- **Cuando** el comprador cambia una cantidad o elimina un producto
- **Entonces** el carrito recalcula el valor de venta, el IGV y el subtotal.

### Escenario 02 – Precio y stock vigentes

- **Dado** que el comprador dejó productos en el carrito de su dispositivo
- **Cuando** vuelve a abrir el carrito después de un cambio de precio o de stock en el catálogo
- **Entonces** el carrito usa el precio y el stock vigentes del catálogo.
