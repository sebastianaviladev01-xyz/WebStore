# Cambios — 2026-11-06: reestructuración con la forma de IdShield

Sin cambios funcionales ni visuales. El repositorio adopta la estructura, las capas y las convenciones de IdShield y queda listo para GitHub.

- **Respaldo previo:** `D:\Work\Simplesoft\source\github\WebStore-backup-2026-11-06` (sin `node_modules`, `dist` ni `.angular`), con sus notas de verificación en `_BACKUP-NOTES.md`.
- **Repositorio:** `webstore-angular/` pasa a `frontend/`; el BFF de prueba (`tools/mock-bff/`) pasa a `backend/`; la documentación se reparte entre `docs/`, `frontend/docs/` y `backend/docs/` ([ADR-0004](../adrs/0004-adoptar-la-estructura-de-repositorio-de-idshield.md)).
- **Frontend:** features con capas internas `domain/application/data/presentation`, puertos como clases abstractas, límites con Sheriff y ESLint, y una prueba que comprueba esos límites ([ADR-0006](../adrs/0006-organizar-el-frontend-por-features-y-capas.md)). Nombres de negocio en español ([ADR-0003](../adrs/0003-usar-espanol-para-el-vocabulario-de-negocio.md)).
- **BFF:** separado en `domain/application/infrastructure/api`, con el mismo contrato ([ADR-0007](../adrs/0007-organizar-el-bff-en-capas.md)).
- **Tailwind:** cada aplicación analiza solo su propio código; antes también leía documentos y carpetas de herramientas de IA, lo que hacía variar el CSS entre equipos.
- **Repositorio Git:** `.gitignore`, `.gitattributes`, README, `AGENTS.md`, CI y plantilla de PR.
- **Flujo de agentes de IdShield:** `.agents/` (README, adaptadores de Claude Code y Codex, catálogo de niveles y los 10 skills del flujo), espejo en `.claude/skills/` y `npm run check:agents` ([ADR-0008](../adrs/0008-trabajar-con-claude-code-o-codex-mediante-adaptadores.md)).
- **Proceso:** `docs/development/`, `docs/git/`, estándares, glosario y flujo SDD + TDD en `docs/architecture/`, plantillas de specs, backlog e historias de usuario ([ADR-0001](../adrs/0001-registrar-decisiones-de-arquitectura.md), [ADR-0002](../adrs/0002-adoptar-sdd-y-tdd.md), [ADR-0005](../adrs/0005-adoptar-convenciones-de-versionamiento-y-entrega.md)).
- **Pruebas:** el BFF separa `tests/unit` y `tests/integration`; 31 pruebas e2e con Playwright para Storefront y Admin ([ADR-0009](../adrs/0009-usar-node-test-y-playwright-para-las-pruebas.md)).

## Verificación

- Capturas y DOM de 36 pantallas (Storefront y Admin, a 1440 y 390 px) iguales antes y después. La única diferencia de píxeles fue el carrusel del inicio en móvil, que ya alternaba entre dos capturas en el código anterior.
- `npm run check:agents`, `check:syntax`, `format:check`, `lint`, `build:all`, `test` (11), `test:architecture` (22), `validate:contract`, `test:e2e` (31) y `npm audit` (raíz y frontend): en verde.
- El BFF nuevo respondió igual que el anterior en 47 comparaciones, y su smoke test del contrato pasa.
