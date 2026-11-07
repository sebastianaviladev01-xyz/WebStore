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
- **Entonces** la tienda muestra una confirmación con las opciones Seguir comprando, Ver carrito y Finalizar compra.
