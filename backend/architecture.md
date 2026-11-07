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

Dentro de cada capa hay una carpeta por capacidad de negocio, en español: `catalogo`, `checkout`, `contenido`, `cuentas`, `envios`, `pedidos`, `reclamos`, `sesion` y `admin`; `comun` agrupa lo transversal del dominio (errores, validación, reloj y revisión).

## 2. Convenciones

| Rol | Capa | Archivo | Ejemplo |
|---|---|---|---|
| Reglas | `domain/` | `<concepto>.rules.mjs` | `pedido.rules.mjs`: ventana de 24 h y transiciones de estado |
| Error de dominio | `domain/comun/` | `domain-error.mjs` | `DomainError(kind, code, message)`; `kind` se traduce a un estado HTTP en `api/http.mjs` |
| Casos de uso (escritura) | `application/` | `<capacidad>.use-cases.mjs` | `checkout.use-cases.mjs`: `placeOrder` |
| Consultas (lectura) | `application/` | `<capacidad>.queries.mjs` | `catalogo.queries.mjs` |
| Persistencia | `infrastructure/persistencia/` | `json-state-store.mjs` | carga, normaliza, migra y guarda el estado |
| Rutas | `api/routes/` | `<capacidad>.routes.mjs` | método + ruta → caso de uso |

- El estado se valida y migra al cargar (`SCHEMA_VERSION = 2`); los roles anteriores se traducen a los fijos (`owner` → `superadmin`, `catalog-maintainer` → `vendedor`).
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
| `npm test` | `node:test` sobre `tests/unit/**/*.test.mjs` y `tests/integration/**/*.test.mjs` (3 pruebas): traducción de roles anteriores y permisos por rol (unitarias) y migración de un `data.json` con roles anteriores (integración) |
| `npm run test:contract` | Smoke test del contrato completo ([`tests/integration/contrato.smoke.mjs`](tests/integration/contrato.smoke.mjs)) contra un servidor con un archivo de estado temporal |

- Herramienta: `node:test` y `node:assert`, sin dependencias externas ([ADR-0009](../docs/adrs/0009-usar-node-test-y-playwright-para-las-pruebas.md)).
- Ninguna prueba usa `backend/data.json`: las de integración pasan `WEBSTORE_DATA_FILE` con un archivo temporal y lo borran al terminar.
- Las e2e del Storefront y el Admin (`npm run test:e2e` desde `frontend/`) también levantan este BFF con un estado temporal, en el puerto 3400 ([`frontend/architecture.md` §6](../frontend/architecture.md#6-pruebas)).
