# US15 — Gestionar productos

- Épica: [EP06 — Administrar el catálogo](../ep-06-administrar-catalogo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: productos); [TRACEABILITY](../../../TRACEABILITY.md) («Gestión de productos», «Detalle de producto (fotos, descripción, características)», «Vendedor»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: productos; roles)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador o vendedor
- **Quiero** crear, editar y eliminar productos y sus fotos
- **Para** que la tienda muestre un catálogo correcto

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Cambios publicados en la tienda

- **Dado** que un administrador crea, edita o elimina un producto
- **Cuando** guarda el cambio
- **Entonces** el catálogo público refleja el cambio.

### Escenario 02 – Fotos adicionales

- **Dado** que un administrador o un vendedor edita un producto
- **Cuando** agrega fotos por URL o cargando un archivo (el Admin lo reduce antes de guardarlo; lote 06, PBI-0119)
- **Entonces** la ficha del producto muestra esas fotos después de la imagen principal.

### Escenario 03 – Alcance del vendedor

- **Dado** que un vendedor edita la ficha de un producto existente
- **Cuando** intenta crear o eliminar productos, o cambiar SKU, precio, categoría, marca o estado activo
- **Entonces** el Admin no lo permite; el BFF rechaza crear o eliminar y conserva del servidor los demás campos.

### Escenario 04 – Fotos que no bloquean el guardado

- **Dado** que un usuario del Admin carga una foto grande o el catálogo ya tiene muchas fotos guardadas
- **Cuando** guarda un producto o su stock
- **Entonces** la foto se reduce y se comprime antes de guardarse (o se rechaza con un motivo si aun así no cabe), y el guardado lleva solo lo que cambió, sin las fotos de los demás productos.

### Escenario 05 – SKU y dirección de ficha únicos

- **Dado** que ya hay un producto con ese SKU, o con un nombre que da la misma dirección de ficha (sin contar mayúsculas ni tildes)
- **Cuando** el usuario guarda otro producto con ese SKU o ese nombre
- **Entonces** el Admin no lo envía y dice, junto al campo, qué producto ya lo usa; el BFF también lo rechaza.

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0119, PBI-0129 y PBI-0142), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts`.

## Fuera de alcance y pendientes

- Los permisos exactos del vendedor están pendientes de confirmar (PBI-0013 del [backlog](../../../backlog.md)).
