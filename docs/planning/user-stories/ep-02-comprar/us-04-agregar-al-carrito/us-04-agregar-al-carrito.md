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

> Actualizado el 2026-11-13 por la feature [004](../../../../specs/features/004-ajustes-de-la-tienda/specification.md#ac-01--diálogo-al-agregar-al-carrito) (AC-01, PBI-0035), entregada con el [PR #26](https://github.com/sebastianaviladev01-xyz/WebStore/pull/26). Antes, la confirmación tenía tres opciones: Seguir comprando, Ver carrito y Finalizar compra.
