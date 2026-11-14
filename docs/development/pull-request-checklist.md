# Revisión de PR

Se aplica a todo incremento listo para integrar. Es obligatoria según [STD-13, STD-16, STD-17 y STD-18](../architecture/standards.md). Revisar primero el resultado y el riesgo del cambio.

| Revisión | Evidencia requerida |
|---|---|
| Flujo y título | Origen y destino según la [convención de ramas y pull requests](../git/conventional-pull-requests.md#política-de-pull-requests); título y commits según la [convención de commits](../git/conventional-commits.md). El PR de una feature es [uno solo](../architecture/development-workflow.md#un-pull-request-por-feature): trae todas sus etapas y sus hitos registrados, con el de entrega aprobado. |
| Problema y alcance | REQ/AC/TASK enlazados (o el requisito de [`TRACEABILITY.md`](../planning/TRACEABILITY.md) y el ADR), comportamiento esperado y exclusiones. |
| Diseño | Capas y dependencias entre features respetadas (Sheriff y ESLint en verde sin desactivar reglas), dependencias justificadas y ADR si cambia una decisión. |
| TDD | En áreas obligatorias, el diff o los commits muestran la prueba antes de la implementación; código existente modificado con prueba de caracterización. |
| Contrato y datos | Compatibilidad del contrato del BFF, validación en servidor, autorización por rol y migración del estado (`schemaVersion`) según el alcance. `BFF-CONTRACT.md` y el smoke test cambian con el contrato. |
| Verificación | Comandos reales (`npm run verify` y, si aplica, `npm run test:e2e` y `npm run audit:all`), revisión, entorno y resultados; fallos y controles no ejecutados explícitos. |
| UI | Capturas antes y después en escritorio y móvil, sin cambios visuales no pedidos; teclado, foco, labels y consola sin errores. |
| Datos y secretos | Sin credenciales, hosts ni datos personales reales; `backend/data.json` sin versionar ni modificar por las pruebas. |

Los cambios de alto impacto requieren revisión adicional según el [flujo de trabajo](../architecture/development-workflow.md#disparadores-de-revisión-adicional). El hito de entrega funcional requiere aceptación humana; las revisiones rutinarias se agrupan por incremento.
