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
- **Cuando** asigna un mismo precio a varios distritos a la vez
- **Entonces** todas esas tarifas quedan con ese precio.

### Escenario 03 – Ajuste porcentual

- **Dado** que el administrador quiere subir o bajar las tarifas
- **Cuando** aplica un ajuste porcentual a una tienda de origen o a todas
- **Entonces** las tarifas afectadas cambian en ese porcentaje.

### Escenario 04 – Búsqueda y páginas

- **Dado** que la tabla tiene muchas tarifas
- **Cuando** el administrador busca por distrito u origen
- **Entonces** la búsqueda no distingue tildes y el listado se muestra en páginas de 25.

### Escenario 05 – Panel de filtros y sesión vencida

- **Dado** que el administrador busca tarifas o tiene un formulario a medias
- **Cuando** usa el panel de filtros, o la sesión vence y vuelve a ingresar
- **Entonces** la búsqueda y el origen quedan en la URL con «Buscar» y «Limpiar filtros», como en los demás listados; y lo escrito vuelve, con su modo (una tarifa, varios distritos o el ajuste porcentual).

> Añadido el 2026-11-15 por el lote 07b ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0155 y PBI-0157), sin especificación propia: lo prueba `frontend/tests/e2e/admin-funciones-nuevas.spec.ts`.
