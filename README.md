# WebStore

Tienda en línea con Angular: una tienda pública (**Storefront**), un panel de administración (**Admin**) y un **BFF de prueba** en Node.js que hace de única fuente de datos para ambos.

| Carpeta | Contenido |
|---|---|
| [`frontend/`](frontend/) | Workspace Angular: Storefront (`src/`) y Admin (`projects/admin/`). [Arquitectura](frontend/architecture.md) |
| [`backend/`](backend/) | BFF de prueba, sin dependencias. [Arquitectura](backend/architecture.md) · [Contrato HTTP](backend/docs/BFF-CONTRACT.md) |
| [`docs/`](docs/) | [Arquitectura del sistema](docs/architecture/README.md), [decisiones (ADR)](docs/adrs/), [proceso de desarrollo](docs/development/) y [de git](docs/git/), [especificaciones](docs/specs/README.md), [planificación, historias y backlog](docs/planning/) e [historial de cambios](docs/changelog/) |
| [`.agents/`](.agents/README.md) | Skills y adaptadores de los agentes de IA (Claude Code y Codex) |
| [`tools/`](tools/) | Validación de la estructura del repositorio y de la configuración de agentes |

## Requisitos

- Node.js 22.22.3+, 24.15+ o 26 (ver `engines` en [`package.json`](package.json)).
- npm 10 o superior.

## Instalar

```bash
npm run setup
```

Instala la herramienta de formato de la raíz y las dependencias de `frontend/` con `npm ci`. El BFF no tiene dependencias.

## Ejecutar

Usa tres terminales, desde la raíz:

```bash
npm run start:bff          # BFF de prueba: http://localhost:3000
```

```bash
npm run start:storefront   # Storefront: http://localhost:4200
```

```bash
npm run start:admin        # Admin: http://localhost:4300
```

Los dos frontends llegan al BFF por `/bff` con el proxy de [`frontend/proxy.conf.json`](frontend/proxy.conf.json). La primera vez, el BFF crea `backend/data.json` a partir de sus datos de ejemplo; ese archivo no se versiona. Para trabajar sobre una copia, arráncalo con `WEBSTORE_DATA_FILE=<ruta>`.

Rutas útiles del Storefront: `/` (inicio), `/catalogo`, `/comparar`, `/carrito`, `/checkout`, `/cuenta/login`, `/pedidos` y `/libro-reclamaciones`.

### Demo publicada

La última versión de `dev` está publicada en <https://webstore-demo.onrender.com> (tienda) y <https://webstore-demo.onrender.com/admin/> (Admin), con datos de ejemplo y sin la tuerca de temas, como en local ([ADR-0020](docs/adrs/0020-publicar-la-demo-en-render.md)). El acceso del Admin muestra las credenciales de prueba. Tras 15 minutos sin visitas se duerme y la primera visita tarda alrededor de un minuto.

### Accesos de demostración

Usuarios del Admin sembrados por el BFF de prueba, para uso local y para la demo publicada:

| Rol | Correo | Contraseña |
|---|---|---|
| Superadministrador | `owner@webstore.demo` | `WebStore#2026` |
| Administrador | `admin@webstore.demo` | `Admin#2026` |
| Vendedor | `catalogo@webstore.demo` | `Catalogo#2026` |

Se pueden cambiar con `WEBSTORE_OWNER_PASSWORD`, `WEBSTORE_ADMIN_PASSWORD` y `WEBSTORE_CATALOG_PASSWORD` antes de crear `data.json`. Para probar sin correo, el BFF devuelve en la respuesta los códigos de verificación y de recuperación solo si se arranca con `WEBSTORE_EXPOSE_TEST_CODES=true` o en modo demo ([entorno local](docs/development/local-environment.md#códigos-de-verificación-y-reinicio)).

## Verificar

Desde la raíz:

| Comando | Qué hace |
|---|---|
| `npm run check:agents` | Configuración de agentes: catálogo, skills y `CLAUDE.md` |
| `npm run check:syntax` | Sintaxis de todos los módulos del BFF |
| `npm run format:check` | Formato con Prettier (`npm run format` lo aplica) |
| `npm run lint` | ESLint, angular-eslint y límites de arquitectura con Sheriff |
| `npm run build:all` | Compila Storefront y Admin |
| `npm test` | Pruebas unitarias e integración del frontend y del BFF (11) |
| `npm run test:architecture` | Comprueba que las reglas de capas siguen rechazando lo prohibido |
| `npm run test:e2e` | Recorridos e2e del Storefront y del Admin con Playwright, contra un BFF con estado temporal |
| `npm run validate:contract` | Estructura del repositorio, pruebas unitarias y smoke test del contrato del BFF |
| `npm run audit:all` | `npm audit` de la raíz y de `frontend/` |
| `npm run verify` | Todo lo anterior salvo el e2e y la auditoría |

El CI de GitHub ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) ejecuta los mismos controles.

## Contribuir

- **¿Empiezas en el proyecto?** Lee la [guía de incorporación](docs/development/onboarding.md).
- **Entorno local en detalle:** [entorno local](docs/development/local-environment.md#levantar-y-apagar-el-proyecto).
- **Reglas, flujo SDD + TDD, comandos y documentos de referencia:** [`AGENTS.md`](AGENTS.md), que también leen los agentes de IA.
