# US22 — Gestionar las tarifas de envío

- Épica: [EP07 — Operar la tienda](../ep-07-operar-tienda.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: tarifas de envío); [TRACEABILITY](../../../TRACEABILITY.md) («Tabla envío origen → destino», «Tarifas masivas»); [PENDING-DECISIONS](../../../PENDING-DECISIONS.md) («Volumen de tarifas de envío», cerrado)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador
- **Quiero** mantener la tabla de tarifas de envío por tienda de origen y distrito
- **Para** cobrar el envío correcto en el checkout

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Tarifa por origen y destino

- **Dado** que el administrador está en Tarifas de envío
- **Cuando** registra el precio de una tienda de origen a un distrito
- **Entonces** el checkout usa esa tarifa.

### Escenario 02 – Un precio para varios distritos

- **Dado** que el administrador elige una tienda de origen
- **Cuando** asigna un mismo precio a varios distritos a la vez, elegidos de una lista (desde el lote 21, PBI-0216)
- **Entonces** todas esas tarifas quedan con ese precio.

### Escenario 03 – Sin ajuste porcentual

- **Dado** que el administrador quiere subir o bajar las tarifas
- **Cuando** abre Tarifas de envío
- **Entonces** cambia el precio tarifa por tarifa: no hay ajuste porcentual.

> Cambiado el 2026-11-24 por el lote 21 ([ADR-0025](../../../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); PBI-0217; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Revisión de la demo: tarifas»): antes, un ajuste porcentual cambiaba las tarifas de una tienda de origen o de todas. Lo prueban `tarifa-envio.rules.spec.mjs` y `admin-mantenimientos.spec.ts`.

### Escenario 04 – Búsqueda y páginas

- **Dado** que la tabla tiene muchas tarifas
- **Cuando** el administrador busca por distrito u origen
- **Entonces** la búsqueda no distingue tildes y el listado se muestra en páginas de 25.

### Escenario 05 – Panel de filtros y sesión vencida

- **Dado** que el administrador busca tarifas o tiene un formulario a medias
- **Cuando** usa el panel de filtros, o la sesión vence y vuelve a ingresar
- **Entonces** la búsqueda y el origen quedan en la URL con «Buscar» y «Limpiar filtros», como en los demás listados; y lo escrito vuelve, con su modo (una tarifa o varios distritos; el ajuste porcentual se quitó en el lote 21).

> Añadido el 2026-11-15 por el lote 07b ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0155 y PBI-0157), sin especificación propia: lo prueba `frontend/tests/e2e/admin-funciones-nuevas.spec.ts`.

### Escenario 06 – Distrito de una lista, en una ventana

- **Dado** que el administrador registra o edita una tarifa
- **Cuando** pulsa «Agregar» o «Editar»
- **Entonces** lo hace en una ventana emergente y elige el distrito de una lista (los 43 de Lima Metropolitana y los 7 del Callao, más los que ya tienen tarifa): varios al crear y uno al editar. Sin distrito, la ventana no guarda y lo dice.

> Añadido el 2026-11-24 por el lote 21 ([ADR-0025](../../../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); PBI-0211 y PBI-0216; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Revisión de la demo: tarifas»), sin especificación propia: lo prueban `distrito.rules.spec.mjs` y `frontend/tests/e2e/admin-mantenimientos.spec.ts`.
