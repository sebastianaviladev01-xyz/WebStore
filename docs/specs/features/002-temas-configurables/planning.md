# 002. Temas configurables — Plan

- Feature: `002-temas-configurables`
- Especificación: [specification.md](specification.md) (aprobada el 2026-11-11; 19 REQ, 24 AC, decisiones D1 a D7)
- Estado: borrador
- Fecha: 2026-11-11
- Hito de arquitectura: pendiente. Las cuatro preguntas están en [Hito de arquitectura](#hito-de-arquitectura)

## Enfoque

El BFF es la fuente de los temas. Guarda los temas propios y el tema activo, conoce los tres predefinidos y calcula, para cada tema, el **mapa de tokens CSS** (`--ws-*`) que aplican la tienda y el Admin. Las plantillas y los estilos dejan de usar colores fijos: todo pasa por tokens, y los tokens nuevos tienen en B el mismo valor que hoy.

1. **Tokens como contrato visual.** [`tokens.css`](../../../../frontend/src/styles/tokens.css) sigue siendo la paleta B y el respaldo si el BFF no responde. Se añaden los tokens que faltan para REQ-17 (texto sobre el principal, sobre el tinte y sobre el acento, enlace, contorno de foco y título del pie) y dos fijos que no dependen del tema (texto sobre fotos y velo de los paneles). Los valores fijos de las plantillas y los estilos pasan a esos tokens, según la [tabla de sustituciones](#sustitución-de-colores-fijos). Con B, cada token nuevo vale lo mismo que el color fijo que sustituye: la interfaz no cambia (AC-01).
2. **Temas en el BFF.** Una capacidad nueva, `temas`, en las cuatro capas del BFF. Los predefinidos A, B y C son constantes del dominio y no se guardan en el estado. Los temas propios y el tema activo viven en `appearance`, una parte nueva del estado con revisión propia. Las reglas de contraste (WCAG 2.1) y de derivación (D2) están en `domain/` y se escriben con TDD.
3. **Sin parpadeo al cargar (AC-18).** Los dos `index.html` cargan `/bff/appearance/theme.css` con un `<link rel="stylesheet">` normal. El navegador no pinta hasta tenerlo, así que la primera imagen ya sale con el tema activo, también en la primera visita. Si el BFF no responde, el `<link>` falla y queda B, el de `tokens.css`. Durante la sesión, los cambios de tema se aplican en vivo con `style.setProperty` sobre `<html>`.
4. **Modo demo y vista previa local.** La variable `WEBSTORE_DEMO_MODE` (D4) enciende el modo demo; sin ella, no existe. La tuerca guarda el tema elegido en la cookie `ws_tema_vista_previa`. La tienda y el Admin la comparten en `localhost`, porque las cookies no distinguen puertos, y en subdominios del mismo dominio. En modo demo, el BFF la lee solo para elegir qué hoja de estilos sirve: no la guarda y no afecta a nadie más (D5).
5. **Contenido sin colores (D3).** La migración `schemaVersion: 3` lleva los colores personalizados a un tema propio «Colores de Contenido» y los quita de `config`. Desde entonces, el BFF descarta `primaryColor` y `secondaryColor` si llegan.
6. **Una feature `temas` en cada aplicación.** En la tienda, aplica el tema y muestra la tuerca. En el Admin, además, tiene la página de temas, solo para el `superadmin`, con su formulario, la vista previa y el aviso de contraste. El Admin replica las reglas de contraste y derivación del BFF para la vista previa en vivo, como ya replica la tabla de roles, y sus pruebas usan los mismos casos.

Alternativas descartadas:

| Alternativa | Por qué se descarta |
|---|---|
| Guardar los temas en el snapshot del Admin (`PUT /admin/snapshot`, colección `themes`) | Comparte la revisión global: cualquier venta invalida un guardado de temas. Además, `TiendaFacade` reintenta sola tras `STALE_SNAPSHOT`, así que el segundo `superadmin` pisaría al primero, contra AC-19. La tienda necesita además una lectura pública. Alternativa B de la [pregunta 1](#pregunta-1-dónde-viven-los-temas-en-el-contrato) |
| Aplicar el tema solo desde Angular, tras leer el JSON (como hoy los colores de Contenido) | La tienda se pinta primero con B y luego cambia, contra AC-18. Alternativa C de la [pregunta 2](#pregunta-2-cómo-se-evita-el-parpadeo-al-cargar) |
| Recordar el tema activo en `localStorage` y aplicarlo con un script en línea antes del arranque | Falla en la primera visita y cuando el `superadmin` cambia el tema. Alternativa B de la pregunta 2 |
| Vista previa de la tuerca en `localStorage` | La tienda (`:4200`, `store.example.com`) y el Admin (`:4300`, `admin.store.example.com`) son orígenes distintos y no comparten `localStorage`: no cumple AC-21 al pasar de la tienda al Admin. Alternativa C de la [pregunta 3](#pregunta-3-dónde-se-recuerda-la-vista-previa-de-la-tuerca) |
| Guardar los predefinidos en el estado | Quedarían congelados en cada `data.json`: un ajuste de sus valores (por ejemplo, PBI-0037) necesitaría otra migración, y se podrían editar con una petición directa |
| Librería compartida entre la tienda y el Admin para la feature `temas` | Rompe la separación de las dos aplicaciones ([principios](../../../architecture/README.md#principios)) y necesita un ADR propio. Lo duplicado es poco: modelo, gateway, facade y la tuerca |
| Derivar los tokens en los dos frontends y no en el BFF | Habría tres copias de las reglas (BFF, tienda y Admin), y el BFF no podría servir la hoja de estilos del paso 3. Alternativa B de la [pregunta 4](#pregunta-4-dónde-se-calculan-los-tokens-y-el-contraste) |
| `contrast-color()` de CSS para elegir el texto sobre un color | No está disponible en todos los navegadores que soporta el proyecto, y la validación del BFF (D7) necesita la cifra igual |

## Responsabilidades por capa

Nombres según [`frontend/architecture.md` §4](../../../../frontend/architecture.md#4-componentes-y-convenciones) y [`backend/architecture.md` §2](../../../../backend/architecture.md#2-convenciones). El código nuevo usa nombres de negocio en español; los campos, las rutas y los códigos de error del contrato siguen en inglés, como el resto del contrato ([ADR-0003](../../../adrs/0003-usar-espanol-para-el-vocabulario-de-negocio.md)).

| Capa | Elemento | Responsabilidad | REQ |
|---|---|---|---|
| BFF: `domain/temas/` | `contraste.rules.mjs` (nuevo) | `relacionDeContraste(a, b)` según WCAG 2.1, `mezclarSrgb(a, peso, b)` (la misma mezcla que `color-mix(in srgb, …)`), `textoMasLegible(fondo, candidatos)` | REQ-13, REQ-14, REQ-17 |
| BFF: `domain/temas/` | `temas-predefinidos.mjs` (nuevo) | `TEMAS_PREDEFINIDOS`: A, B y C con su id, su nombre, sus cinco colores y su mapa de tokens completo ([tokens](#tokens-del-tema)). B copia literalmente `tokens.css` | REQ-01, REQ-03, REQ-13 |
| BFF: `domain/temas/` | `tema.rules.mjs` (nuevo) | `tokensDelTema(colores, predefinidos)` (derivación D2 y regla de la base neutra), `revisarContraste(colores, predefinidos)` (bloqueos y avisos de D7), `exigirTemaValido(entrada, temas)` (nombre, formato `#RRGGBB` y contraste), `exigirTemaPropio(id, temas)`, `exigirTemaBorrable(id, apariencia)` | REQ-02, REQ-03, REQ-06, REQ-07, REQ-14, REQ-17, AC-09, AC-11, AC-12 |
| BFF: `domain/sesion/` | `rol.rules.mjs` | Permiso nuevo `themes.manage`, solo del `superadmin`: se excluye de `OPERATION` como `users.manage` | REQ-09 |
| BFF: `domain/admin/` | `configuracion.rules.mjs` (nuevo) | `sinColoresDeContenido(config)`: quita `primaryColor` y `secondaryColor` de un `config` entrante | REQ-18, AC-22 |
| BFF: `application/temas/` | `temas.queries.mjs` (nuevo) | `apariencia(modoDemo)`, la vista pública; `temasAdmin()`, la lista completa con su revisión; `hojaDeEstilos(modoDemo, idVistaPrevia)`, el CSS del tema que corresponde | REQ-04, REQ-05, REQ-11, REQ-12 |
| BFF: `application/temas/` | `temas.use-cases.mjs` (nuevo) | `crear`, `editar`, `borrar` y `activar`. Cada uno exige la revisión vigente (`STALE_THEMES`), aplica las reglas, sube la revisión de temas y guarda | REQ-06 a REQ-10, AC-19 |
| BFF: `application/admin/` | `snapshot.use-cases.mjs` | Aplica `sinColoresDeContenido` a `config` antes de reemplazarlo | AC-22 |
| BFF: `infrastructure/` | `config.mjs` | `demoMode` desde `WEBSTORE_DEMO_MODE` ([nombre y valores](#decisiones)) | REQ-12 |
| BFF: `infrastructure/persistencia/` | `seed.mjs`, `normalizar-estado.mjs` | Semilla sin colores en `config` y con `appearance` (activo `b`). `SCHEMA_VERSION = 3` y migración `migrarColoresDeContenido` ([estado](#estado-del-bff)). La normalización corrige un `activeThemeId` inexistente a `b` | REQ-10, REQ-18, REQ-19 |
| BFF: `api/` | `http.mjs` | Respuesta `text/css` (`css(texto)`) y lectura de una cookie (`cookie(req, nombre)`) | AC-18, REQ-11 |
| BFF: `api/routes/` | `temas.routes.mjs` (nuevo) | Rutas públicas de apariencia y rutas del Admin con `requireAdmin(token, 'themes.manage')` ([contrato](#contrato-del-bff-afectado)) | REQ-04, REQ-05, REQ-09 |
| BFF | `main.mjs` | Compone `temas.queries` y `temas.use-cases` con `config.demoMode` | — |
| Tienda: `features/temas/domain/` | `tema.model.ts`, `apariencia.gateway.ts`, `tema-visible.rules.ts` (nuevos) | Tipos `Tema`, `ColoresTema`, `TokensTema` y `Apariencia`; puerto `AparienciaGateway`; regla pura `temaVisible(apariencia, idVistaPrevia)` | REQ-04, REQ-11, REQ-12 |
| Tienda: `features/temas/application/` | `TemasFacade` (nuevo) | Carga la apariencia y expone `modoDemo`, `temas`, `temaActivo` y `temaVisible`. Aplica los tokens del tema visible a `<html>` y `meta[name=theme-color]`. Lee y escribe la cookie de la vista previa con `verTema(id)` y `volverAlActivo()`, como `CarritoFacade` hace con `localStorage` | REQ-04, REQ-11, REQ-16 |
| Tienda: `features/temas/data/` | `BffAparienciaGateway` (nuevo) | `GET /bff/appearance` | REQ-04 |
| Tienda: `features/temas/presentation/` | `SelectorTemaComponent` (`ws-selector-tema`, nuevo) | La tuerca y su panel (menú de Angular Material: teclado y foco), con los temas y «Volver al tema activo» | REQ-11, AC-15 |
| Tienda: raíz | `app.ts`, `index.html` | `App` muestra `<ws-selector-tema>` solo si `modoDemo()`. `index.html` añade el `<link>` de `theme.css` | AC-15, AC-16, AC-18 |
| Tienda: `features/contenido/` | `contenido.model.ts`, `ContenidoFacade` | Quita `primaryColor` y `secondaryColor` del modelo, del respaldo y del `setProperty`; la tipografía no cambia | REQ-18 |
| Admin: `features/temas/domain/` | `tema.model.ts`, `temas.gateway.ts`, `tema.rules.ts`, `tema-visible.rules.ts` (nuevos) | Tipos, el puerto `TemasGateway` con sus errores y la réplica de las reglas del BFF: contraste, mezcla, `tokensDelTema`, `revisarContraste` y `validarNombreTema`, en un solo archivo por la [restricción de las pruebas](#tipos-intermedios-y-nombres) | REQ-07, REQ-14, REQ-17, AC-07, AC-11 |
| Admin: `features/temas/application/` | `TemasFacade` (nuevo) | Lo mismo que en la tienda, más la gestión (`cargarTemas`, `crear`, `editar`, `borrar`, `activar`). Tras activar, aplica el tema nuevo sin recargar. Ante `TemasDesactualizadosError` **no reintenta**: avisa y recarga la lista (AC-19) | REQ-05 a REQ-10, AC-10, AC-19 |
| Admin: `features/temas/data/` | `BffTemasGateway` (nuevo) | Rutas de apariencia y de temas del Admin; traduce `STALE_THEMES` a `TemasDesactualizadosError` y el resto de los 4xx a `ReglaTemaError` con su mensaje y `details` | REQ-09, AC-19 |
| Admin: `features/temas/presentation/` | `TemasPage` (`ws-admin-temas`), `TemaDialog`, `VistaPreviaTemaComponent` (`ws-admin-vista-previa-tema`), `SelectorTemaComponent` (`ws-admin-selector-tema`), todos nuevos | La lista con su muestra de cinco colores, las marcas de predefinido y de activo y las acciones según el tipo. El diálogo con nombre, cinco `input type="color"`, la vista previa y la revisión de contraste. La vista previa aplica los tokens como variables CSS de su propio elemento, no de `<html>` (AC-07). El borrado se confirma con `confirm()`, como en el resto del Admin | REQ-05 a REQ-08, REQ-14, AC-03 a AC-11, AC-14 |
| Admin: raíz y `layout/` | `app.ts`, `app.routes.ts`, `index.html`, `AppLayout` | Tuerca en `App`, también en el acceso. Ruta `/temas` con `permisoGuard('themes.manage')`. Enlace «Temas» en el grupo «Tienda» del menú. `<link>` de `theme.css` | REQ-05, REQ-09, AC-04 |
| Admin: `features/sesion/domain/` | `rol.rules.ts` | Réplica de `themes.manage` | REQ-09 |
| Admin: `features/tienda/` | `tienda.model.ts`, `contenido.page.ts` | Quita los dos selectores de color. La vista previa del logo usa `bg-primary` y `text-on-primary` | REQ-18, AC-22 |
| Estilos de las dos aplicaciones | `tokens.css`, `styles.css`, `storefront.css`, `home.css`, `projects/admin/src/styles.css` y plantillas | Tokens nuevos y [sustitución de colores fijos](#sustitución-de-colores-fijos) | REQ-03, REQ-17 |

### Dependencias entre features

- **Admin:** `temas → sesion`, para el token y `can('themes.manage')`. Se declara en [`sheriff.config.ts`](../../../../frontend/sheriff.config.ts) como `'feature:temas': ['feature:sesion']`. Como Sheriff no permite importar entre aplicaciones (`app:*`), la regla no da acceso a la `temas` de la tienda.
- **Tienda:** `temas` no depende de ninguna feature, y ninguna feature depende de ella. Solo la usa la raíz (`app.ts`), que puede depender de todo.
- No hay ciclos. [`frontend/architecture.md` §2.2](../../../../frontend/architecture.md#22-dependencias-entre-features) añade `temas → sesion` en la columna del Admin, y §3 añade `temas/` al árbol de las dos aplicaciones.

## Contrato del BFF afectado

Las rutas nuevas siguen las convenciones del [contrato](../../../../backend/docs/BFF-CONTRACT.md): nombres en inglés, errores `{ message, error: { code, message, details? } }` y `Authorization: Bearer` en el Admin.

| Método | Ruta | Petición | Respuestas | Errores (`code`) | Roles |
|---|---|---|---|---|---|
| `GET` | `/bff/appearance` | — | `200 Apariencia`: `{ demoMode, activeThemeId, themes }`. En modo demo, `themes` trae todos los temas (predefinidos y propios); fuera de él, solo el activo | — | Público |
| `GET` | `/bff/appearance/theme.css` | Cookie `ws_tema_vista_previa`, que solo se lee en modo demo | `200 text/css; charset=utf-8`, `Cache-Control: no-cache`. Cuerpo: `:root:root { --ws-…: …; }`, con el mapa del tema activo o, en modo demo, el de la vista previa si existe. El selector repetido gana a `:root` de `tokens.css`, que se carga después | — (nunca falla por la cookie: si no es válida, sirve el activo) | Público |
| `GET` | `/bff/admin/themes` | Bearer | `200 TemasAdmin`: `{ revision, activeThemeId, themes }`, con todos los temas | `401 ADMIN_AUTHENTICATION_REQUIRED`, `403 INSUFFICIENT_ROLE` | `superadmin` (`themes.manage`) |
| `POST` | `/bff/admin/themes` | `{ revision, name, colors }` | `201 TemasAdmin`. El tema nuevo no queda activo | `400 INVALID_THEME_NAME`, `400 INVALID_THEME_COLOR` (`details.field`), `400 INSUFFICIENT_THEME_CONTRAST` (`details.pairs`), `409 THEME_NAME_TAKEN`, `409 STALE_THEMES`, `401`, `403` | `superadmin` |
| `PUT` | `/bff/admin/themes/:id` | `{ revision, name, colors }` | `200 TemasAdmin` | Los de `POST`, `404 THEME_NOT_FOUND` y `409 PREDEFINED_THEME_READ_ONLY` | `superadmin` |
| `DELETE` | `/bff/admin/themes/:id?revision=N` | — | `200 TemasAdmin` | `404 THEME_NOT_FOUND`, `409 PREDEFINED_THEME_READ_ONLY`, `409 ACTIVE_THEME_IN_USE`, `409 STALE_THEMES`, `401`, `403` | `superadmin` |
| `PUT` | `/bff/admin/active-theme` | `{ revision, themeId }` | `200 TemasAdmin` | `404 THEME_NOT_FOUND`, `409 STALE_THEMES`, `401`, `403` | `superadmin` |
| `GET` | `/bff/content/settings` | — | **Cambia:** ya no trae `primaryColor` ni `secondaryColor` | — | Público |
| `GET`, `PUT` | `/bff/admin/snapshot` | **Cambia:** `config` ya no trae los dos colores. Si llegan en un `PUT`, se descartan sin error (AC-22) | Sin cambios | Sin cambios | Sin cambios |

Formas:

- `Tema` (DTO): `{ id, name, kind: 'predefined' | 'custom', colors: { primary, secondary, background, surface, contrast }, tokens: { '--ws-primary': '#1D4ED8', … } }`. Los `tokens` se calculan al leer y no se guardan.
- Orden de `themes`: A, B y C, y después los propios por nombre (`localeCompare('es')`).
- `details.pairs` de `INSUFFICIENT_THEME_CONTRAST`: `[{ pair: 'contrast/background' | 'contrast/surface', ratio: 2.1, minimum: 4.5 }]`, con la relación redondeada a un decimal, como la muestra el Admin.
- Una `revision` ausente o distinta de la vigente responde `409 STALE_THEMES` y no cambia nada.
- `ACTIVE_THEME_IN_USE`: «Activa otro tema antes de borrar este.» (AC-09).
- El orden de las rutas de `temas.routes.mjs` deja `/bff/admin/active-theme` aparte de `/bff/admin/themes/:id`, así que no hay ambigüedad. `/bff/appearance/theme.css` va antes de cualquier patrón de `/bff/appearance`.

Compatibilidad: quitar `primaryColor` y `secondaryColor` de `/content/settings` y de `config` es un **cambio incompatible**. Un Storefront o un Admin de una versión anterior dejaría de recibirlos. Es un [disparador de revisión adicional](../../../architecture/development-workflow.md#disparadores-de-revisión-adicional). Como los frontends y el BFF se publican juntos en este repositorio, se mitiga actualizando a la vez el BFF, `BFF-CONTRACT.md`, el smoke test y los adaptadores ([STD-05](../../../architecture/standards.md)).

## Estado del BFF

| Colección o campo | Regla | Migración (`schemaVersion`) | REQ/ADR |
|---|---|---|---|
| `appearance.activeThemeId` | Id de un tema existente: `a`, `b`, `c` o el de un propio. En la semilla, `b`. Si no existe al normalizar, pasa a `b` | Sí, 3: se crea con `b` o con el tema migrado | REQ-04, REQ-19, AC-24 |
| `appearance.revision` | Entero que sube con cada `crear`, `editar`, `borrar` y `activar`. Es independiente de `state.revision`: una venta no invalida un guardado de temas, y un guardado de temas no invalida el snapshot | Sí, 3: empieza en 0 | AC-19, ADR-0011 |
| `appearance.customThemes[]` | `{ id, name, colors: { primary, secondary, background, surface, contrast }, createdAt, updatedAt }`. `id` sale de `security.newId()`. Colores en `#RRGGBB` en mayúsculas. Nombre recortado, de 1 a 40 caracteres y único entre todos los temas, predefinidos incluidos, sin distinguir mayúsculas | Sí, 3: vacío, o con «Colores de Contenido» | REQ-02, REQ-07, REQ-10 |
| `config.primaryColor`, `config.secondaryColor` | Se retiran. La semilla ya no los tiene, y el BFF los descarta si llegan | Sí, 3: se borran tras migrarlos | REQ-18, AC-22 |
| Temas predefinidos | No se guardan: son constantes de `domain/temas/temas-predefinidos.mjs` | No | REQ-01, REQ-06 |

Migración `migrarColoresDeContenido`, que se ejecuta una vez al pasar de `schemaVersion < 3` a 3, después de `migrateAdminRoles`:

1. Toma `primaryColor` y `secondaryColor` del `config` guardado. Si uno falta, no es `#RRGGBB` o es el antiguo valor por defecto (borgoña `#6E173C` o bronce `#8C6845`), se toma el de B. La regla actual `LEGACY_DEFAULT_COLORS` pasa a este paso, porque la semilla ya no tiene colores para reemplazarlos.
2. Si los dos coinciden con los de B (`#1D4ED8` y `#C2410C`, sin distinguir mayúsculas), no se crea nada y el activo es `b`.
3. Si no, crea un tema propio «Colores de Contenido» con esos dos colores como principal y secundario y con el fondo principal, el fondo secundario y el contraste de B (`#F3F5F8`, `#FFFFFF` y `#0F172A`), y lo marca como activo. Si el nombre ya existe, prueba «Colores de Contenido (2)», «(3)» y así sucesivamente: la migración no falla. El contraste de B sobre los fondos de B cumple siempre D7, así que el tema no puede quedar bloqueado.
4. Borra las dos claves de `config`.

Con la [regla de la base neutra](#tokens-del-tema), el tema migrado hereda la escala neutra de B, y sus variantes se derivan con las mismas mezclas `color-mix()` que aplicaba la tienda. Si el principal es oscuro, la tienda se ve exactamente igual que antes (AC-23). Si es claro, el texto sobre él, los enlaces y el foco pasan al color de contraste por REQ-17: ese cambio es el que pide D2, no una regresión.

`POST /admin/reset` vuelve a la semilla: activo `b` y sin temas propios.

**Alineación con el modelo de datos de Daniel (PBI-0043).** Los temas quedan aislados en su propia parte del estado y del contrato, sin tocar el «cascarón» de usuarios, pedidos, ventas y direcciones. Pasar a base de datos sería directo:

- una tabla `tema`: `id`, `nombre`, cinco columnas de color, fechas y, si se elige multi-tenant (PBI-0004), `tienda_id`;
- el tema activo como columna de la configuración de la tienda;
- `appearance.revision` como versión para la concurrencia optimista.

Los predefinidos pueden seguir como constantes o pasar a filas de semilla con `tipo = 'predefinido'`. Ni el contrato ni los frontends cambian. Si el modelo de Daniel llega antes de `sdd-tasks`, la tarea del estado (T4) se alinea con él. Esta feature no lo espera.

## Tokens del tema

Un tema es un mapa completo de estos tokens. La tienda y el Admin solo aplican el mapa; el BFF lo calcula. Los tokens marcados con ✚ son nuevos, y en `tokens.css` valen lo mismo que el color fijo que sustituyen.

| Token | B (= `tokens.css`) | A · Violeta tienda | C · Grafito y ámbar | Tema propio (P, S, F, Sf, C = principal, secundario, fondo, superficie, contraste) |
|---|---|---|---|---|
| `--ws-primary` | `#1d4ed8` | `#4C2A92` | `#F2B705` | P |
| `--ws-primary-strong` | `color-mix(in srgb, var(--ws-primary) 62%, #0f172a)` | `#2E1A5C` (presentado) | derivado: `color-mix(P 88%, C)` ≈ `#D9A509` | `color-mix(P 62%, C)` si el texto sobre P es blanco; `color-mix(P 88%, C)` si es C. Si el texto sobre P no llega a 4.5:1 sobre el resultado, P |
| `--ws-primary-soft` | `color-mix(in srgb, var(--ws-primary) 10%, #ffffff)` | `#EFE9FB` (presentado) | `#FFF6D6` (tinte presentado) | `color-mix(P 10%, Sf)` |
| ✚ `--ws-on-primary` | `#ffffff` | `#FFFFFF` | `#1F2328` | Blanco o C, el que más contraste dé sobre P (D2) |
| ✚ `--ws-on-primary-soft` | `var(--ws-primary-strong)` | `#3A1F72` (presentado) | `#8A5A00` (presentado) | `--ws-primary-strong` si llega a 4.5:1 sobre el tinte; si no, C |
| `--ws-accent` | `#c2410c` | `#F5A524` | `#1F2328` | S |
| `--ws-accent-strong` | `color-mix(in srgb, var(--ws-accent) 78%, #0f172a)` | derivado | derivado | `color-mix(S 78%, C)` |
| `--ws-accent-soft` | `color-mix(in srgb, var(--ws-accent) 9%, #ffffff)` | derivado | derivado | `color-mix(S 9%, Sf)` |
| ✚ `--ws-on-accent` | `#ffffff` | `#2B1700` (presentado) | `#F2B705` (presentado) | Blanco o C, el que más contraste dé sobre S |
| ✚ `--ws-link` | `var(--ws-primary)` | P | `#1F2328` (presentado) | P si llega a 4.5:1 sobre F y sobre Sf; si no, C (REQ-17) |
| ✚ `--ws-focus-ring` | `var(--ws-primary)` | P | `#1F2328` | P si llega a 3:1 sobre F y sobre Sf; si no, C (REQ-17) |
| `--ws-bg`, `--ws-surface` | `#f3f5f8`, `#ffffff` | `#F4F4F6`, `#FFFFFF` | `#F2F3F5`, `#FFFFFF` | F, Sf |
| `--ws-ink`, `--ws-text` | `#0f172a`, `#1e293b` | `#17151C`, `#17151C` | `#1F2328`, `#1F2328` | C, C |
| `--ws-muted` | `#526075` | `#5B5866` (presentado) | `#555B65` (presentado) | `color-mix(C 68%, Sf)` |
| `--ws-muted-strong` | `#3b4759` | derivado | derivado | `color-mix(C 82%, Sf)` |
| `--ws-surface-subtle`, `--ws-surface-soft` | `#f6f8fa`, `#e9edf3` | derivados | derivados | `color-mix(C 3%, Sf)`, `color-mix(C 9%, Sf)` |
| `--ws-border`, `--ws-border-strong` | `#dde3ec`, `#8a96a8` | derivados | derivados | `color-mix(C 14%, Sf)`, `color-mix(C 50%, Sf)` |
| `--ws-disabled`, `--ws-disabled-text` | `#e6e9ee`, `#5a6577` | derivados | derivados | `color-mix(C 10%, Sf)`, `color-mix(C 68%, Sf)` |
| `--ws-dot` | `#b9c8f2` | derivado | derivado | `color-mix(P 30%, Sf)` |
| `--ws-footer`, `--ws-footer-text` | `#0f1b33`, `#c5cedd` | `#1E1530`, `#CFC8E0` (presentados) | `#16181C`, `#C9CDD3` (presentados) | C, `color-mix(Sf 78%, C)` |
| `--ws-footer-rule` | `#22314f` | derivado | derivado | `color-mix(Sf 15%, C)` |
| ✚ `--ws-footer-heading` | `#ffffff` | `#FFFFFF` | `#FFFFFF` | Sf |

Reglas:

- **Derivación.** Lo que dice «derivado» en A y C se calcula con la fórmula de los temas propios aplicada a sus cinco colores. El BFF escribe cada mezcla como `color-mix(in srgb, <hex> N%, <hex>)` con colores literales: el navegador hace la misma cuenta que hoy. Para medir el contraste, el dominio usa `mezclarSrgb`.
- **Base neutra.** Si el fondo principal, el fondo secundario y el contraste de un tema propio coinciden con los de un predefinido, sin distinguir mayúsculas, el tema hereda la escala neutra de ese predefinido: `--ws-bg`, superficies, `ink`, `text`, `muted` y `muted-strong`, bordes, deshabilitados, `dot` y los cuatro tokens del pie. Así, un tema que solo cambia el principal y el secundario sobre la base de B se ve como hoy con esos dos colores en Contenido (AC-23). Los tokens de marca (principal, acento y los que se calculan con ellos) se derivan siempre.
- **Fijos en todos los temas**, porque no dependen de la paleta: `--ws-danger*`, `--ws-warning*` (supuesto de la especificación), ✚ `--ws-on-media: #ffffff` (texto y botones sobre fotos y velos) y ✚ `--ws-scrim: rgb(0 0 0 / 0.45)` (velo del cajón de navegación). Viven solo en `tokens.css` y no van en el mapa del tema.
- **Sombras.** `rgba(15, 23, 42, N)` pasa a `color-mix(in srgb, var(--ws-ink) N%, transparent)`. Con B es el mismo color: `--ws-ink` es `#0F172A`, que es `rgb(15, 23, 42)`.
- **Angular Material.** `--mat-sys-primary` pasa a `var(--ws-link)`, porque Material lo usa también como color de texto (la etiqueta enfocada de un campo). `--mat-sys-on-primary` pasa a `var(--ws-on-primary)`. Con B no cambian.
- **`meta theme-color`** = P del tema visible. Lo actualiza `TemasFacade`. `index.html` conserva `#1d4ed8`.
- **`color-scheme: light`** no cambia. Un tema propio oscuro se puede guardar si cumple D7, pero los controles nativos del navegador siguen claros. Queda anotado como limitación.

Medida previa (2026-11-11, con la fórmula de WCAG 2.1, sobre la tabla anterior). Todos los pares de A, B y C alcanzan AA:

| Par | B | A | C |
|---|---:|---:|---:|
| Texto sobre el principal / sobre el principal fuerte | 6.7 / 10.2 | 10.2 / 14.8 | 8.7 / 7.0 |
| Texto sobre el tinte | 8.7 | 11.0 | 5.5 |
| Texto sobre el acento | 5.2 | 8.4 | 8.7 |
| Enlace sobre fondo / superficie | 6.1 / 6.7 | 9.3 / 10.2 | 14.2 / 15.8 |
| Foco sobre fondo / superficie (mínimo 3) | 6.1 / 6.7 | 9.3 / 10.2 | 14.2 / 15.8 |
| Texto secundario sobre fondo / superficie | 5.9 / 6.4 | 6.3 / 6.9 | 6.2 / 6.8 |
| Pie | 10.8 | 10.8 | 11.1 |
| Texto deshabilitado | 4.8 | 5.1 | 4.5 |

TEST-03 vuelve a medir estos pares sobre los mapas reales. El texto deshabilitado de C queda justo en el límite (4.53). Si la implementación lo baja de 4.5, el token pasa a un valor explícito y se documenta.

### Sustitución de colores fijos

Inventario del 2026-11-11 (`grep` de hex, `rgba`, `white` y `black` fuera de `tokens.css`). En B, cada sustitución da el mismo color calculado. Ruta base: `frontend/`.

| Lugar | Hoy | Pasa a |
|---|---|---|
| `src/styles.css` `.ws-btn-primary`; `src/styles/storefront.css` líneas 10 (`.ws-utility-bar`), 33 y 349; `src/styles/home.css` 966 | `white` / `#ffffff` sobre `--ws-primary` o `--ws-primary-strong` | `var(--ws-on-primary)` |
| `src/styles.css` `.ws-footer-title`, `.ws-footer-links a:hover`; `storefront.css` 1181 | `white` / `#ffffff` sobre el pie | `var(--ws-footer-heading)` |
| `src/styles.css` `.ws-btn-on-dark` (borde y fondo), `.ws-btn-light` (texto y `rgba(255,255,255,N)`), `.ws-skip-link` | blanco sobre fotos y velos | `var(--ws-on-media)`; los `rgba` pasan a `color-mix(in srgb, var(--ws-on-media) N%, transparent)` |
| `src/styles.css` y `projects/admin/src/styles.css` `::selection` | `color-mix(…, white)` | `color-mix(…, var(--ws-surface))` |
| `src/styles.css` `:focus-visible` (dos reglas) y `projects/admin/src/styles.css` | `outline: 2px solid var(--ws-primary)` | `var(--ws-focus-ring)` |
| Sombras: `storefront.css` 15, 144, 324 y 1119; `home.css` 664; `projects/admin/src/styles.css` 41; `login.page.ts` (`shadow-[…rgba(15,23,42,.08)]`) | `rgba(15, 23, 42, N)` | `color-mix(in srgb, var(--ws-ink) N%, transparent)` |
| `storefront.css` 942 (fondo del panel de filtros en móvil) | `rgba(15, 23, 42, 0.45)` | `color-mix(in srgb, var(--ws-ink) 45%, transparent)` |
| `src/app/layout/app.layout.ts` 217 (cajón) | `bg-black/45` | `bg-scrim` (`--ws-scrim`) |
| Plantillas con `bg-primary … text-white`: tienda `app.layout.ts` 96, 232 y 250; Admin `app.layout.ts` 63, `login.page.ts` 21 y 47, y los botones de `banners`, `categorias`, `clientes`, `contenido` (dos), `marcas`, `productos` (dos), `reclamaciones`, `tarifas-envio` y `usuarios` | `text-white` | `text-on-primary` |
| Tienda `app.layout.ts` 166 (contador del carrito) | `bg-accent … text-white` | `text-on-accent` |
| Tienda `app.layout.ts` 323 y 345 (pie) | `text-white`, `hover:text-white` | `text-footer-heading`, `hover:text-footer-heading` |
| Admin `contenido.page.ts` 34 (inicial del logo) | `text-white` sobre `form.primaryColor` | `bg-primary text-on-primary` (el color del formulario desaparece) |
| `primary` como primer plano sobre fondos claros: `text-primary` (23 usos), `border-primary` (5), `ring-primary` (1) y `color` o `border-color: var(--ws-primary)` en CSS (unos 15) | `--ws-primary` | `text-link`, `border-link`, `ring-focus-ring` y `var(--ws-link)`. Se cambian solo los usos de primer plano; los rellenos (`bg-primary`, `background: var(--ws-primary)`) se quedan |
| `src/index.html` y `projects/admin/src/index.html` | `meta theme-color #1d4ed8` | Se queda; `TemasFacade` lo actualiza |

En `@theme inline` se añaden `--color-on-primary`, `--color-on-primary-soft`, `--color-on-accent`, `--color-link`, `--color-focus-ring`, `--color-footer-heading`, `--color-on-media` y `--color-scrim`.

El inventario de usos de `primary` como primer plano se repasa uno por uno en T7, con la regla de la última fila. El control automático de TEST-18 impide que quede un color fijo.

## Tipos intermedios y nombres

| Tipo o nombre | Definición | Tareas que lo usan |
|---|---|---|
| `WEBSTORE_DEMO_MODE` | Variable de entorno del BFF. Solo `true` enciende el modo demo, sin distinguir mayúsculas y sin espacios en los extremos. Ausente, vacía o con otro valor (`false`, `1`, `sí`), queda apagado, también fuera de producción (D4 y el caso límite de valor no reconocido). `readConfig` la expone como `demoMode: boolean` | T6, T12, e2e |
| `ws_tema_vista_previa` | Cookie con el id del tema de la tuerca: `Path=/`, `SameSite=Lax`, `Max-Age=2592000` (30 días) y `Secure` si la página va por `https`. Sin `Domain`, la cookie es del host. La escribe `TemasFacade` con `document.cookie`, y en modo demo la lee el BFF para `theme.css` | T6, T9, T10, T12 |
| `appearance` | `{ revision: number, activeThemeId: string, customThemes: TemaPropioGuardado[] }` en el estado | T4, T3 |
| `ColoresTema` (contrato: `colors`) | `{ primary, secondary, background, surface, contrast }`, cada uno `#RRGGBB`. En el frontend se llama `ColoresTema`, con los mismos campos del contrato | Todas |
| `Tema` (DTO) | `{ id, name, kind: 'predefined' \| 'custom', colors: ColoresTema, tokens: TokensTema }` | T3, T6, T9, T11 |
| `TokensTema` | `Readonly<Record<NombreToken, string>>`, con las claves de la [tabla de tokens](#tokens-del-tema) salvo los fijos | T1, T7, T9, T11 |
| `TOKENS_DEL_TEMA` | Lista ordenada de los nombres de token de un tema (constante del dominio del BFF y de su réplica en el Admin) | T1, T11, TEST-18 |
| `Apariencia` | `{ demoMode: boolean, activeThemeId: string, themes: readonly Tema[] }` | T6, T9, T12 |
| `TemasAdmin` | `{ revision: number, activeThemeId: string, themes: readonly Tema[] }` | T6, T12, T13 |
| `ParContraste` | `{ par: 'contrast/background' \| 'contrast/surface' \| 'muted/background' \| 'muted/surface' \| 'onPrimary/primary' \| 'onPrimary/primaryStrong' \| 'onPrimarySoft/primarySoft' \| 'onAccent/accent' \| 'link/background' \| 'link/surface' \| 'focusRing/background' \| 'focusRing/surface' \| 'footerText/footer' \| 'disabledText/disabled', relacion: number, minimo: 4.5 \| 3, bloquea: boolean }`. Solo los dos primeros bloquean (D7) | T1, T2, T11, T13 |
| `revisarContraste(colores, predefinidos): readonly ParContraste[]` | Devuelve todos los pares medidos. El Admin muestra los que están por debajo de su mínimo; el BFF rechaza si alguno con `bloquea` lo está | T1, T2, T11, T13 |
| `tokensDelTema(colores, predefinidos): TokensTema` | Derivación de la tabla de tokens, con la regla de la base neutra. `predefinidos` llega como parámetro: el Admin lo toma de la lista que da el BFF y no replica las constantes | T1, T11 |
| `temaVisible(apariencia, idVistaPrevia): { tema: Tema; esVistaPrevia: boolean; borrarVistaPrevia: boolean }` | Sin modo demo, el tema activo y `borrarVistaPrevia: true` si había cookie. Con modo demo, la vista previa si existe; si no, el activo y `borrarVistaPrevia`. Si el activo no está en la lista, el primero, que es `b` | T9, T12 |
| Ids y nombres predefinidos | `a` «Violeta tienda», `b` «Azul cobalto», `c` «Grafito y ámbar» | Todas |
| `themes.manage` | Permiso nuevo, solo del `superadmin`. Etiqueta en el menú: «Temas» | T5, T13 |
| `TemasDesactualizadosError`, `ReglaTemaError` | Errores del puerto `TemasGateway`, con el mismo patrón que `SnapshotDesactualizadoError` y `ReglaTiendaError`. `ReglaTemaError` lleva `code` y `details` para marcar el campo del formulario | T12, T13 |
| Rutas y selectores | `/temas` (Admin); `ws-selector-tema`, `ws-admin-selector-tema`, `ws-admin-temas` y `ws-admin-vista-previa-tema` | T10, T12, T13 |
| Nombre accesible de la tuerca | «Cambiar tema»; la opción del panel, «Volver al tema activo» | T10, T12, e2e |

Restricción de las pruebas del frontend: los `*.spec.mjs` transpilan el `.ts` y **borran sus líneas `import`**, como [`resumen.rules.spec.mjs`](../../../../frontend/projects/admin/src/app/features/tienda/domain/resumen.rules.spec.mjs). Por eso `tema.rules.ts` y `tema-visible.rules.ts` solo importan tipos, y el contraste, la mezcla y la derivación del Admin viven en el mismo `tema.rules.ts`.

## Dependencias y riesgos

| Riesgo o dependencia | Impacto | Mitigación |
|---|---|---|
| La refactorización de tokens cambia B sin querer | Falla AC-01 en muchas pantallas | Tabla de sustituciones con equivalencias exactas; capturas «antes» de B en `dev` antes de tocar nada (T0); comparación tarea por tarea; TEST-18 comprueba que el mapa B del BFF es idéntico a `tokens.css` |
| El build de Angular procesa los `<link>` de `index.html` (optimización de CSS crítico) y no encuentra `/bff/appearance/theme.css` en disco | El build falla, o la hoja deja de bloquear el pintado | Comprobación al empezar T8 con `ng build` de las dos aplicaciones. Si ocurre, el `<link>` se excluye de la optimización con la opción que ofrezca la versión instalada, y la decisión se anota en el ADR-0010 |
| La hoja `theme.css` bloquea el primer pintado | Si el BFF tarda, la página tarda lo mismo | El BFF responde desde memoria (unos 2 kB); TEST-25 mide frente a `dev`. Si el BFF falla del todo, el navegador sigue con B. El BFF productivo deberá servirla con caché (anotado en el contrato, «Producción») |
| La cookie de la tuerca no se comparte si la tienda y el Admin de la demo pública están en dominios sin relación (túneles con nombres aleatorios) | AC-21 al pasar de la tienda al Admin solo se cumple en `localhost` y en subdominios de un mismo dominio | Se documenta en la puesta en marcha de la demo. PBI-0042, que publicará la demo en un dominio propio, lo resuelve con subdominios. Con hosts sin relación, cada aplicación recuerda su vista previa por separado |
| Las reglas del Admin se separan de las del BFF | La vista previa o el aviso de contraste no coinciden con lo que guarda el BFF | Mismos casos en TEST-01, TEST-03 a TEST-05 y TEST-14, con los valores esperados de la [medida previa](#tokens-del-tema). El BFF sigue siendo la autoridad: si discrepan, el guardado devuelve el error del BFF |
| Valores no presentados de A y C (derivados) | Un par de A o C queda por debajo de AA, o C se ve distinto de lo esperado | TEST-03 mide todos los pares. T14 es ⚠: Sebastián aprueba las capturas de A y C |
| El velo del hero y los gráficos del Resumen se calculan con `--ws-primary` | Con C se ven ámbar, no azul | Es el cambio pedido (AC-02). Se revisa en las capturas de T14 |
| Un Admin anterior, todavía en caché, envía los colores en `config` | El BFF guardaría colores que ya no se usan | `sinColoresDeContenido` los descarta (AC-22, TEST-13) |
| `contenido.page.ts` usa `form.setValue(config)`, que falla si `config` trae claves que el formulario no tiene | Contenido deja de cargar | La migración borra las dos claves y el BFF nunca las devuelve. TEST-11 y la e2e de Contenido lo cubren |
| El BFF de las e2e arranca en modo demo, así que la tuerca está en todas las páginas de todas las specs | Una spec existente podría fallar si la tuerca tapa un control | Es justo lo que prohíbe AC-15: si pasa, se corrige la posición de la tuerca, no la spec |
| La demo pública del equipo ocupa los puertos 3000, 4200 y 4300 desde el checkout principal | El worktree no puede levantar ahí sus servidores, y no se puede detener la demo | Las capturas y el QA manual se hacen en los puertos de las e2e (BFF 3400, tienda 4400, Admin 4500, con `proxy.e2e.conf.json`), nunca a la vez que la suite e2e. Los datos salen de la copia `backend/data-capturas.json` ([capturas](#capturas-antes-y-después)) |
| Cambio incompatible del contrato (`primaryColor` y `secondaryColor`) | Disparador de revisión adicional | BFF, contrato, smoke test y adaptadores cambian en el mismo PR (STD-05) |
| PBI-0043 (modelo de datos de Daniel) | Si llega con otra forma, el almacenamiento de temas habría que adaptarlo | Aislado en `appearance` y en `temas.*.mjs`: [alineación](#estado-del-bff). No bloquea |
| PBI-0037 y PBI-0038 (fondo de la tienda y panel del checkout) | Cambiarían los valores de los predefinidos | Están en una constante del dominio, cubierta por TEST-02 y TEST-03. Cambiarlos es una tarea pequeña que no necesita migración |
| `STD-08` solo permite el token en `sessionStorage` y el carrito en `localStorage` | La cookie de la vista previa no está prevista | ADR-0012 amplía STD-08: un id de tema, no sensible, solo en modo demo |

## Decisiones

- **Acordadas** (técnicas, derivadas de la especificación y de la arquitectura vigente):
  1. Variable del modo demo: **`WEBSTORE_DEMO_MODE`**. Solo `true` la enciende ([valores](#tipos-intermedios-y-nombres)), y está apagada por defecto, también en producción (D4). Se documenta en `backend/architecture.md` §3. Para la demo pública del equipo, `docs/development/local-environment.md` explica cómo arrancar el BFF con `WEBSTORE_DEMO_MODE=true` en PowerShell y en bash.
  2. Permiso propio **`themes.manage`**, solo del `superadmin`, en el BFF y en la réplica del Admin. `content.manage` sigue igual para `admin`.
  3. Los predefinidos son constantes del dominio. B copia `tokens.css` al pie de la letra, comprobado por TEST-18.
  4. Estado `appearance` con revisión propia y migración `schemaVersion: 3` ([detalle](#estado-del-bff)), con la desambiguación «Colores de Contenido (2)».
  5. Tokens nuevos, tabla de sustituciones, derivación D2 con la regla de la base neutra y fijos comunes ([tokens](#tokens-del-tema)).
  6. Ante colores de Contenido en una petición, el BFF los **descarta sin error** (AC-22 deja elegir entre ignorar y rechazar). Rechazar rompería un Admin anterior todavía abierto, que también envía el resto de Contenido.
  7. Una feature `temas` en cada aplicación, con `temas → sesion` en el Admin. La tuerca se monta en la raíz (`App`), así que también sale en el acceso al Admin y en la página 404.
  8. El tema activo de AC-10 se aplica sin recargar en el Admin de quien lo activa. En la tienda y en otros Admin abiertos, en su siguiente carga (AC-08, AC-10).
  9. La e2e arranca el BFF con `WEBSTORE_DEMO_MODE=true`. AC-16 se prueba en tres niveles: con la variable sin definir en la integración del BFF (TEST-12), en el contrato (TEST-13) y en una e2e que sustituye `demoMode` por `false` en la respuesta real de `/bff/appearance` (TEST-21).
  10. Puesta en marcha de Ecom (D6): documento nuevo `docs/development/puesta-en-marcha.md`, enlazado desde la tabla de `AGENTS.md`. Cubre la instalación de un cliente: `WEBSTORE_DEMO_MODE` sin definir, cambio de las contraseñas sembradas, logo en Contenido y, para Ecom, activar C desde Admin → Temas con el `superadmin`.
  11. Las capturas y el QA manual usan los puertos de las e2e, nunca a la vez que la suite.
- **Condicionadas** (las bloquea el [hito de arquitectura](#hito-de-arquitectura)):
  - Pregunta 1, el contrato: bloquea T3, T6, T12 y T13.
  - Pregunta 2, el parpadeo: bloquea T8 y la forma de `theme.css` en T6.
  - Pregunta 3, la vista previa: bloquea la cookie en T6, T9, T10 y T12. La especificación aprobada dice que el tema de la tuerca «no viaja al BFF» (tabla de datos). La alternativa recomendada lo matiza: viaja en la cookie, pero el BFF solo la usa para elegir la hoja y no la guarda. Por eso necesita la aprobación expresa de Sebastián.
  - Pregunta 4, dónde se calculan los tokens: bloquea T1 y T11.
- **ADR necesarios** (`sdd-decide`):
  - **ADR-0010. Aplicar el tema activo con una hoja de estilos del BFF.** `theme.css` bloquea el primer pintado; `tokens.css` es el respaldo B; los nombres de los tokens forman un contrato entre el BFF y los frontends. Recoge las preguntas 2 y 4.
  - **ADR-0011. Guardar los temas como recurso propio del BFF.** Rutas y revisión propias, predefinidos en el código, permiso `themes.manage` (cambia la tabla de roles fijos del 05/11), migración v3 y alineación con PBI-0043. Recoge la pregunta 1.
  - **ADR-0012. Modo demo con `WEBSTORE_DEMO_MODE` y vista previa en una cookie.** Amplía [STD-08](../../../architecture/standards.md) con la cookie `ws_tema_vista_previa`. Recoge la pregunta 3.

## Estrategia de pruebas

TDD obligatorio según [STD-18](../../../architecture/standards.md): BFF en `domain/`, `application/` y el contrato de `api/`; frontend en `domain/` de cada feature. Los componentes y las e2e salen de los AC.

| ID | Nivel | Qué verifica | AC | TDD obligatorio | Comando |
|---|---|---|---|---|---|
| TEST-01 | BFF `domain/` | `relacionDeContraste`: blanco y negro dan 21; `#1D4ED8` sobre blanco, 6.70; `#F2B705` sobre blanco, 1.8 (redondeado); es simétrica. `mezclarSrgb(#1D4ED8, 0.62, #0F172A)` = `#183996` y `(#1D4ED8, 0.10, #FFFFFF)` = `#E8EDFB` | AC-13, AC-14 | Sí | `npm test --prefix backend` |
| TEST-02 | BFF `domain/` | `TEMAS_PREDEFINIDOS`: ids, nombres, cinco colores y valores presentados de la especificación; mapa completo (`TOKENS_DEL_TEMA`) en los tres | AC-01, AC-03, AC-13 | Sí | `npm test --prefix backend` |
| TEST-03 | BFF `domain/` | Pares de la [medida previa](#tokens-del-tema) para A, B y C: todos ≥ 4.5 (≥ 3 el foco). En C, `on-primary`, `link` y `focus-ring` son `#1F2328` | AC-13, AC-20 | Sí | `npm test --prefix backend` |
| TEST-04 | BFF `domain/` | `tokensDelTema` en temas propios: principal claro (`#FFD400` sobre la base de B), con texto, enlace y foco en el color de contraste; `#123456` sobre la base de B hereda la escala neutra de B, con `primary-strong` = `color-mix(in srgb, #123456 62%, #0F172A)`; base oscura (`#111318`, `#1B1E25`, `#F5F7FA`), donde el texto sobre el principal queda en aviso y no bloquea | AC-20, AC-23 | Sí | `npm test --prefix backend` |
| TEST-05 | BFF `domain/` | `revisarContraste`: con el contraste por debajo de 4.5 sobre un fondo, bloquea y da el par y la relación; con otro par por debajo, solo avisa | AC-14 | Sí | `npm test --prefix backend` |
| TEST-06 | BFF `domain/` | `exigirTemaValido`: nombre vacío o de solo espacios; repetido sin distinguir mayúsculas ni espacios, también frente a «Azul cobalto»; más de 40 caracteres; color ausente, `#12345`, `rgb(…)` o `#GGGGGG` dan `INVALID_THEME_COLOR` con `field`; normaliza a mayúsculas. `exigirTemaPropio` y `exigirTemaBorrable` | AC-05, AC-09, AC-11, AC-12 | Sí | `npm test --prefix backend` |
| TEST-07 | BFF `application/` | `temas.use-cases` con un almacén en memoria: crear (no se activa, sube la revisión y guarda), editar, borrar uno que no es el activo, borrar el activo (`ACTIVE_THEME_IN_USE`, sin cambios), editar o borrar un predefinido (`PREDEFINED_THEME_READ_ONLY`, sin cambios), activar un predefinido y un propio, id inexistente (`THEME_NOT_FOUND`), revisión vieja (`STALE_THEMES`, sin cambios y sin `save`) | AC-05 a AC-10, AC-19 | Sí | `npm test --prefix backend` |
| TEST-08 | BFF `application/` | `temas.queries`: `apariencia` en modo demo (todos los temas) y sin él (solo el activo); `hojaDeEstilos` con una vista previa válida, inexistente o sin modo demo (sirve el activo); el CSS empieza por `:root:root {` y declara todos los tokens | AC-15, AC-16, AC-21, AC-24 | Sí | `npm test --prefix backend` |
| TEST-09 | BFF `domain/` | `rol.rules`: `themes.manage` solo para `superadmin`. Amplía `rol.rules.test.mjs` | AC-04 | Sí | `npm test --prefix backend` |
| TEST-10 | BFF `infrastructure/` (unitaria de `normalizeState`) | **Caracterización primero**, sobre el código actual: un `config` con borgoña pasa a B. Después: estado v2 con `#123456` crea «Colores de Contenido» activo, con los tres colores de B, y deja `config` sin colores; v2 con los colores de B en minúsculas no crea nada; borgoña no crea nada; si ya existe el nombre, «(2)»; un hex inválido cuenta como B; un estado v3 no cambia al normalizar otra vez; un `activeThemeId` desconocido pasa a `b` | AC-23, AC-24 | No por STD-18. Se escribe primero por ser ⚠ (migración de datos) | `npm test --prefix backend` |
| TEST-11 | BFF integración | BFF real con un `data.json` temporal v2 (con `#123456`): `/bff/appearance` da activo el tema migrado; `/bff/content/settings` no trae colores; un BFF sin archivo da activo `b` | AC-23, AC-24 | No | `npm test --prefix backend` |
| TEST-12 | BFF integración | `WEBSTORE_DEMO_MODE` sin definir, `false`, `1` y `sí`: `demoMode: false` y `theme.css` ignora la cookie. `TRUE` y ` true `: `demoMode: true` y `theme.css` sirve la vista previa de la cookie. `Content-Type: text/css` y `Cache-Control: no-cache` | AC-16, AC-21 | No | `npm test --prefix backend` |
| TEST-13 | Contrato del BFF (smoke) | Las rutas nuevas con cada código de error; `403 INSUFFICIENT_ROLE` para `admin` y `vendedor` en las cinco rutas del Admin; `401` sin sesión; `409 STALE_THEMES` con dos guardados sobre la misma revisión; el `PUT /admin/snapshot` con `primaryColor` no lo publica en `/content/settings` | AC-04, AC-05, AC-09, AC-11, AC-12, AC-14, AC-19, AC-22 | Sí | `npm run test:contract --prefix backend` |
| TEST-14 | Frontend `domain/` (Admin) | `tema.rules.spec.mjs`: los mismos casos y valores esperados de TEST-01, TEST-03 (con los predefinidos como dato), TEST-04, TEST-05 y la parte de nombre de TEST-06 | AC-07, AC-11, AC-14, AC-20 | Sí | `npm test --prefix frontend` |
| TEST-15 | Frontend `domain/` (tienda y Admin) | `tema-visible.rules.spec.mjs`, uno en cada aplicación: sin modo demo, el activo y borrar la cookie; con modo demo y vista previa existente, la vista previa; con vista previa borrada, el activo y borrar; con el activo ausente de la lista, `b` | AC-16, AC-21 | Sí | `npm test --prefix frontend` |
| TEST-16 | Límites de arquitectura | Sheriff y ESLint aceptan `temas → sesion` en el Admin y rechazan que la `temas` de la tienda importe la del Admin, sin desactivar reglas | — (STD-01) | No | `npm run lint` y `npm run test:architecture` (desde `frontend/`) |
| TEST-17 | Build | Las dos aplicaciones compilan con el `<link>` de `theme.css` en `index.html` y respetan los presupuestos | AC-18 | No | `npm run build:all` (desde `frontend/`) |
| TEST-18 | Estructura | En `tools/validate-structure.mjs`: (a) el mapa de B en `temas-predefinidos.mjs` es igual, declaración por declaración, a los tokens del tema de `tokens.css`; (b) no queda ningún hex, `rgb()`, `rgba()`, `white`, `black` ni utilidad `*-white`/`*-black` fuera de `tokens.css` en `frontend/src` y `frontend/projects`, sin contar `index.html`; (c) los dos `index.html` tienen el `<link>` de `theme.css` | AC-01, AC-02 | No | `npm run validate:structure` |
| TEST-19 | E2E | `admin-temas.spec.ts` (nueva): el `superadmin` ve A, B y C como predefinidos y sin «Editar» ni «Borrar»; crea un tema (nombre repetido y contraste insuficiente: no guarda y explica el motivo; aviso de otro par: guarda); la vista previa cambia y el resto del Admin no; edita; borra uno que no es el activo; el activo no se borra; activa C y el Admin lo aplica sin recargar (estilo calculado de un botón principal); deja B activo al terminar. `admin` y `vendedor` no ven «Temas» y `/temas` no se abre. Dos páginas de `superadmin`: la segunda recibe el aviso de datos desactualizados | AC-03 a AC-11, AC-14, AC-19 | No | `npm run test:e2e -- admin-temas` |
| TEST-20 | E2E | `storefront-temas.spec.ts` (nueva): con C activo (preparado por la API del Admin y restaurado al terminar), en inicio, catálogo, ficha, carrito y checkout ningún elemento visible tiene un color calculado de la lista de B (`#1D4ED8`, `#183996`, `#E8EDFB`, `#C2410C`, `#F3F5F8`, `#0F172A`, `#1E293B`, `#526075`, `#DDE3EC`, `#0F1B33` y `#C5CEDD`, con `getComputedStyle` sobre `color`, `background-color`, `border-*-color`, `outline-color`, `fill` y `stroke`); el logo y las imágenes conservan su `src`; al recargar sigue C | AC-02, AC-08, AC-17 | No | `npm run test:e2e -- storefront-temas` |
| TEST-21 | E2E | `storefront-modo-demo.spec.ts` y `admin-modo-demo.spec.ts` (nuevas): la tuerca «Cambiar tema» se abre y se maneja con teclado; elegir C lo aplica sin recargar; tras recargar sigue C; el Admin, en el mismo contexto, muestra C; un segundo contexto ve B; `/bff/appearance` sigue con `activeThemeId: b`; «Volver al tema activo» borra la cookie; con `demoMode: false` en la respuesta, la tuerca no está en el DOM. La tuerca no se superpone al carrito, a «Pagar» ni al menú del Admin (cajas sin intersección a 1440 y 390 px) | AC-15, AC-16, AC-21 | No | `npm run test:e2e -- modo-demo` |
| TEST-22 | E2E | Parpadeo: con C activo y `theme.css` retrasada 800 ms con `page.route`, el `first-contentful-paint` ocurre después del `responseEnd` de `theme.css`, y el primer color de fondo pintado es el de C. Si `theme.css` se aborta, la tienda se ve con B | AC-18 | No | `npm run test:e2e -- storefront-temas` |
| TEST-23 | Comparación de capturas | B frente a `dev` (iguales, AC-01); A y C frente a B (solo cambian colores, AC-02); modo demo con el panel abierto y sin él; [tabla de capturas](#capturas-antes-y-después). Consola sin errores | AC-01, AC-02, AC-15, AC-16, AC-17 | No | Panel del navegador o [`frontend/tools/qa/`](../../../../frontend/tools/qa/) |
| TEST-24 | Rendimiento | `first-contentful-paint` de `/` en frío, mediana de 5 cargas con el mismo método, frente a `dev` con los mismos datos y puertos: no empeora más de 50 ms ni más de un 10 %, el mayor de los dos | AC-18, REQ-16 | No | `cdp-visual-qa.mjs` o el panel del navegador (`performance.getEntriesByType('paint')`) |
| TEST-25 | E2E completo | Las specs existentes pasan con el BFF en modo demo y la tuerca en pantalla | AC-15 | No | `npm run test:e2e` (desde `frontend/`, en segundo plano) |

### Pruebas existentes afectadas

| Prueba | Qué puede cambiar: aserciones o solo valores esperados | Cómo se conserva la cobertura |
|---|---|---|
| [`contrato.smoke.mjs`](../../../../backend/tests/integration/contrato.smoke.mjs), bloque del CMS | **Cambia una aserción**, por D3 y AC-22: se quita `publicSettings.primaryColor !== '#123456'` y se comprueba que `primaryColor` ya no está en `/content/settings` aunque el `PUT` lo envíe | El bloque sigue comprobando el nombre, el logo, la navegación, las páginas y la privacidad. Se añade el bloque de temas (TEST-13) |
| [`rol.rules.test.mjs`](../../../../backend/tests/unit/domain/sesion/rol.rules.test.mjs) | Solo se **añaden** aserciones (TEST-09); las existentes no cambian | — |
| [`migracion-roles.test.mjs`](../../../../backend/tests/integration/migracion-roles.test.mjs) | Nada. Un estado v1 pasa por v2 y v3, y su `config` viene de la semilla, sin colores | Se ejecuta igual |
| [`admin-contenido.spec.ts`](../../../../frontend/tests/e2e/admin-contenido.spec.ts) | Nada: usa el título, la casilla «Términos y condiciones» y «Guardar configuración», que no cambian | Se ejecuta igual. Si falla, Contenido dejó de cargar (riesgo de `setValue`) |
| `admin-acceso`, `admin-resumen` y las seis `storefront-*` | Nada | TEST-25: pasan con la tuerca en pantalla |
| [`validate-structure.mjs`](../../../../tools/validate-structure.mjs): comprobaciones del CMS sobre `contenido.facade.ts` y `contenido.page.ts` | Nada: comprueban el logo, la navegación, las páginas y la recarga al recuperar el foco, y nada de eso cambia | Se añaden las comprobaciones de TEST-18 |

### Capturas antes y después

Método ([comparar capturas](../../../development/agent-execution.md#comparar-capturas)):

- BFF en el puerto 3400 con `WEBSTORE_DATA_FILE` apuntando a la ruta absoluta de `backend/data-capturas.json`, creada desde la semilla y sin modificar entre tomas. `WEBSTORE_ALLOWED_ORIGINS` = `http://localhost:4400,http://localhost:4500`.
- Tienda en el 4400 y Admin en el 4500, con `proxy.e2e.conf.json`.
- Mismo método y misma sesión de `superadmin` en las dos tomas.
- Las tomas «antes» (T0) salen de `dev` (`8c90fbe`), antes de cualquier cambio.
- Para A y C, el tema se activa por la API del Admin sobre la misma copia, y se vuelve a B al terminar.

| Pantalla o ruta | Anchos | Cambio visual esperado |
|---|---|---|
| Tienda: `/`, `/catalogo`, `/catalogo/<slug del primer producto de la semilla>`, `/carrito` (con un producto) y `/checkout` | 1440 y 390 px | Con B: ninguno (AC-01). Con A y C: solo colores (AC-02) |
| Admin: `/login`, `/` (Resumen), `/productos`, `/pedidos` y `/contenido` | 1440 y 390 px | Con B: ninguno, salvo que en `/contenido` desaparecen los dos selectores de color y la inicial del logo usa `bg-primary` (AC-22). Con A y C: solo colores |
| Admin: `/temas` | 1440 y 390 px | Página nueva (sin «antes»): lista, diálogo abierto con la vista previa y aviso de contraste |
| Tienda y Admin con `WEBSTORE_DEMO_MODE=true`: `/` y `/` del Admin, con la tuerca cerrada y con el panel abierto | 1440 y 390 px | Solo la tuerca y su panel (AC-15). Sin modo demo: igual que B (AC-16) |

### Ejecución prevista

Orden por dependencias. Ninguna tarea arranca antes del [hito de arquitectura](#hito-de-arquitectura) y de los ADR. Las ⚠ no se delegan ([reglas de escalado](../../../development/agent-execution.md#reglas-de-escalado)).

| Paso o tarea | Nivel y esfuerzo sugeridos | E2E | Criterios de aprobación (si es ⚠) |
|---|---|---|---|
| T0. Capturas «antes» de B en `dev` y medida de FCP (TEST-23 y TEST-24, primera toma) | ligero · medio | No | — |
| T1. Reglas de contraste, predefinidos y `tokensDelTema` en el BFF (TEST-01 a TEST-05) | avanzado · alto | No | — |
| T2. `exigirTemaValido`, `exigirTemaPropio` y `exigirTemaBorrable` (TEST-06) | estándar · alto | No | — |
| T3. `temas.use-cases` y `temas.queries` (TEST-07 y TEST-08) | estándar · alto | No | — |
| T4. ⚠ Semilla, `appearance`, migración v3 y `sinColoresDeContenido` (TEST-10 con la caracterización primero, y TEST-11) | avanzado · muy alto | Sí | TEST-10 y TEST-11 en verde. Un `data.json` real (copia) con colores propios se migra y la tienda se ve igual antes y después (captura de `/` a 1440 px). Un segundo arranque no cambia nada. `backend/data.json` no se tocó |
| T5. ⚠ Permiso `themes.manage` en el BFF y la réplica del Admin (TEST-09) | avanzado · muy alto | No | `admin` y `vendedor` conservan exactamente los permisos que tenían, comparados con la tabla anterior; `superadmin` gana solo `themes.manage`; la tabla de roles de `BFF-CONTRACT.md` está actualizada |
| T6. Rutas, `http.mjs` (CSS y cookie), `WEBSTORE_DEMO_MODE`, smoke test y `BFF-CONTRACT.md` (TEST-12 y TEST-13) | estándar · alto | Sí | — |
| T7. ⚠ Tokens nuevos en `tokens.css` y sustitución de colores fijos (TEST-18 a y b; TEST-23 con B) | avanzado · alto | Sí | Las capturas de B son iguales a las de T0 en todas las rutas y anchos, y TEST-18 está en verde. Cada uso de `primary` cambiado a `link` está en la lista del commit |
| T8. `<link>` de `theme.css` en los dos `index.html`, comprobación del build y TEST-22 | avanzado · alto | Sí | — |
| T9. Feature `temas` de la tienda: dominio (TEST-15), gateway y facade; Contenido sin colores en la tienda | estándar · alto | Sí | — |
| T10. Tuerca de la tienda (`SelectorTemaComponent`) | estándar · alto | Sí | — |
| T11. Dominio `temas` del Admin: réplica de las reglas (TEST-14 y TEST-15) | estándar · alto | No | — |
| T12. Gateway y facade del Admin, tuerca del Admin y Sheriff (TEST-16) | avanzado · alto | Sí | — |
| T13. `TemasPage`, `TemaDialog`, vista previa, ruta, menú y Contenido sin colores en el Admin (TEST-19) | avanzado · alto | Sí | — |
| T14. ⚠ Capturas de A, C y modo demo; e2e TEST-20, TEST-21 y TEST-25; medida de FCP (TEST-24) | avanzado · alto | Sí | Sebastián aprueba las capturas de A y C frente a las paletas presentadas. TEST-20, TEST-21 y TEST-25 están en verde. El FCP está dentro del margen de TEST-24 |
| T15. Documentos: glosario, sistema visual, arquitecturas, trazabilidad, `local-environment.md` y `puesta-en-marcha.md` | estándar · medio | No | — |

Bloques sugeridos para `sdd-implement`:

1. BFF: T1 a T6.
2. Tokens sin cambio visual: T0, T7 y T8. T0 puede ir primero, en paralelo con el bloque 1.
3. Tienda: T9 y T10.
4. Admin: T11 a T13.
5. Cierre: T14 y T15.

## Documentos afectados

- [`backend/docs/BFF-CONTRACT.md`](../../../../backend/docs/BFF-CONTRACT.md):
  - sección nueva «Apariencia y temas»;
  - «Contenido» sin los colores;
  - tabla de roles: `superadmin`, incluidos los temas;
  - migración `schemaVersion: 3`;
  - «Producción»: caché de `theme.css`.
- [`backend/architecture.md`](../../../../backend/architecture.md): capacidad `temas`, `WEBSTORE_DEMO_MODE` en §3, `SCHEMA_VERSION = 3` y las pruebas nuevas en §4.
- [`frontend/architecture.md`](../../../../frontend/architecture.md):
  - §1: `tokens.css` es la paleta B y el respaldo; el tema activo llega del BFF.
  - §2.2: `temas → sesion` en el Admin.
  - §3: la feature `temas` en las dos aplicaciones.
  - §5: la cookie de la vista previa y `theme.css`.
  - §6: las pruebas nuevas.
- [`frontend/docs/VISUAL-SYSTEM.md`](../../../../frontend/docs/VISUAL-SYSTEM.md):
  - «Dirección»: tres temas, B por defecto.
  - «Paleta y tokens»: tokens nuevos, tabla por tema con su contraste (AC-13), la regla de derivación y la de base neutra.
  - Se quita el párrafo de los colores configurables desde Contenido.
  - «Forma, ritmo y estados»: el foco usa `--ws-focus-ring`.
- [`docs/architecture/glosario.md`](../../../architecture/glosario.md): Tema, Tema predefinido, Tema propio, Tema activo, Modo demo, Vista previa del tema y Revisión de temas (`STALE_THEMES`).
- [`docs/architecture/standards.md`](../../../architecture/standards.md): STD-04 (los colores salen de los tokens del tema activo) y STD-08 (la cookie de la vista previa), según ADR-0010 y ADR-0012.
- [`docs/architecture/README.md`](../../../architecture/README.md): «Roles» y «Principios», donde la configuración del negocio incluye el tema.
- [`docs/planning/TRACEABILITY.md`](../../../planning/TRACEABILITY.md): REQ, AC y TEST de esta feature.
- [`docs/development/local-environment.md`](../../../development/local-environment.md): cómo arrancar el BFF en modo demo y los puertos de las capturas.
- `docs/development/puesta-en-marcha.md` (nuevo, D6), enlazado desde [`AGENTS.md`](../../../../AGENTS.md).
- ADR-0010, ADR-0011 y ADR-0012 en [`docs/adrs/`](../../../adrs/), desde `sdd-decide`.
- [`docs/specs/features/README.md`](../README.md): estado y bloqueos.

## Hito de arquitectura

Se pide aprobar:

- las capas y la feature `temas` en las dos aplicaciones, con `temas → sesion` en el Admin;
- el contrato nuevo y el cambio incompatible de Contenido;
- el estado `appearance` con su migración;
- la tabla de tokens;
- las decisiones acordadas;
- y estas cuatro preguntas, que se presentan de una en una.

### Pregunta 1. ¿Dónde viven los temas en el contrato?

| Alternativa | Qué significa |
|---|---|
| **A. Recurso propio (recomendada)** | `/bff/appearance` (público) y `/bff/admin/themes` y `/bff/admin/active-theme` (solo `superadmin`), con `appearance.revision` propia. Una venta no invalida un guardado de temas. AC-19 se cumple sin reintento automático. Encaja con la división en comandos que el contrato pide para producción y con una tabla `tema` futura (PBI-0043). Más código: rutas, casos de uso y otro gateway |
| B. Dentro del snapshot del Admin | `themes` y `activeThemeId` como colecciones del `PUT /admin/snapshot`, más una lectura pública. Menos rutas, pero comparte la revisión global: cualquier venta da `STALE_SNAPSHOT`. Además, `TiendaFacade` reintenta sola, así que habría que cambiar ese comportamiento para cumplir AC-19 |

Evidencia: [`snapshot.use-cases.mjs`](../../../../backend/src/application/admin/snapshot.use-cases.mjs) (revisión global) y [`tienda.facade.ts`](../../../../frontend/projects/admin/src/app/features/tienda/application/tienda.facade.ts) (reintento tras `SnapshotDesactualizadoError`).

### Pregunta 2. ¿Cómo se evita el parpadeo al cargar?

| Alternativa | Qué significa |
|---|---|
| **A. Hoja de estilos del BFF que bloquea el pintado (recomendada)** | `<link rel="stylesheet" href="/bff/appearance/theme.css">` en los dos `index.html`. Sin parpadeo, también en la primera visita. Si el BFF falla, se ve B. Añade una petición pequeña antes del primer pintado, que se mide en TEST-24, y hay que comprobar el build (riesgo de la optimización de CSS) |
| B. Último tema recordado en `localStorage` y aplicado con un script en línea | Sin petición extra. Parpadea en la primera visita y en la carga siguiente a un cambio del `superadmin`: no cumple AC-18 en todos los casos |
| C. Aplicar el tema desde Angular tras leer el JSON (como hoy Contenido) | Lo más simple. La página se pinta con B y luego cambia: no cumple AC-18 |

Evidencia: [`contenido.facade.ts`](../../../../frontend/src/app/features/contenido/application/contenido.facade.ts) aplica hoy los colores después del arranque.

### Pregunta 3. ¿Dónde se recuerda la vista previa de la tuerca?

| Alternativa | Qué significa |
|---|---|
| **A. Cookie `ws_tema_vista_previa` que el BFF lee solo en modo demo para servir `theme.css` (recomendada)** | La comparten la tienda y el Admin (AC-21). Al recargar, no parpadea. El id del tema viaja al BFF en la cookie, pero el BFF no lo guarda y no cambia nada para otras personas. Matiza la frase «no viaja al BFF» de la tabla de datos de la especificación |
| B. La misma cookie, que solo lee Angular | La tabla de datos se cumple al pie de la letra. Al recargar con una vista previa, la página se ve un momento con el tema activo y luego cambia. Solo pasa en modo demo |
| C. `localStorage` | La tienda y el Admin son orígenes distintos y no lo comparten: no cumple AC-21 al pasar de una a otra |

Evidencia: las cookies no distinguen el puerto (`localhost:4200` y `localhost:4300` las comparten) y `localStorage` sí. La demo pública con túneles solo comparte cookies si la tienda y el Admin están en subdominios del mismo dominio ([riesgos](#dependencias-y-riesgos)).

### Pregunta 4. ¿Dónde se calculan los tokens y el contraste?

| Alternativa | Qué significa |
|---|---|
| **A. En el BFF, con una réplica en el dominio del Admin (recomendada)** | El BFF es la autoridad: calcula los tokens que sirven `theme.css` y el JSON, y valida D7. El Admin replica las reglas para la vista previa y el aviso en vivo, como ya hace con los roles. Las pruebas de los dos usan los mismos casos. La tienda no calcula nada |
| B. En los dos frontends | El BFF solo guarda los cinco colores y valida el contraste. Tres copias de las reglas. No permite la hoja `theme.css` de la pregunta 2 |
| C. Solo en el BFF, con una ruta de vista previa para el Admin | Una sola copia. El formulario llama al BFF en cada cambio de color, con un retardo por petición, y no funciona sin conexión |

Evidencia: [`rol.rules.ts`](../../../../frontend/projects/admin/src/app/features/sesion/domain/rol.rules.ts) replica la tabla de [`rol.rules.mjs`](../../../../backend/src/domain/sesion/rol.rules.mjs) «solo para mostrar u ocultar opciones».
