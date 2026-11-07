# 0009. Usar node:test y Playwright para las pruebas

- Estado: Aceptada
- Fecha: 2026-11-06

## Contexto

### Por qué había que decidir

WebStore ya tenía pruebas con `node:test` (unitarias del frontend, límites de arquitectura y BFF), pero ninguna decisión las respaldaba y faltaban las e2e: el [`frontend/architecture.md` §6](../../frontend/architecture.md#6-pruebas) las dejaba pendientes. IdShield, la referencia de estructura ([ADR-0004](0004-adoptar-la-estructura-de-repositorio-de-idshield.md)), separa las pruebas del backend en unitarias e integración (su ADR-0010) y prueba el frontend de extremo a extremo con Playwright en `frontend/tests/e2e/`.

### Opciones

Para las pruebas unitarias y de integración:

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **`node:test` y `node:assert` (elegida)** | Seguir con el runner incluido en Node, en el frontend y en el BFF | Sin dependencias: el BFF sigue sin `package-lock.json` ([ADR-0007](0007-organizar-el-bff-en-capas.md)); las pruebas existentes no cambian | Sin entorno DOM ni utilidades de Angular; menos ayudas que un runner dedicado |
| Vitest, como el frontend de IdShield | Añadir Vitest al frontend y al BFF | Mismo runner que IdShield; modo watch y entorno DOM | Dependencia nueva en el BFF y migración de las pruebas existentes sin beneficio inmediato |
| Jest | Añadir Jest | Muy conocido | Más configuración para ESM y TypeScript; no lo usa IdShield |

Para las pruebas e2e:

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Playwright (elegida)** | `@playwright/test` como dependencia de desarrollo del frontend, con specs en `frontend/tests/e2e/` | Lo mismo que el frontend de IdShield; auto-espera, localizadores por rol y servidores declarados en `webServer` | Una dependencia más; la CI descarga Chromium |
| Seguir con los scripts CDP de `frontend/tools/qa/` | Ampliar los scripts de QA visual | Sin dependencias | Sin runner, aserciones ni reportes; difíciles de mantener como suite |
| Cypress | Añadir Cypress | Buena experiencia interactiva | No lo usa IdShield; dos aplicaciones en orígenes distintos (Storefront y Admin) complican los recorridos que cruzan ambas |

## Decisión

Usaremos:

- **`node:test` y `node:assert`** para las pruebas unitarias del frontend (`*.spec.mjs` junto al código), los límites de arquitectura (`frontend/tests/architecture/`) y el BFF, dividido como en IdShield en `backend/tests/unit/` y `backend/tests/integration/` ([`backend/architecture.md` §4](../../backend/architecture.md#4-pruebas)).
- **Playwright** para las e2e del Storefront y del Admin (`npm run test:e2e` desde `frontend/`), contra el BFF de prueba real con un archivo de estado temporal y en puertos dedicados ([`frontend/architecture.md` §6](../../frontend/architecture.md#6-pruebas)). En local usa el Google Chrome instalado; en la CI, el Chromium que instala Playwright.

La versión exacta de Playwright vive solo en `frontend/package.json`.

*Motivo:* `node:test` cubre lo que hoy se prueba sin añadir dependencias, y mantiene el BFF sin ellas; Playwright es la herramienta e2e de IdShield y prueba los recorridos reales de ambas aplicaciones con el mismo BFF.

## Consecuencias

**Lo que se vuelve más fácil:**

- Los recorridos de la [matriz de trazabilidad](../planning/TRACEABILITY.md) (compra como invitado, cuenta, reclamos, CMS y roles del Admin) se comprueban de punta a punta en cada cambio, también en la CI (job `e2e`).
- Las e2e no tocan `backend/data.json` ni los servidores de desarrollo (3000, 4200 y 4300).
- `npm test` sigue siendo rápido y sin navegador: las e2e corren aparte.

**Lo que se vuelve más difícil:**

- Las e2e tardan más que el resto (compilan Storefront y Admin con `ng serve`) y la CI descarga Chromium en cada ejecución.
- Los recorridos comparten el estado del BFF y se ejecutan en serie; una spec que cambie la configuración debe dejarla como estaba.
- Las specs dependen de los textos y roles visibles: un cambio de copy obliga a actualizarlas.

**Fuera de alcance:**

- Las pruebas de componentes con un entorno DOM siguen pendientes. Requieren elegir el entorno (por ejemplo, Vitest con jsdom o el runner de Angular) y se decidirán en otro ADR.
- Las pruebas de regresión visual: las capturas siguen en los scripts de [`frontend/tools/qa/`](../../frontend/tools/qa/).

## Referencias

- [Node.js — Test runner](https://nodejs.org/api/test.html)
- [Playwright — Web server](https://playwright.dev/docs/test-webserver)
- [Playwright — Locators](https://playwright.dev/docs/locators)
