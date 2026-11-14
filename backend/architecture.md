# Arquitectura del backend (BFF de prueba)

Cómo se organiza el BFF de prueba: capas, reglas de dependencia, convenciones y pruebas. Sigue la Clean Architecture simplificada del backend de IdShield, adaptada a Node.js sin dependencias ([ADR-0007](../docs/adrs/0007-organizar-el-bff-en-capas.md)).

Es un **sustituto de demostración** del BFF productivo: guarda el estado en un archivo JSON y no tiene identidad gestionada, rate limiting, auditoría ni persistencia transaccional. El contrato HTTP está en [`docs/BFF-CONTRACT.md`](docs/BFF-CONTRACT.md).

## 1. Capas

```text
backend/src/
  main.mjs          raíz de composición: configuración, store, casos de uso, rutas y servidor
  domain/           reglas puras por capacidad: sin I/O, sin node:http ni node:fs
  application/      casos de uso y consultas: reciben el store y la seguridad como parámetros
  infrastructure/   configuración del entorno, persistencia JSON, seed, hash de contraseñas y tokens
  api/              HTTP: CORS, Problem, lectura del cuerpo, router y un módulo de rutas por capacidad
```

| Desde | Puede depender de | No puede depender de |
|---|---|---|
| `domain/` | `domain/` | Las demás capas, módulos de Node con I/O |
| `application/` | `domain/`, `application/` | `infrastructure/`, `api/` (las recibe como parámetros) |
| `infrastructure/` | `domain/`, módulos de Node | `application/`, `api/` |
| `api/` | Sus propios helpers; `domain/comun/domain-error.mjs` para traducir errores a HTTP | `infrastructure/` |
| `main.mjs` | Todo | — |

Dentro de cada capa hay una carpeta por capacidad de negocio, en español: `catalogo`, `checkout`, `contenido`, `cuentas`, `envios`, `pedidos`, `reclamos`, `sesion`, `temas` y `admin`; `comun` agrupa lo transversal del dominio (errores, validación, reloj y revisión).

## 2. Convenciones

| Rol | Capa | Archivo | Ejemplo |
|---|---|---|---|
| Reglas | `domain/` | `<concepto>.rules.mjs` | `pedido.rules.mjs`: ventana de 24 h y transiciones de estado |
| Error de dominio | `domain/comun/` | `domain-error.mjs` | `DomainError(kind, code, message)`; `kind` se traduce a un estado HTTP en `api/http.mjs` |
| Casos de uso (escritura) | `application/` | `<capacidad>.use-cases.mjs` | `checkout.use-cases.mjs`: `placeOrder` |
| Consultas (lectura) | `application/` | `<capacidad>.queries.mjs` | `catalogo.queries.mjs` |
| Persistencia | `infrastructure/persistencia/` | `json-state-store.mjs` | carga, normaliza, migra y guarda el estado |
| Rutas | `api/routes/` | `<capacidad>.routes.mjs` | método + ruta → caso de uso |

- El estado se valida y migra al cargar (`SCHEMA_VERSION = 3`); los roles anteriores se traducen a los fijos (`owner` → `superadmin`, `catalog-maintainer` → `vendedor`) y los colores de Contenido pasan a un tema propio, «Colores de Contenido», si difieren de los de B.
- La capacidad `temas` ([ADR-0011](../docs/adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md)) guarda sus datos en `appearance` (`revision`, `activeThemeId` y `customThemes`), con una revisión propia, independiente de `state.revision`:
  - `domain/temas/`: `tema.rules.mjs` (`TOKENS_DEL_TEMA`, `PARES_DE_CONTRASTE` y el cálculo de los tokens), `contraste.rules.mjs` (relación de contraste WCAG y mezcla sRGB), `tema-propio.rules.mjs` (validación y reglas de los temas propios) y `temas-predefinidos.mjs` (A, B y C).
  - `application/temas/`: `temas.use-cases.mjs` (crear, editar, borrar y activar, con `STALE_THEMES` ante una revisión vieja) y `temas.queries.mjs` (la apariencia pública, la lista del Admin y la hoja `theme.css`).
  - `api/routes/temas.routes.mjs`: `/bff/appearance`, `/bff/appearance/theme.css` (que lee la cookie `ws_tema_vista_previa` solo en modo demo) y `/bff/admin/themes`. Solo el `superadmin` tiene `themes.manage`.
  - Lienzo de la tienda ([ADR-0013](../docs/adrs/0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md)), de la feature [004](../docs/specs/features/004-ajustes-de-la-tienda/planning.md), entregado con el [PR #26](https://github.com/sebastianaviladev01-xyz/WebStore/pull/26): `TOKENS_DEL_TEMA` tiene 31 tokens, con `--ws-store-bg` justo antes de `--ws-bg` y fuera de la escala neutra, igual al fondo principal (`colors.background`) salvo en A, B y C, que lo fijan con un literal (`#FAFAFB`, `#f9fafc` y `#F9F9FA`). `PARES_DE_CONTRASTE` tiene 20 pares; los cinco nuevos (`contrast`, `muted`, `link` y `focusRing` sobre `storeBackground`, y `borderStrong/surface`) solo avisan. `theme.css` sirve 31 declaraciones. Sin migración ni cambio de `schemaVersion`: los tokens se calculan al leer.
  - Texto sobre el enlace ([ADR-0014](../docs/adrs/0014-dar-al-tema-un-token-para-el-texto-sobre-el-enlace.md), aceptado), decidido para la feature [005](../docs/specs/features/005-contraste-de-controles-con-los-temas/planning.md) en su hito de arquitectura, pendiente de implementar: `TOKENS_DEL_TEMA` ganará `--ws-on-link` justo después de `--ws-link` y fuera de la escala neutra (32 tokens). `tokensDeMarca` lo calculará con `textoMasLegible(enlace, [BLANCO, C, Sf])`: a diferencia de `--ws-on-primary`, considera la superficie, que es lo que se lee sobre un enlace claro en un tema oscuro. A y C lo derivan (`#FFFFFF`) y B lo fija con `#ffffff`. `PARES_DE_CONTRASTE` ganará `onLink/link` (4.5:1, solo avisa; 21 pares) y `theme.css` servirá 32 declaraciones. Sin migración: los tokens se calculan al leer.
- Contraseñas con `scrypt` y sal; sesiones con token opaco, guardado como hash y con vencimiento.
- Los nombres de rutas, campos y códigos de error del contrato siguen en inglés (`/bff/catalog/products`, `STALE_SNAPSHOT`).

## 3. Configuración

Variables de entorno, leídas una vez en [`src/infrastructure/config.mjs`](src/infrastructure/config.mjs):

| Variable | Uso | Por defecto |
|---|---|---|
| `PORT` | Puerto HTTP | `3000` |
| `WEBSTORE_DATA_FILE` | Archivo de estado | `backend/data.json` |
| `WEBSTORE_EXPOSE_TEST_CODES` | Devuelve los códigos de verificación en la respuesta, para probar sin correo | `true` fuera de `NODE_ENV=production` |
| `WEBSTORE_NON_WORKING_DATES` | Feriados adicionales para el plazo de reclamos (`AAAA-MM-DD`, separados por coma) | vacío |
| `WEBSTORE_ALLOWED_ORIGINS` | Orígenes CORS | `http://localhost:4200,http://localhost:4300` |
| `WEBSTORE_OWNER_PASSWORD`, `WEBSTORE_ADMIN_PASSWORD`, `WEBSTORE_CATALOG_PASSWORD` | Contraseñas de los usuarios de demostración sembrados | las del [README](../README.md#accesos-de-demostración) |
| `WEBSTORE_DEMO_MODE` | Modo demo ([ADR-0012](../docs/adrs/0012-activar-el-modo-demo-y-recordar-la-vista-previa-en-una-cookie.md)): `/bff/appearance` trae todos los temas y `theme.css` sirve la vista previa de la cookie `ws_tema_vista_previa`. Solo `true` lo enciende, sin distinguir mayúsculas ni espacios en los extremos; cualquier otro valor (`false`, `1`, `sí`) lo deja apagado. Se expone como `demoMode` | apagado, también en producción |

`backend/data.json` no se versiona: contiene hashes, sesiones y datos de clientes de prueba. Si no existe, el BFF lo crea desde el seed.

## 4. Pruebas

Las pruebas se dividen como en IdShield entre unitarias e integración. Las carpetas de `tests/unit/` repiten las de `src/` que prueban.

| Carpeta | Qué contiene |
|---|---|
| [`tests/unit/`](tests/unit/) | Reglas de `domain/` y casos de uso de `application/` como funciones puras, sin servidor, red ni archivos |
| [`tests/integration/`](tests/integration/) | El BFF real levantado con `node src/main.mjs` en un puerto propio y un archivo de estado temporal, probado por HTTP |

| Comando (desde `backend/`) | Qué comprueba |
|---|---|
| `npm run check:syntax` | `node --check` sobre todos los `.mjs` de `src/`, `tests/` y `tools/` |
| `npm test` | `node:test` sobre `tests/unit/**/*.test.mjs` y `tests/integration/**/*.test.mjs`: reglas y casos de uso (unitarias) y, por HTTP, la migración de un `data.json` con roles anteriores (`migracion-roles.test.mjs`), la migración v3 de los colores de Contenido a temas (`migracion-temas.test.mjs`) y el modo demo, la hoja `theme.css`, su `ETag` y la cookie de la vista previa (`modo-demo.test.mjs`) |
| `npm run test:contract` | Smoke test del contrato completo ([`tests/integration/contrato.smoke.mjs`](tests/integration/contrato.smoke.mjs)) contra un servidor con un archivo de estado temporal |

- Herramienta: `node:test` y `node:assert`, sin dependencias externas ([ADR-0009](../docs/adrs/0009-usar-node-test-y-playwright-para-las-pruebas.md)).
- Ninguna prueba usa `backend/data.json`: las de integración pasan `WEBSTORE_DATA_FILE` con un archivo temporal y lo borran al terminar.
- Las e2e del Storefront y el Admin (`npm run test:e2e` desde `frontend/`) también levantan este BFF con un estado temporal, en el puerto 3400 ([`frontend/architecture.md` §6](../frontend/architecture.md#6-pruebas)).
