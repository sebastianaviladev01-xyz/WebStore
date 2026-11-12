# 0010. Aplicar el tema activo con una hoja de estilos del BFF

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

### Por qué había que decidir

La feature [002](../specs/features/002-temas-configurables/specification.md) permite cambiar el tema activo desde el Admin, y AC-18 exige que la tienda cargue sin mostrar un momento otro tema, también en la primera visita. Hoy los colores de Contenido se aplican desde Angular después del arranque ([`contenido.facade.ts`](../../frontend/src/app/features/contenido/application/contenido.facade.ts)): la página se pinta con B y luego cambia. Es la pregunta 2 del [hito de arquitectura](../specs/features/002-temas-configurables/planning.md#pregunta-2-cómo-se-evita-el-parpadeo-al-cargar).

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Hoja de estilos del BFF que bloquea el pintado (elegida)** | Los dos `index.html` cargan `/bff/appearance/theme.css` con un `<link rel="stylesheet">` normal. El navegador no pinta hasta tenerla | Sin parpadeo en ningún caso, también en la primera visita y tras un cambio del `superadmin`. Si el BFF falla, se ve B, el de `tokens.css` | Una petición antes del primer pintado. Si el BFF acepta la conexión y no responde, la página espera |
| Último tema recordado en `localStorage`, aplicado con un script en línea | Un script en `index.html` aplica antes del arranque el tema de la visita anterior | Sin petición extra | Parpadea en la primera visita y en la carga siguiente a un cambio del `superadmin`: no cumple AC-18 |
| Aplicar el tema desde Angular tras leer el JSON | Como hoy los colores de Contenido | Lo más simple | La página se pinta con B y luego cambia siempre: no cumple AC-18 |

## Decisión

Aplicaremos el tema con una hoja de estilos que sirve el BFF:

- Los `index.html` de la tienda y del Admin cargan `/bff/appearance/theme.css` antes de que arranque Angular. Si el build procesa ese `<link>` al optimizar el CSS crítico, se excluye de esa optimización: la hoja tiene que seguir bloqueando el pintado.
- La hoja tiene un único bloque `:root:root { … }` con solo las declaraciones `--ws-*` del tema activo o, en modo demo, de la vista previa ([ADR-0012](0012-activar-el-modo-demo-y-recordar-la-vista-previa-en-una-cookie.md)). El selector repetido gana a `:root` de `tokens.css`.
- Se sirve con `Cache-Control: no-cache`, `Vary: Cookie` y un `ETag` calculado del cuerpo: el navegador revalida en cada carga, nunca usa una hoja vieja y recibe un `304` sin cuerpo si no cambió.
- [`tokens.css`](../../frontend/src/styles/tokens.css) sigue siendo la paleta B y el respaldo si la hoja no llega. Los nombres de los tokens del tema son un contrato entre el BFF y los dos frontends ([tabla de tokens](../specs/features/002-temas-configurables/planning.md#tokens-del-tema)); quién los calcula lo decide el [ADR-0011](0011-guardar-los-temas-como-recurso-propio-del-bff.md).
- Durante la sesión, los cambios de tema se aplican en vivo con `style.setProperty` sobre `<html>`.

*Motivo:* es la única opción que cumple AC-18 en todos los casos. El costo, una hoja pequeña que se revalida con `304`, se mide en TEST-24.

## Consecuencias

**Lo que se vuelve más fácil:**

- La primera imagen de cada página ya sale con el tema activo, sin código de Angular para evitar el parpadeo.
- Las plantillas y los estilos solo usan tokens; cambiar de tema no toca componentes.

**Lo que se vuelve más difícil:**

- El primer pintado depende de una petición al BFF. TEST-24 mide el tamaño de la hoja (4 kB como máximo), su tiempo y el FCP frente a `dev`.
- **Riesgo aceptado** por Sebastián Avila en el hito del 2026-11-11: si el BFF rechaza la conexión o responde con error, el `<link>` falla al momento y se ve B; si acepta la conexión y no responde, el navegador espera la hoja hasta su propio tiempo límite. Sin el BFF la tienda tampoco puede mostrar catálogo ni precios, así que pintar antes no la haría usable. [`frontend/architecture.md` §5](../../frontend/architecture.md#5-integración-con-el-bff) lo anota como decidido; se describirá como estado vigente en la tarea que implementa la hoja.
- El BFF productivo deberá servir la hoja con caché y la misma revalidación. Se anotará en la sección «Producción» del [contrato](../../backend/docs/BFF-CONTRACT.md) en la tarea que implementa las rutas de temas (STD-05).
- Ningún color fijo podrá quedar fuera de `tokens.css`: lo comprobará TEST-18, que se añadirá a `tools/validate-structure.mjs` en la tarea que sustituye los colores fijos.

**Fuera de alcance:**

- Temas oscuros completos: `color-scheme: light` no cambia, y los controles nativos siguen claros aunque un tema propio sea oscuro.
- `contrast-color()` de CSS: no está en todos los navegadores que soporta el proyecto.

## Referencias

- [Plan de la feature 002: enfoque, contrato y riesgos](../specs/features/002-temas-configurables/planning.md)
- [MDN — `ETag`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag)
