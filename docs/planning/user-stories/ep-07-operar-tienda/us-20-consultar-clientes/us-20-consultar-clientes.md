# US20 — Consultar clientes

- Épica: [EP07 — Operar la tienda](../ep-07-operar-tienda.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: clientes); [TRACEABILITY](../../../TRACEABILITY.md) («Clientes de guest visibles en Admin», «Cliente ≠ usuario»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: clientes, incluidos los creados por checkout guest)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador
- **Quiero** ver a los clientes de la tienda, también a los que compraron como invitados
- **Para** conocer a quién vendo

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Clientes del checkout

- **Dado** que un comprador terminó una compra, con o sin cuenta
- **Cuando** el administrador abre Clientes
- **Entonces** ve al cliente creado o actualizado por el checkout.

### Escenario 02 – Modo de edición

- **Dado** que el administrador pulsa «Editar» en un cliente
- **Cuando** mira el formulario
- **Entonces** el título dice «Editar cliente» y puede volver a «Nuevo cliente» con «Cancelar»; si elimina el cliente que edita, el formulario sale de la edición y «Guardar» no lo vuelve a crear.

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0122 y PBI-0130), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts`.

### Escenario 03 – Registro en una ventana

- **Dado** que el administrador está en Clientes
- **Cuando** pulsa «Agregar» o «Editar»
- **Entonces** registra el cliente en una ventana emergente con título, que atrapa el foco y se cierra con Escape, en vez del formulario al costado de la lista; cerrarla descarta lo escrito.

> Añadido el 2026-11-24 por el lote 21 ([ADR-0025](../../../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); PBI-0211; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Revisión de la demo: mantenimientos»), sin especificación propia: lo prueba `frontend/tests/e2e/admin-mantenimientos.spec.ts`. Cambia el Escenario 02: el título y «Cancelar» son los de la ventana.
