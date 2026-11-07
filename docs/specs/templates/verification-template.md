# NNN. Título de la feature — Verificación

- Feature: `NNN-slug`
- Tareas: [tasks.md](tasks.md)

<!-- Reemplaza cada texto de ejemplo. Al copiar esta plantilla a docs/specs/features/NNN-slug/, añade un "../" a cada enlace relativo (el enlace a tasks.md ya es correcto). Nunca registres como ejecutado algo que no se ejecutó. -->

## Revisión

| Dato | Valor |
|---|---|
| Rama y commit | … |
| Fecha | AAAA-MM-DD |
| Entorno | Sistema operativo, versión de Node y de npm (leídas con `node --version` y `npm --version`), navegador si hubo QA visual o e2e |
| Datos | Archivo de estado usado (copia con `WEBSTORE_DATA_FILE` o temporal); nunca `backend/data.json` |

## Ejecución por tarea

Durante la implementación, cada tarea añade aquí una fila breve en su mismo commit ([guía](../../development/agent-execution.md#evidencia-en-el-commit-de-la-tarea)). Una línea por control. La primera línea de cada tarea dice con qué se ejecutó: herramienta, modelo real, esfuerzo y si fue delegada. El SHA se rellena en un commit `docs` al cerrar la fase. `sdd-verify` completa el resto del documento a partir de estas filas.

| Tarea | Commit | Control | Resultado | Ejecutado con |
|---|---|---|---|---|
| TASK-01 | (se rellena al cerrar la fase) | `npm run verify` | … | … |

## Estado de los controles

| Control | Documentado | Configurado | Ejecutado |
|---|---|---|---|
| Sintaxis del BFF (`check:syntax`) | … | … | … |
| Formato (`format:check`) | … | … | … |
| Lint y límites de arquitectura | … | … | … |
| Pruebas unitarias | … | … | … |
| Pruebas de integración y contrato del BFF | … | … | … |
| Pruebas E2E | … | … | … |
| Build de Storefront y Admin | … | … | … |
| Capturas antes y después | … | … | … |
| Auditoría de dependencias | … | … | … |
| CI | … | … | … |

## Resultados de las pruebas

| ID | AC | Comando | Resultado | Evidencia |
|---|---|---|---|---|
| TEST-01 | AC-xx | … | Pasa / Falla / No ejecutado (motivo) | … |

## Capturas antes y después

| Pantalla o ruta | Anchos | Resultado | Evidencia |
|---|---|---|---|
| … | … | Iguales / Cambios pedidos / No aplica | … |

## Cumplimiento TDD

| Área | TDD obligatorio | Prueba antes del código | Evidencia |
|---|---|---|---|
| … | Sí / No | Sí / No / No aplica | Commit o PR |

## Trazabilidad

| REQ | AC | TASK | Commit o PR | TEST | Resultado |
|---|---|---|---|---|---|
| REQ-01 | AC-01 | TASK-01 | … | TEST-01 | … |

## Definition of Done

Marca solo lo que se cumple ([criterios](../../development/definition-of-done.md)).

- [ ] …

## Riesgos remanentes y excepciones

- …

## Hito de entrega

pendiente | aprobado por <persona> el AAAA-MM-DD
