# US16 — Gestionar el inventario

- Épica: [EP06 — Administrar el catálogo](../ep-06-administrar-catalogo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: inventario); [TRACEABILITY](../../../TRACEABILITY.md) («Gestión de inventario», «Inventario consistente entre Admin y Storefront», «Productos e inventario obligatorios»); [contrato del BFF](../../../../../backend/docs/BFF-CONTRACT.md) (PUT /admin/snapshot)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador o vendedor
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
