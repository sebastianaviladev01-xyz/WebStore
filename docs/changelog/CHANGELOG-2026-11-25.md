# Cambios — 2026-11-25: los hallazgos de los lotes 28 a 31, por lotes

Los lotes 28 a 31 ([ADR-0027](../adrs/0027-cerrar-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-20.md)) dejaron cuatro hallazgos en el backlog, PBI-0246 a PBI-0249. Sebastián Avila pidió cerrarlos el 2026-11-25, y se cerraron en cuatro lotes, como excepción al flujo SDD ([ADR-0029](../adrs/0029-cerrar-por-lotes-los-hallazgos-de-los-lotes-28-a-31.md)). Los lotes 33 a 35 se ejecutaron a la vez, cada uno con su rama, su PR y la auditoría de la sesión principal. Lo que cambia algo que ve Daniel queda como provisional, por confirmar con él, en las [decisiones pendientes](../planning/PENDING-DECISIONS.md).

- **Vigencia de los banners (lote 33, [PR #95](https://github.com/sebastianaviladev01-xyz/WebStore/pull/95)):**
  - El BFF rechaza en el inicio y el fin de un banner las fechas que no existen en el calendario, como el 30 de febrero. Antes las pasaba al mes siguiente.
  - Usa la misma comprobación que los avisos (PBI-0246).
- **Botón principal de los temas propios (lote 34, [PR #94](https://github.com/sebastianaviladev01-xyz/WebStore/pull/94)):**
  - En un tema propio con el principal casi igual a su color de contraste, el botón principal ahora cambia con el puntero encima, como en C ([ADR-0030](../adrs/0030-alejar-el-principal-fuerte-que-no-se-distingue-del-principal.md); PBI-0247).
  - A, B, C y los temas propios que ya cambiaban quedan idénticos.
  - El hueco de la ficha a 375 px (PBI-0248) se descartó: solo salía en la captura de página completa, no en una ventana real.
- **Tuerca del modo demo (lote 35, [PR #96](https://github.com/sebastianaviladev01-xyz/WebStore/pull/96)):**
  - En el panel del backoffice, la tuerca «Cambiar tema» pasa a la barra superior, a la izquierda de la campana. Ya no flota sobre el contenido ni tapa el «Eliminar» de Productos (PBI-0249).
  - En el acceso sigue flotando.
  - Sin el modo demo no cambia nada.
- **Cierre (lote 36):**
  - El backlog, las decisiones pendientes, la trazabilidad, la funcionalidad, el índice de features y este historial, al día.
  - Los hallazgos de los lotes registrados (PBI-0252 a PBI-0255).
  - El enlace del plan de la feature 003 a la ruta nueva de la tuerca.
  - El cierre de la excepción.

## Verificación

- **Cada lote:** `npm run verify` y la suite e2e completa, repetidos por la sesión principal en la punta de su rama, y las capturas antes y después cuando tocaba la interfaz. Las capturas se guardan en `frontend/output/visual-qa/lote-NN-*/` y no se versionan.
- **Lote 33:**
  - 34 pruebas de arquitectura, 425 del frontend, 748 del BFF y el smoke test, en verde.
  - e2e: 382 de 383. La que falló es la del registro del producto a 375 px, mientras otro lote compilaba en la misma máquina. Repetida sola tres veces, pasó las tres (PBI-0254).
- **Lote 34:**
  - 34 de arquitectura, 426 del frontend, 751 del BFF y el smoke test, en verde.
  - e2e: 383 de 383.
  - Capturas: solo cambia el botón con el puntero encima del tema propio que tenía el defecto.
- **Lote 35:**
  - 34 de arquitectura, 425 del frontend, 744 del BFF y el smoke test, en verde.
  - e2e: 391 de 391.
  - Capturas: sin el modo demo, 0 diferencias en 48 pares.
- **Lote 36:** los tres lotes juntos y los documentos.
  - `npm run validate:structure`, `npm run check:agents` y `npm run verify` en verde: 34 de arquitectura, 426 del frontend, 755 del BFF y el smoke test.
  - e2e: 391 de 391.

## Lo que queda abierto

- **Por confirmar con Daniel:** las decisiones provisionales de los lotes 34 y 35, y si la tuerca del backoffice se queda en el modo demo (PBI-0188).
- **Sin priorizar:** los hallazgos PBI-0252 a PBI-0254.
- **Lo que ya estaba fuera,** con su motivo en el [backlog](../planning/backlog.md) ([cierre de ADR-0029](../adrs/0029-cerrar-por-lotes-los-hallazgos-de-los-lotes-28-a-31.md#cierre)).
