# 0004. Adoptar la estructura de repositorio de IdShield

- Estado: Aceptada
- Fecha: 2026-11-06

## Contexto

### Por qué había que decidir

WebStore iba a subirse a GitHub y no era un repositorio: todo vivía en `webstore-angular/`, con el BFF de prueba en `tools/mock-bff/`, la documentación mezclada con la aplicación y unos 400 MB de carpetas de herramientas de IA y capturas de QA. El equipo ya trabaja con IdShield, que tiene una estructura probada.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Estructura de IdShield (elegida)** | Raíz con `frontend/`, `backend/`, `docs/`, `.agents/`, `.claude/`, `.github/`; cada aplicación con `architecture.md`, `AGENTS.md` y `CLAUDE.md`; el mismo proceso SDD + TDD | Misma forma y mismo proceso que otro proyecto del equipo | Mover archivos y adaptar documentos |
| Versionar `webstore-angular/` tal cual | Subir la carpeta actual como raíz | Sin cambios | El BFF queda dentro del frontend y la documentación sin orden |

## Decisión

Usaremos la estructura de IdShield. Lo que existe en IdShield y no en WebStore se adapta o se omite, sin dejar carpetas vacías:

| Pieza de IdShield | En WebStore | Motivo |
|---|---|---|
| `database/` (modelo DBML, estándar y scripts SQL) | No aplica | WebStore no tiene base de datos propia: el BFF de prueba guarda el estado en `backend/data.json`. Se creará con su estándar cuando exista el BFF productivo. |
| `devops/` (Azure, checks de shell, PowerShell) | No aplica, salvo la comprobación de agentes | No hay despliegue ni infraestructura. La comprobación de la configuración de agentes vive en `tools/check-agents.mjs`. |
| `.github/workflows/deploy.yml` y `deploy-environment.yml` | No aplica | No hay entornos desplegados; el CI solo verifica (`ci.yml`, con los jobs `verify` y `e2e`). |
| `docs/architecture/logical-architecture.png` | Adaptado: diagrama en texto en [`docs/architecture/README.md`](../architecture/README.md#topología) | La topología de WebStore cabe en un diagrama de texto que se mantiene junto al documento. |
| ADR de IdShield sobre su dominio y su infraestructura (modelo de documento y proceso, .NET, xUnit, cookie y XSRF, Azure, PostgreSQL) | No aplica | Son decisiones de otro producto. Las de proceso y estructura tienen su equivalente: 0001, 0002, 0003, 0005, 0006, 0007, 0008 y 0009. |
| `compose.yaml`, `Containerfile*`, `.dockerignore` (Podman) | No aplica | Los comandos se ejecutan en el host con Node y npm ([entorno local](../development/local-environment.md)). |
| `backend/*.slnx`, `Directory.*.props`, `global.json` (.NET) | Adaptado: `backend/package.json` | El BFF de prueba es Node.js sin dependencias ([ADR-0007](0007-organizar-el-bff-en-capas.md)). |
| `frontend/server/` y `playwright.server.config.ts` (servidor Node de producción) | No aplica | WebStore no tiene despliegue; el SSR/SEO es una evolución acordada para después ([vista de sistema](../architecture/README.md#seo--ssr)). |
| `frontend/config/bff/` y `public/config.json` (modo local o BFF en tiempo de ejecución) | No aplica | WebStore no tiene modo local: siempre usa el BFF por `/bff`. |
| `frontend/proxy.conf.mjs` | Adaptado: `frontend/proxy.conf.json` | Proxy fijo hacia el BFF de prueba. |
| `frontend/.prettierrc.json` | Adaptado: `.prettierrc.json` en la raíz | Un solo formato para frontend, backend y herramientas. |
| `frontend/vitest.config.ts` | Adaptado: `node:test` | Ver ADR-0009. |
| `frontend/docs/` de IdShield (auditorías, inventario Figma, prototipo) | Adaptado: `frontend/docs/` con los documentos de WebStore | Cada proyecto documenta su propio origen y validación. |

Se versionan `.claude/` y `.agents/`. Quedan fuera de git las demás carpetas de herramientas de IA, `frontend/output/`, `frontend/design/` y `backend/data.json`.

*Motivo:* una estructura y un proceso conocidos por el equipo, con cada aplicación autocontenida y la documentación separada por alcance.

## Consecuencias

- Los comandos se ejecutan desde la raíz (scripts que delegan en cada aplicación) o desde cada carpeta.
- Las rutas de los documentos históricos (`docs/changelog/`) quedan como estaban: describen el código de su fecha.
- Los originales de diseño y las capturas de QA solo existen en disco y en el respaldo local `WebStore-backup-2026-11-06`.
