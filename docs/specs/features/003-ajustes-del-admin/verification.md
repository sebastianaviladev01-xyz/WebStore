# 003. Ajustes del Admin — Verificación

- Feature: `003-ajustes-del-admin`
- Tareas: [tasks.md](tasks.md)

## Revisión

| Dato | Valor |
|---|---|
| Rama y commit | `feature/003-ajustes-del-admin`, base `f8278e9` (`dev`). Commit final: se rellena en `sdd-verify` |
| Fecha | 2026-11-12 (inicio de la implementación) |
| Entorno | Windows 10 Pro 10.0.19045, Node v24.20.0, npm 11.19.0 (leídas con `node --version` y `npm --version`); Google Chrome instalado (headless, con Playwright `channel: 'chrome'`) para las capturas y el e2e |
| Datos | Capturas: copia `backend/data-capturas.json` (creada desde la semilla), con el BFF del worktree en 3400. E2E: archivo temporal de Playwright. Nunca `backend/data.json`: su sha256 en el checkout principal es `38154861…ab530c1` antes y después de TASK-01 |

## Ejecución por tarea

Durante la implementación, cada tarea añade aquí una fila breve en su mismo commit ([guía](../../../development/agent-execution.md#evidencia-en-el-commit-de-la-tarea)). Una línea por control. La primera línea de cada tarea dice con qué se ejecutó: herramienta, modelo real, esfuerzo y si fue delegada. El SHA se rellena en un commit `docs` al cerrar la fase. `sdd-verify` completa el resto del documento a partir de estas filas.

| Tarea | Commit | Control | Resultado | Ejecutado con |
|---|---|---|---|---|
| TASK-01 | (se rellena al cerrar la fase) | Ejecución | Sin delegar: la hizo la sesión del bloque. Worktree `.worktrees/003-ajustes-del-admin` creado de nuevo desde `dev` con `git worktree add -b` | Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`), nivel estándar; el esfuerzo de la sesión no se pudo leer (el catálogo pide medio); sin delegar |
| TASK-01 | | `npm run setup` | `exit 0`; `found 0 vulnerabilities` | ídem |
| TASK-01 | | Capturas «antes» | 18 capturas (`/login`, `/` y `/productos`, a 1440 y 375 px, con A, B y C) en `frontend/output/visual-qa/003-ajustes-del-admin/antes/{a,b,c}`, con `LEEME.md` (SHA base `f8278e9`, rutas, anchos, temas, método y fecha). Método: Playwright con Chrome instalado, guion `capturar.mjs`; los temas A y C se activaron con `activar-tema.mjs` por la API del Admin. Sin modo demo | ídem |
| TASK-01 | | Consola de la base | Una sola entrada por tema, `login-1440`: `Failed to load resource: … 404 (Not Found)`. Ninguna a 375 px ni en `/` y `/productos`. Quedan como línea base de TASK-07 | ídem |
| TASK-01 | | Hecho de la base | `/productos` a 375 px desborda en horizontal ya en la base (los tres temas); las comprobaciones de «sin desborde» de las tareas siguientes se hacen sobre `/` y `/perfil` | ídem |
| TASK-01 | | Datos y servidores | sha256 de `backend/data.json` del checkout principal igual antes y después (`38154861…ab530c1`); tema B activo en `backend/data-capturas.json` (`"activeThemeId": "b"`); BFF (3400) y Admin (4500) detenidos y puertos 3400, 4400 y 4500 libres antes del e2e | ídem |
| TASK-01 | | E2E completo (línea base) | `npm run test:e2e` (desde `frontend/`, en segundo plano, con los servidores del worktree detenidos y los servidores propios de Playwright en 3400, 4400 y 4500): `59 passed (2.6m)`, 0 fallos, exit 0, sobre `f8278e9`. Después: puertos libres y sha256 de `backend/data.json` sin cambios. Es la caracterización de `AppLayout` y `ResumenPage` | ídem |
| TASK-02 | (se rellena al cerrar la fase) | Ejecución | Sin delegar: la hizo la sesión del bloque (TDD de una regla pura; el brief habría repetido el diseño) | Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`), nivel estándar; el esfuerzo de la sesión no se pudo leer (el catálogo pide alto); sin delegar |
| TASK-02 | | TEST-01 rojo | `node --test projects/admin/src/app/features/sesion/domain/usuario-admin.rules.spec.mjs` (desde `frontend/`). Sin el módulo, el spec falla al cargar (`ENOENT`), que no cuenta como rojo. Con un esqueleto que devuelve `''`: `tests 11`, `pass 1`, `fail 10`, los 10 por aserción (`actual: ''`, `expected: 'SD'`…); el que pasa es «sin nombre ni correo → `''`», que el esqueleto ya cumple | ídem |
| TASK-02 | | TEST-01 verde | Con `inicialesDeUsuario` (NFC, palabras separadas por `\s+`, primera letra por punto de código, primera y última palabra, correo si no hay nombre): `tests 11`, `pass 11`, `fail 0`. Casos: «SD», «VD», «AT», «C», «ÁR» (también con `Ángel` descompuesto), «ÑP», varios espacios, letra fuera del BMP, correo con nombre vacío o de espacios y `''` sin nombre ni correo | ídem |
| TASK-02 | | TEST-02 | Sonda nueva en `frontend/tests/architecture/boundaries.test.mjs` (`layout del Admin`): el layout del Admin no puede importar `features/sesion/presentation/` (una violación de `dependency-rule`) y sí `features/sesion/application/`. `node --test tests/architecture/boundaries.test.mjs`: `tests 29`, `pass 29`, `fail 0`. Sensibilidad: con la importación prohibida añadida un momento a `layout/app.layout.ts`, `eslint` da `Tag layer:layout has no clearance for tags app:admin, feature:sesion, layer:presentation` (`@softarc/sheriff/dependency-rule`); el archivo se restauró y no queda en el diff | ídem |
| TASK-02 | | `npm run verify` | Desde la raíz, sobre el árbol del commit: exit 0. Arquitectura `29 pass`, pruebas unitarias del frontend `83 pass` (incluye las 11 de TEST-01), BFF `110 pass`, build de Storefront y Admin, `validate-structure` y contrato en verde | ídem |
| TASK-02 | | Prettier | `prettier --write` sobre `usuario-admin.rules.ts`, `usuario-admin.rules.spec.mjs` y `boundaries.test.mjs`; `All matched files use Prettier code style!` | ídem |
| TASK-02 | | E2E y capturas | No aplican: la tarea no toca plantillas, rutas, estilos ni datos (columnas E2E y Capturas: `No`). Sin servidores levantados; sin `localStorage`, `sessionStorage` ni cookie nuevos en el diff | ídem |
