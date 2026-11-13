# 004. Ajustes de la tienda — Plan

- Feature: `004-ajustes-de-la-tienda`
- Especificación: [specification.md](specification.md) (aprobada el 2026-11-12; 15 REQ, 16 AC, decisiones D1 a D5)
- Estado: aprobado
- Fecha: 2026-11-12
- Hito de arquitectura: aprobado por Sebastián Avila el 2026-11-12. Respondió las [tres preguntas](#hito-de-arquitectura) con la alternativa A en las tres, con un ajuste en la 3: `--ws-border-strong` de B pasa a `#8894a6` para que el contorno de los campos llegue a 3:1 ([respuestas](#respuestas-del-hito)). Aprobó el plan completo el mismo día («Sí, apruébalo», desde su sesión principal)

## Enfoque

Cambian las tres aplicaciones, cada una en poco:

1. **BFF: un token más en el mapa del tema (D3).** `TOKENS_DEL_TEMA` pasa de 30 a 31 con `--ws-store-bg`, el lienzo de la tienda. `tokensDelTema` lo deriva igual al «fondo principal» en todo tema, también si hereda la escala neutra de un predefinido, porque no entra en `ESCALA_NEUTRA`. A, B y C lo fijan con un literal, como ya fijan su franja superior: A `#FAFAFB`, B `#f9fafc` y C `#F9F9FA` (D2). `--ws-bg` y `colors.background` no cambian. `PARES_DE_CONTRASTE` pasa de 15 a 20: cuatro pares sobre el token nuevo y uno del contorno de los campos sobre la superficie, que solo avisan. Además, `--ws-border-strong` de B pasa de `#8a96a8` a `#8894a6`, para que el contorno de los campos llegue al 3:1 de WCAG 1.4.11 ([ajuste del hito](#respuestas-del-hito)). El contrato solo crece: una clave más en `tokens` y una línea más en `theme.css`. No hay migración: los tokens se calculan al leer.
2. **Admin: la réplica de las reglas y la vista previa.** `tema.rules.ts` replica el token y los pares, con los mismos casos de `casos-tema.json`. La vista previa de Temas pinta su fondo con el lienzo de la tienda. El lienzo del Admin sigue en `--ws-bg` (REQ-15).
3. **Storefront: lienzo, textos, panel y campos.** El lienzo (`html`, `body`, el shell y la página 404) lee `--ws-store-bg` con una clase de Tailwind nueva, `bg-store-canvas`. El buscador de la cabecera sigue en `bg-canvas` (`--ws-bg`): conserva su relleno plomo y se sigue viendo como campo (AC-06). El diálogo pierde «Finalizar compra» y «Ver carrito» pasa a principal (D1). El carrito dice «Confirmar pedido» y el checkout, «Finalizar compra» en el título y en el botón (D1). Los tres pasos del checkout van en un panel, `ws-checkout-panel`, con el aspecto del resumen (D4). Sus diez campos usan la apariencia con contorno de Material, con los colores del tema puestos con los tokens `--mat-form-field-outlined-*` (D5).

La comparación del tono intermedio con el blanco (AC-14) no necesita código: con el token ya aplicado, la variante blanca se captura inyectando `:root { --ws-store-bg: #FFFFFF !important; }` en la página. Daniel elige con esas capturas. Si elige el blanco, una tarea cambia los tres literales y lo que depende de ellos ([valor final](#valor-final-del-lienzo)).

Alternativas descartadas:

| Alternativa | Por qué se descarta |
|---|---|
| Cambiar el «fondo principal» de A, B y C | El Admin perdería el plomo que Daniel aprobó. Alternativa A de D3, descartada en el hito de alcance |
| Aclarar el lienzo con CSS solo en la tienda, sin token del BFF | Aclara también los temas propios, el contraste no se mide y la vista previa deja de ser fiel. Alternativa C de D3 |
| Redefinir `--color-canvas` o `--ws-bg` en el `styles.css` de la tienda | `canvas` significaría cosas distintas en cada aplicación, el buscador perdería su relleno y, con `--ws-bg`, los pares medidos dejarían de describir lo que se pinta. Alternativa B de la [pregunta 1](#pregunta-1-cómo-lee-la-tienda-su-lienzo) |
| Derivar el token de los predefinidos con una regla «mitad hacia el blanco» | El valor final lo elige Daniel, quizá el blanco: la regla quedaría sin uso. Con `color-mix()` en CSS, además, el navegador redondea los canales impares (249.5) a su manera. Alternativa B de la [pregunta 2](#pregunta-2-dónde-va-el-token-en-el-mapa-y-cómo-lo-fijan-a-b-y-c) |
| Un panel por paso del checkout | Descartado en el hito de alcance (D4) |
| Animar el color del contorno de los campos con una transición propia | Obliga a tocar las clases internas de Material (`.mdc-notched-outline__*`), prohibido por STD-04. Alternativa C de la [pregunta 3](#pregunta-3-cómo-se-aplican-y-se-animan-los-campos-con-contorno) |

## Responsabilidades por capa

Nombres según [`frontend/architecture.md` §4](../../../../frontend/architecture.md#4-componentes-y-convenciones) y [`backend/architecture.md` §2](../../../../backend/architecture.md#2-convenciones).

| Capa | Elemento | Responsabilidad | REQ |
|---|---|---|---|
| BFF: `domain/temas/` | `tema.rules.mjs` | `TOKENS_DEL_TEMA` con `--ws-store-bg` justo antes de `--ws-bg` (31). `tokensDelTema` le da el valor de `colors.background`, herede o no la escala neutra. `ESCALA_NEUTRA` no cambia. `PARES_DE_CONTRASTE` con cinco pares nuevos al final, que no bloquean (20) | REQ-07, REQ-10, REQ-14 |
| BFF: `domain/temas/` | `temas-predefinidos.mjs` | A, B y C fijan `--ws-store-bg` con su literal (D2). B lo escribe en minúsculas, como el resto de su mapa, y su `--ws-border-strong` pasa a `#8894a6`. A y C derivan su `--ws-border-strong` y no cambian | REQ-05, REQ-10, REQ-14 |
| BFF: `domain/temas/` | `tema-propio.rules.mjs` | Sin cambios: solo bloquean `contrast/background` y `contrast/surface` | REQ-07 |
| BFF: `application/temas/` | `temas.queries.mjs` | Sin cambios de código: `theme.css` y los `tokens` de cada `Tema` recorren `TOKENS_DEL_TEMA` y ganan la línea nueva solos. El `ETag` cambia con el cuerpo | REQ-14 |
| BFF: `api/` e `infrastructure/` | Rutas, persistencia y migración | Sin cambios. `schemaVersion` sigue igual | — |
| Admin: `features/temas/domain/` | `tema.model.ts` | `NombreToken` con `'--ws-store-bg'`; `ParContraste['par']` con los cinco pares nuevos | REQ-07, REQ-14 |
| Admin: `features/temas/domain/` | `tema.rules.ts` | Réplica del BFF: `TOKENS_DEL_TEMA`, `tokensDelTema` y `PARES_DE_CONTRASTE`. Su `ESCALA_NEUTRA` (un `slice` desde `--ws-bg`) sigue excluyendo el token porque va antes | REQ-07, REQ-14 |
| Admin: `features/temas/presentation/` | `VistaPreviaTemaComponent` | El `figure` pasa de `bg-canvas` a `bg-store-canvas`. Los textos de la vista previa no cambian (AC-13) | REQ-15 |
| Admin: `features/temas/presentation/` | `TemaDialog` (`tema.dialog.ts`) | `NOMBRE_DEL_PAR` con los cinco pares nuevos ([nombres](#tipos-intermedios-y-nombres)). Aparecen como avisos, igual que los demás pares que no bloquean (AC-07) | REQ-07 |
| Admin: estilos | `projects/admin/src/styles.css` y `LoginPage` | Sin cambios: siguen con `--ws-bg` y `bg-canvas` | REQ-15 |
| Compartido | `frontend/src/styles/tokens.css` | `--ws-store-bg: #f9fafc` en `:root`, justo antes de `--ws-bg`, y `--ws-border-strong: #8894a6`, iguales al mapa de B (TEST-18 de la feature 002), y `--color-store-canvas: var(--ws-store-bg)` en `@theme inline` | REQ-05, REQ-10 |
| Storefront: `features/temas/domain/` | `tema.model.ts` | `NombreToken` con `'--ws-store-bg'`. Solo un tipo: ninguna regla cambia | REQ-14 |
| Storefront: `features/temas/application/` | `TemasFacade` | Sin cambios: ya escribe en `:root` todos los tokens que llegan | REQ-05 |
| Storefront: estilos | `src/styles.css` | `html` y `body` con `background: var(--ws-store-bg)` | REQ-05 |
| Storefront: `layout/` | `AppLayout` y `PaginaNoEncontradaPage` | Shell y página 404 de `bg-canvas` a `bg-store-canvas`. Los dos buscadores siguen en `bg-canvas` | REQ-05, REQ-06 |
| Storefront: `features/vitrina/presentation/` | `AgregarAlCarritoDialog` | Dos botones, en este orden: «Seguir comprando» (`mat-button`, cierra) y «Ver carrito» (`mat-flat-button`, a `/carrito`). `go()` solo acepta `'/carrito'` | REQ-01, REQ-02, REQ-04 |
| Storefront: `features/carrito/presentation/` | `CarritoPage` | El enlace principal del resumen dice «Confirmar pedido» y sigue yendo a `/checkout` | REQ-03, REQ-04 |
| Storefront: raíz de composición | `app.routes.ts` | Título de la ruta `checkout`: «WebStore \| Finalizar compra». La ruta no cambia | REQ-03 |
| Storefront: `features/checkout/presentation/` | `CheckoutPage` | `h1` «Finalizar compra» y sin la etiqueta oculta `ws-eyebrow` que repetía ese texto. El `div` que agrupa los tres pasos lleva `ws-checkout-panel`. Los diez `mat-form-field` llevan `appearance="outline"`, como los filtros del catálogo. El botón dice «Finalizar compra» («Procesando…» al enviar). Validaciones, cotización y envío, igual | REQ-03, REQ-08 a REQ-11 |
| Storefront: estilos | `src/styles/storefront.css` | `ws-checkout-panel` comparte con `ws-order-summary` la superficie, el borde, el radio de 14 px y el relleno de 28 px (22 px en móvil), sin el `sticky`. En el panel, los tokens `--mat-form-field-outlined-*` de la [pregunta 3](#pregunta-3-cómo-se-aplican-y-se-animan-los-campos-con-contorno) | REQ-08, REQ-09, REQ-12 |

### Dependencias entre features

Ninguna. Cada cambio queda dentro de su feature, en `layout/` o en los estilos ([`sheriff.config.ts`](../../../../frontend/sheriff.config.ts)).

## Contrato del BFF afectado

Las rutas, los códigos de error y los permisos no cambian. El contenido crece, sin cambios incompatibles ([contrato](../../../../backend/docs/BFF-CONTRACT.md)):

| Método | Ruta | Petición | Respuestas | Errores (`code`) | Roles |
|---|---|---|---|---|---|
| `GET` | `/bff/appearance` | Sin cambios | Cada `Tema` trae `tokens['--ws-store-bg']`: el literal en A, B y C y el `colors.background` en un tema propio | Sin cambios | Público |
| `GET` | `/bff/appearance/theme.css` | Sin cambios | El bloque `:root:root` tiene 31 declaraciones, con `--ws-store-bg` justo antes de `--ws-bg`. El `ETag` cambia porque cambia el cuerpo | Sin cambios | Público |
| `GET` | `/bff/admin/themes` | Sin cambios | Igual que `/bff/appearance`: un token más en cada `Tema` | Sin cambios | `themes.manage` |
| `POST` y `PUT` | `/bff/admin/themes`, `/bff/admin/themes/:id` | Sin cambios: siguen los cinco colores | `INSUFFICIENT_THEME_CONTRAST` sigue listando solo `contrast/background` y `contrast/surface`. Los pares nuevos no bloquean | Sin cambios | `themes.manage` |
| `POST` | `/bff/checkout/orders` | Sin cambios (REQ-11) | Sin cambios | Sin cambios | Comprador |

Compatibilidad: un cliente que ignore la clave nueva sigue funcionando. No es un [disparador de revisión adicional](../../../architecture/development-workflow.md#disparadores-de-revisión-adicional).

## Estado del BFF

| Colección o campo | Regla | Migración (`schemaVersion`) | REQ/ADR |
|---|---|---|---|
| `appearance.customThemes` | No cambian: el token se calcula al leer, desde `colors.background` | No | REQ-14, ADR nuevo |
| `appearance.activeThemeId` y `revision` | No cambian | No | — |

## Tipos intermedios y nombres

Términos del [glosario](../../../architecture/glosario.md): «Tema», «Tema predefinido», «Tema propio», «Carrito» y «Checkout». «Lienzo de la tienda» es el término nuevo de esta feature: el fondo de las páginas de la tienda, `--ws-store-bg`.

| Tipo o nombre | Definición | Tareas que lo usan |
|---|---|---|
| `--ws-store-bg` | Token del lienzo de la tienda, en `TOKENS_DEL_TEMA` justo antes de `--ws-bg`. Fuera de `ESCALA_NEUTRA` en las dos copias de las reglas | T1, T2, T3 |
| Valores de `--ws-store-bg` en A, B y C | A `#FAFAFB`, B `#f9fafc` y C `#F9F9FA` hasta que Daniel elija (AC-14). En un tema propio, `colors.background` | T1, T3, T7 |
| `--color-store-canvas` y la clase `bg-store-canvas` | Color de Tailwind de `tokens.css` que apunta a `var(--ws-store-bg)`. `canvas` sigue apuntando a `--ws-bg` | T3 |
| `contrast/storeBackground`, `muted/storeBackground`, `link/storeBackground` y `focusRing/storeBackground` | Pares nuevos de `PARES_DE_CONTRASTE`, en ese orden y después de `disabledText/disabled`. Primer plano `--ws-ink`, `--ws-muted`, `--ws-link` y `--ws-focus-ring`; fondo `--ws-store-bg`; mínimos 4.5, 4.5, 4.5 y 3; `bloquea: false` | T1, T2 |
| `borderStrong/surface` | Quinto par nuevo, el último de `PARES_DE_CONTRASTE`: primer plano `--ws-border-strong`, fondo `--ws-surface`, mínimo 3 (WCAG 1.4.11), `bloquea: false`. Mide el contorno en reposo de los campos con contorno | T1, T2 |
| `--ws-border-strong` de B | `#8894a6` (antes `#8a96a8`): 3.073:1 sobre `#ffffff`. En minúsculas, como el resto del mapa de B | T1, T3 |
| Nombres de los pares en `NOMBRE_DEL_PAR` | «Texto sobre el fondo de la tienda», «Texto secundario sobre el fondo de la tienda», «Enlaces sobre el fondo de la tienda», «Contorno de foco sobre el fondo de la tienda» y «Contorno de los campos sobre el fondo secundario» | T2 |
| [`casos-tema.json`](../../../../backend/tests/unit/domain/temas/casos-tema.json) | `predefinidos[].tokens` y `tokensDelTema[].tokens` con la clave nueva; `paresPredefinidos` y `tokensDelTema[].pares` con los cinco pares nuevos. `--ws-border-strong` pasa a `#8894a6` en B y en los dos casos que heredan la escala de B. El caso «principal claro sobre la base de B» espera `'--ws-store-bg': '#F3F5F8'`, su fondo, y no el de B | T1, T2 |
| `ws-checkout-panel` | Clase del panel que agrupa los tres pasos del checkout | T5 |
| `FONDO_DE_LA_TIENDA` | Constante de los e2e: `{ a: 'rgb(250, 250, 251)', b: 'rgb(249, 250, 252)', c: 'rgb(249, 249, 250)' }`. Sustituye a `FONDO` de `storefront-temas.spec.ts` | T3, T7 |
| `FONDO_PRINCIPAL` | Constante de los e2e del Admin: `{ b: 'rgb(243, 245, 248)' }`, el lienzo del Admin con B | T3 |

### Valor final del lienzo

Si Daniel elige el blanco (AC-14), T7 cambia el valor en estos sitios y en ningún otro:

- `temas-predefinidos.mjs` (A, B y C) y `tokens.css` (B, `#ffffff`).
- `casos-tema.json`: tokens de los predefinidos y `paresPredefinidos` (los pares nuevos pasan a valer lo mismo que los de `surface`).
- `FONDO_DE_LA_TIENDA` de los e2e. `#F9FAFC` sale de `COLORES_DE_B` en `storefront-temas.spec.ts`: el blanco también está en C.
- El sistema visual y la especificación, con la fecha de la elección.

Si elige el tono intermedio, T7 solo registra la elección.

## Dependencias y riesgos

| Riesgo o dependencia | Impacto | Mitigación |
|---|---|---|
| La réplica del Admin calcula `ESCALA_NEUTRA` con un `slice` desde `--ws-bg` hasta el final | Si el token va después de `--ws-bg`, un tema propio con la base de B heredaría el lienzo de B, contra REQ-14, solo en el Admin | El token va antes de `--ws-bg`. El caso de `casos-tema.json` con la base de B espera su propio fondo, y lo comprueban las dos copias (TEST-01 y TEST-06) |
| Daniel tarda en elegir el valor final | La feature no se cierra hasta que elija (AC-14) | La comparación (T6) va justo después de los cambios visuales, no al final. Lo demás avanza con el tono intermedio. El hito de entrega espera la elección |
| El cambio al blanco toca varios archivos | Valores desalineados entre el BFF, `tokens.css`, los casos y los e2e | Lista cerrada en [valor final](#valor-final-del-lienzo). TEST-18 de la feature 002 compara `tokens.css` con el mapa de B |
| Las zonas con `surface-subtle` (colecciones alternadas, fondo de las fotos) quedan más oscuras que el lienzo | Cambio visual no pedido | Se revisa en las capturas (TEST-17). Es el caso límite que prevé la especificación |
| `TemasFacade` escribe los tokens como estilo en línea de `<html>` | Una hoja normal no gana a ese estilo: la variante blanca no se vería | La comparación inyecta la variante con `!important` |
| Material decide una sola vez, al cargar, si hay movimiento reducido | Un e2e que cambie la preferencia después de cargar mediría la animación | TEST-13 fija `reducedMotion: 'reduce'` antes de abrir la página |
| Personalizar los campos de Material | Tocar internals, prohibido por STD-04 | Solo `appearance="outline"` y los tokens `--mat-form-field-outlined-*` en la clase del panel |
| Los e2e buscan los textos de hoy | Fallan `storefront-carrito`, `storefront-checkout`, `storefront-modo-demo` y `storefront-navegacion` | T4 los adapta ([pruebas afectadas](#pruebas-existentes-afectadas)) |
| «Finalizar compra» es a la vez el `h1` y el botón del checkout | Un localizador por texto encontraría dos elementos | Los e2e buscan por rol (`heading` nivel 1 y `button`). Se quita la etiqueta oculta, que era un tercero |
| En un tema propio, los pares nuevos valen lo mismo que los del fondo principal | Si uno de esos pares no llega a su mínimo, el diálogo de Temas lo avisa dos veces, con nombres distintos | Es lo que pide AC-07: los pares nuevos solo avisan. Se acepta |
| El contorno en reposo de los campos (`--ws-border-strong`) quedaba a 2.996:1 de la superficie con B, justo por debajo del 3:1 de WCAG 1.4.11; con A y C llega (3.43:1 y 3.16:1) | Los campos del checkout y los filtros del catálogo no llegaban al mínimo con B | **Resuelto en el hito**: B pasa a `#8894a6` (3.073:1). El par `borderStrong/surface` lo mide en A, B y C (TEST-03). Ya no hay entrada en el backlog |
| `--ws-border-strong` de B lo usan más elementos que los campos: `ws-btn-secondary`, el borde de `ws-icon-button` al pasar el ratón, el punto de «sin stock», el buscador de `/inicio-anterior` y, por `--mat-sys-outline`, los contornos de los controles de Material de la tienda y del Admin | Con B, esos bordes salen un poco más oscuros (dos niveles por canal) en la tienda y en el Admin: diferencias en las capturas fuera de lo que lista AC-13 | Es el efecto del ajuste del hito, no un cambio sin pedir: la [tabla de capturas](#capturas-antes-y-después) lo lista y T8 lo comprueba. Con A y C no cambia nada |
| Un tema propio con la base de B hereda la escala neutra de B | Su `--ws-border-strong` pasa a `#8894a6`: un cambio mínimo en un tema propio, aunque la especificación dice que los temas propios no cambian (lo dice de su lienzo, REQ-14) | Se acepta como mejora de contraste. Sus cinco colores y su lienzo no cambian. Se anota en la especificación y en el sistema visual (T9). Los dos casos de `casos-tema.json` con la base de B lo comprueban |
| Dependencias de la especificación: PBI-0043 y la elección de Daniel | — | PBI-0043 no bloquea: la feature no cambia datos de negocio |

## Decisiones

- **Acordadas** (de la especificación y de las reglas vigentes):
  - D1 a D5 de la [especificación](specification.md#decisiones-del-hito-de-alcance).
  - Sin migración ni datos nuevos en el estado del BFF ni en el navegador.
  - Los cinco pares nuevos van al final de `PARES_DE_CONTRASTE`, no bloquean y aparecen en el diálogo de Temas como avisos (AC-07). En un tema propio, `borderStrong/surface` puede dar un aviso nuevo; no impide guardar.
  - `--ws-border-strong` de B pasa a `#8894a6`, decidido por Sebastián Avila el 2026-11-12 en el hito ([respuestas](#respuestas-del-hito)).
  - Se quita la etiqueta oculta «Finalizar compra» (`ws-eyebrow`, con `display: none`) del checkout, que repetía el título. No cambia nada visible. Es la decisión que la especificación dejaba al plan.
  - El buscador de la cabecera conserva `bg-canvas`, así que no cambia (AC-06 y AC-13).
  - `appearance="outline"` en cada campo del checkout, como en los filtros del catálogo, y no un proveedor de opciones por defecto.
  - La comparación de AC-14 se hace sobre la tienda ya cambiada (lienzo, diálogo, panel y campos), con la variante blanca inyectada, sin una rama ni un modo aparte.
- **Condicionadas** (qué trabajo bloquean):
  - Pregunta 1 (cómo lee la tienda su lienzo): respondida el 2026-11-12 con A; ya no bloquea T3.
  - Pregunta 2 (posición del token y valores de A, B y C): respondida el 2026-11-12 con A; ya no bloquea T1 ni T2.
  - Pregunta 3 (campos con contorno): respondida el 2026-11-12 con A; ya no bloquea T5.
  - Elección del valor final por Daniel (AC-14): bloquea T7 y el hito de entrega.
- **ADR necesarios:** uno, que amplía [ADR-0011](../../../adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md): el mapa del tema gana el token del lienzo de la tienda, que no se hereda con la escala neutra, y los pares que se miden sobre él (D3). Lo redacta la etapa `sdd-decide` con las respuestas de las preguntas 1 y 2. Bloquea T1. Registrado como [ADR-0013](../../../adrs/0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md) (aceptado por Sebastián Avila el 2026-11-12). El cambio de `--ws-border-strong` en B no cambia lo que decide el ADR: es un valor de un predefinido, como los demás de su mapa, y ADR-0011 no fija valores ni pares. El ADR solo lo cita en sus consecuencias, con el par `borderStrong/surface` entre los que se miden (20).

## Estrategia de pruebas

TDD obligatorio según [STD-18](../../../architecture/standards.md): en esta feature, las reglas del BFF (`domain/temas/`), `theme.css` (`application/temas/`), el contrato y la réplica de las reglas en el `domain/` del Admin. El `domain/` del Storefront solo gana un nombre en un tipo, sin reglas. El diálogo, el carrito, el checkout, el layout y los estilos se prueban con e2e derivadas de los AC, que pueden escribirse junto al código: no hay entorno de pruebas de componentes de Angular ([§6](../../../../frontend/architecture.md#6-pruebas)).

| ID | Nivel | Qué verifica | AC | TDD obligatorio | Comando |
|---|---|---|---|---|---|
| TEST-01 | BFF `domain/` | `TOKENS_DEL_TEMA` tiene 31 nombres, con `--ws-store-bg` justo antes de `--ws-bg`. `tokensDelTema` da `--ws-store-bg` igual a `colors.background` con un tema derivado y con uno que hereda la escala de B (`#F3F5F8`, no `#F9FAFC`). Los casos `tokensDelTema` de `casos-tema.json` | AC-05, AC-07 | Sí | `npm test --prefix backend` |
| TEST-02 | BFF `domain/` | A, B y C: `--ws-store-bg` con `#FAFAFB`, `#f9fafc` y `#F9F9FA`; `--ws-bg` y `colors.background` sin cambios (`#F4F4F6`, `#f3f5f8` y `#F2F3F5`); `--ws-border-strong` de B en `#8894a6`; mapa completo y en orden; iguales a `casos-tema.json`. Un tema propio con la base de B hereda `#8894a6` | AC-05, AC-09, AC-15 | Sí | `npm test --prefix backend` |
| TEST-03 | BFF `domain/` | `PARES_DE_CONTRASTE` tiene 20 pares; los cinco nuevos al final, con sus mínimos y sin bloquear. En A, B y C alcanzan su mínimo, con los valores de `paresPredefinidos` (B: texto sobre el lienzo 17.09, texto secundario 6.11 y `borderStrong/surface` 3.07; A 3.43 y C 3.16). En un tema propio, los cuatro sobre el lienzo valen lo mismo que los de `background`. `validarTemaPropio` sigue bloqueando solo por los dos pares de siempre | AC-07, AC-09 | Sí | `npm test --prefix backend` |
| TEST-04 | BFF `application/` | `theme.css` de B y de un tema propio tiene 31 líneas, con `--ws-store-bg` justo antes de `--ws-bg` y con su valor | AC-05 | Sí | `npm test --prefix backend` |
| TEST-05 | Contrato del BFF | `/bff/appearance` trae `tokens['--ws-store-bg']` igual a `#f9fafc` con B; `theme.css` lo declara, con `--ws-border-strong: #8894a6`, y `--ws-bg` sigue en `#f3f5f8`; el resto del smoke de temas, igual | AC-05, AC-15 | Sí | `npm run test:contract --prefix backend` |
| TEST-06 | Frontend `domain/` (Admin) | La réplica de `tema.rules.ts` da los mismos tokens y pares que el BFF con `casos-tema.json`, también los casos con la base de B | AC-07, AC-15 | Sí | `npm test --prefix frontend` |
| TEST-07 | Estructura | TEST-18 de la feature 002: `tokens.css` igual al mapa de B, con `--ws-store-bg` y el `--ws-border-strong` nuevo; ningún color fijo fuera de `tokens.css` | AC-05, AC-12 | No | `npm run verify` (desde la raíz) |
| TEST-08 | Lint y build | `templateAccessibility`, Sheriff y el tipado de `NombreToken`, `TokensTema` y `ParContraste` en las dos aplicaciones | AC-10 | No | `npm run verify` |
| TEST-09 | E2E, `storefront-carrito.spec.ts` | El diálogo tiene «Producto agregado» y solo dos botones, «Seguir comprando» y «Ver carrito», en ese orden, sin «Finalizar compra»; «Ver carrito» tiene el fondo `--ws-primary` y «Seguir comprando» no. Igual desde la tarjeta del catálogo y desde la ficha. En la ficha, «Seguir comprando» y Escape cierran, la URL no cambia y el contador muestra el producto; «Ver carrito» lleva a `/carrito` con la cantidad. A 375 px, los dos botones caben sin desborde | AC-01, AC-02 | No | `npm run test:e2e` (desde `frontend/`) |
| TEST-10 | E2E, `storefront-carrito.spec.ts` | En `/carrito`, el enlace principal se llama «Confirmar pedido» y lleva a `/checkout`; «Seguir comprando» sigue debajo; la página no tiene «Continuar al checkout» ni «Finalizar compra» | AC-03 | No | `npm run test:e2e` |
| TEST-11 | E2E, `storefront-checkout.spec.ts` | Compra completa por el camino nuevo: ficha, «Ver carrito», «Confirmar pedido», `h1` «Finalizar compra» y título «WebStore \| Finalizar compra» en `/checkout`, botón «Finalizar compra» deshabilitado sin envío, total S/ 711.00, «Procesando…» y «Gracias por tu compra»; después, «Mis pedidos» y el Admin, como hoy. Con el carrito vacío, el `h1` es «Finalizar compra» sobre el estado vacío. Ningún `h1` dice «Checkout» | AC-04, AC-11, AC-16 | No | `npm run test:e2e` |
| TEST-12 | E2E, `storefront-checkout-panel.spec.ts` (nuevo) | Panel: los tres `h2` están dentro de un solo `.ws-checkout-panel`, con el fondo de `--ws-surface`, el borde de `--ws-border` y un radio de 14 px; relleno de 28 px a 1440 px y de 22 px a 375 px; a 1440 px, a la izquierda del resumen y, a 375 px, encima. Campos: en reposo, contorno de `--ws-border-strong` y sin relleno; con el foco, por clic y por Tab, contorno de `--ws-focus-ring` y de 2 px; inválido y tocado, color de error. Recorrido con Tab en el orden de hoy. Con A, B y C, colores del tema | AC-08, AC-09, AC-10, AC-12 | No | `npm run test:e2e` |
| TEST-13 | E2E (en `storefront-checkout-panel.spec.ts`) | Sin preferencia, la transición de la etiqueta del campo dura entre 1 y 200 ms; con `reducedMotion: 'reduce'` fijado antes de cargar, dura 0 s | AC-09, AC-10 | No | `npm run test:e2e` |
| TEST-14 | E2E, `storefront-temas.spec.ts` | El `body` usa `FONDO_DE_LA_TIENDA` con B y C, también cuando `theme.css` no llega (respaldo de B). Con un tema propio activo con la base de B, el lienzo es su fondo (`#F3F5F8`). El buscador de la cabecera conserva `--ws-bg` y no tiene el fondo de la cabecera. `COLORES_DE_B` suma `#F9FAFC` | AC-05, AC-06, AC-12 | No | `npm run test:e2e` |
| TEST-15 | E2E, `admin-temas.spec.ts` | Con B, el lienzo del login y del Resumen sigue en `FONDO_PRINCIPAL`. En Temas, la tarjeta de cada tema muestra su fondo principal de siempre y su vista previa se pinta con el lienzo de la tienda de ese tema. En el diálogo, un tema propio con texto secundario bajo su mínimo avisa también «Texto secundario sobre el fondo de la tienda» y se puede guardar | AC-07, AC-15 | No | `npm run test:e2e` |
| TEST-16 | E2E, `storefront-modo-demo.spec.ts` y `storefront-navegacion.spec.ts` | La tuerca no tapa «Confirmar pedido» del carrito ni «Finalizar compra» del checkout; la ruta `/checkout` carga con su título y su encabezado nuevos | AC-03, AC-04, AC-16 | No | `npm run test:e2e` |
| TEST-17 | Comparación de capturas | Antes y después con A, B y C ([capturas](#capturas-antes-y-después)): solo cambia lo que pide AC-13 | AC-06, AC-12, AC-13 | No | Panel del navegador o [`tools/qa/`](../../../../frontend/tools/qa/), con el BFF sobre una copia de los datos (`WEBSTORE_DATA_FILE`) |
| TEST-18 | Comparación del lienzo con el blanco | Un par de capturas por pantalla, tema y ancho, con el tono intermedio y con el blanco ([comparación](#comparación-del-tono-intermedio-con-el-blanco)) | AC-14 | No | Igual que TEST-17 |

Caracterización: el código que cambia ya tiene pruebas. Las reglas de temas están en `tema.rules.test.mjs`, `temas-predefinidos.test.mjs`, `temas.queries.test.mjs`, el smoke del contrato y `tema.rules.spec.mjs`. El diálogo, el carrito y el checkout los cubren `storefront-carrito`, `storefront-checkout`, `storefront-modo-demo` y `storefront-navegacion`. T0 ejecuta `npm run verify` y el e2e completo en `dev` antes de tocar código, como línea base.

### Pruebas existentes afectadas

| Prueba | Qué puede cambiar: aserciones o solo valores esperados | Cómo se conserva la cobertura |
|---|---|---|
| [`tema.rules.test.mjs`](../../../../backend/tests/unit/domain/temas/tema.rules.test.mjs) | Valores: 15 → 20 pares en las aserciones de cantidad y en sus títulos. Se añaden las de TEST-01 y TEST-03 | Los casos de hoy siguen; solo crecen |
| [`temas-predefinidos.test.mjs`](../../../../backend/tests/unit/domain/temas/temas-predefinidos.test.mjs) | Aserciones nuevas: el valor de `--ws-store-bg` en A, B y C, que `--ws-bg` no cambia y el `--ws-border-strong` de B. Las de hoy, igual | Recorre `TOKENS_DEL_TEMA` y `PARES_DE_CONTRASTE`, así que cubre el token y los pares nuevos sin más cambios |
| [`casos-tema.json`](../../../../backend/tests/unit/domain/temas/casos-tema.json) | Solo valores esperados: la clave nueva en los mapas, los cinco pares nuevos y `#8a96a8` → `#8894a6` en B y en los dos casos con su base (las tres apariciones de hoy) | Lo leen las dos copias de las reglas |
| [`temas.queries.test.mjs`](../../../../backend/tests/unit/application/temas/temas.queries.test.mjs) | Ninguna: cuenta las líneas con `TOKENS_DEL_TEMA.length`. Se añade la posición del token (TEST-04) | — |
| [`contrato.smoke.mjs`](../../../../backend/tests/integration/contrato.smoke.mjs) | Aserciones nuevas de TEST-05 | Las de hoy siguen |
| [`normalizar-estado.test.mjs`](../../../../backend/tests/unit/infrastructure/persistencia/normalizar-estado.test.mjs) y [`migracion-temas.test.mjs`](../../../../backend/tests/integration/migracion-temas.test.mjs) | Ninguna: usan `colors.background` de B, que no cambia | — |
| [`tema.rules.spec.mjs`](../../../../frontend/projects/admin/src/app/features/temas/domain/tema.rules.spec.mjs) | Ninguna: lee `casos-tema.json` | Los casos nuevos entran solos |
| [`storefront-carrito.spec.ts`](../../../../frontend/tests/e2e/storefront-carrito.spec.ts) | Aserciones: «Finalizar compra» pasa de estar a no estar; se añaden las de TEST-09 y TEST-10 | El mismo recorrido de cantidades, IGV, persistencia y eliminación |
| [`storefront-checkout.spec.ts`](../../../../frontend/tests/e2e/storefront-checkout.spec.ts) | Aserciones: del diálogo se va al carrito y de ahí al checkout; cambian el `h1` y el nombre del botón (TEST-11) | La misma compra, con el mismo total, el pedido en «Mis pedidos» y en el Admin |
| [`storefront-navegacion.spec.ts`](../../../../frontend/tests/e2e/storefront-navegacion.spec.ts) | Solo valores: título y encabezado de `/checkout` | Las mismas rutas |
| [`storefront-modo-demo.spec.ts`](../../../../frontend/tests/e2e/storefront-modo-demo.spec.ts) | Solo los localizadores y sus etiquetas: «Confirmar pedido» en el carrito y «Finalizar compra» en el checkout | Los mismos controles cerca de la tuerca |
| [`storefront-temas.spec.ts`](../../../../frontend/tests/e2e/storefront-temas.spec.ts) | Valores: `FONDO` pasa a `FONDO_DE_LA_TIENDA`. Aserciones: `#F9FAFC` en `COLORES_DE_B` y los casos nuevos de TEST-14 | Las mismas cinco rutas con C, el respaldo de B y el primer pintado |
| [`admin-temas.spec.ts`](../../../../frontend/tests/e2e/admin-temas.spec.ts) | Aserciones nuevas de TEST-15; las de hoy, igual | — |

### Capturas antes y después

Con el mismo método, las mismas rutas y los mismos anchos en las dos tomas ([comparar capturas](../../../development/agent-execution.md#comparar-capturas)), con el BFF sobre una copia de los datos y un producto en el carrito. Cada pantalla con los temas A, B y C, activados por la API del Admin como en `storefront-temas.spec.ts`. En el Admin, con `superadmin`.

| Pantalla o ruta | Anchos | Cambio visual esperado |
|---|---|---|
| Inicio (`/`) | 1440 y 375 px | Solo el lienzo |
| Catálogo (`/catalogo`) | 1440 y 375 px | Solo el lienzo |
| Ficha (`/catalogo/soundbar-cinema-500`) | 1440 y 375 px | Solo el lienzo |
| Diálogo «Producto agregado» sobre la ficha | 1440 y 375 px | Dos botones, «Ver carrito» relleno; el lienzo de detrás |
| Carrito (`/carrito`) | 1440 y 375 px | El lienzo y el texto «Confirmar pedido» |
| Checkout (`/checkout`) | 1440 y 375 px | El lienzo, el título «Finalizar compra», el panel de los tres pasos, los campos con contorno y el botón «Finalizar compra» |
| Checkout con un campo enfocado y otro inválido | 1440 y 375 px | Contorno de foco y de error (solo «después») |
| Cajón móvil con el buscador | 375 px | Solo el lienzo: el buscador, igual |
| Admin: login (`/login`) y Resumen (`/`) | 1440 y 375 px | Con A y C, ninguno. Con B, solo los contornos de los controles de Material, un poco más oscuros (`#8894a6`) |
| Admin: Temas (`/temas`) | 1440 y 375 px | El fondo de la vista previa de cada tema y, con B, los contornos como en la fila anterior |

Con B, en todas las pantallas de la tienda, también cambian un poco los bordes que usan `--ws-border-strong`: «Seguir comprando» y los demás `ws-btn-secondary`, los contornos de Material (filtros del catálogo, radios del checkout) y el punto de «sin stock». Es el ajuste del hito, no un cambio sin pedir. Con A y C, no cambian.

### Comparación del tono intermedio con el blanco

Para AC-14, una vez aplicados el lienzo, el diálogo, el panel y los campos (T6):

- Pantallas: inicio, catálogo, ficha, carrito y checkout; temas A, B y C; 1440 y 375 px. Son 30 pares.
- Cada par se toma con la misma ruta, los mismos datos y la misma sesión. La variante blanca añade a la página la hoja `:root { --ws-store-bg: #FFFFFF !important; }`: el `!important` gana a los tokens que `TemasFacade` escribe en `<html>`.
- Se guardan en `frontend/output/visual-qa/004-ajustes-de-la-tienda/comparacion-lienzo/`, con una hoja de contactos HTML que pone cada par lado a lado, para enseñarla a Daniel y adjuntarla al PR.
- Con las capturas en blanco se revisa también AC-06: tarjetas, paneles y cabecera separados por su borde, y el buscador visible como campo.
- La elección de Daniel, con su fecha, se registra en la especificación, en la verificación y en el sistema visual. T7 la aplica.

### Ejecución prevista

Orden por dependencias. Ninguna tarea arranca antes del [hito de arquitectura](#hito-de-arquitectura), y T1 tampoco antes del ADR de `sdd-decide`. Las ⚠ no se delegan ([reglas de escalado](../../../development/agent-execution.md#reglas-de-escalado)).

| Paso o tarea | Nivel y esfuerzo sugeridos | E2E | Criterios de aprobación (si es ⚠) |
|---|---|---|---|
| T0. Capturas «antes» de la tienda y del Admin con A, B y C, `verify` y e2e completo como línea base | ligero · medio | Sí | — |
| T1. ⚠ Token y pares en el BFF con TDD (TEST-01 a TEST-05) y `casos-tema.json` | avanzado · alto | No | TEST-01 a TEST-05 en verde, con el rojo de cada uno registrado antes del código. `--ws-bg` y `colors.background` de A, B y C sin cambios. `--ws-border-strong` de B en `#8894a6` y `borderStrong/surface` en verde con A, B y C. `theme.css` de B con 31 líneas. Ninguna migración ni cambio en `customThemes` |
| T2. Réplica del Admin (`tema.model.ts`, `tema.rules.ts` y `NOMBRE_DEL_PAR`) con TDD (TEST-06) | estándar · alto | No | — |
| T3. ⚠ `tokens.css`, `bg-store-canvas`, lienzo de la tienda, `NombreToken` del Storefront, vista previa del Admin, TEST-14 y TEST-15 | avanzado · alto | Sí | TEST-07, TEST-14 y TEST-15 en verde. Capturas con A, B y C: en la tienda solo cambia el lienzo; en el Admin, solo el fondo de la vista previa de Temas; y, con B, los bordes de `--ws-border-strong` en las dos aplicaciones. El buscador, igual. Sin parpadeo al cargar (TEST-22 de la feature 002 en verde) |
| T4. ⚠ Diálogo, textos de D1, título del checkout, TEST-09 a TEST-11 y TEST-16 | estándar · alto | Sí | TEST-09 a TEST-11 y TEST-16 en verde. Capturas del diálogo, del carrito y del checkout: solo cambian los botones del diálogo y los tres textos de D1. «Procesando…», «Volver al carrito» y «Seguir comprando», iguales |
| T5. ⚠ Panel del checkout, campos con contorno, TEST-12 y TEST-13 | avanzado · alto | Sí | TEST-12 y TEST-13 en verde. Capturas del checkout con A, B y C a 1440 y 375 px: un solo panel igual al resumen, campos con contorno, foco y error con los colores del tema. Sin internals de Material ni `::ng-deep`. Sin desborde horizontal |
| T6. ⚠ Comparación del tono intermedio con el blanco (TEST-18) | avanzado · medio | No | Los 30 pares completos, con la misma ruta y los mismos datos en cada uno, y la hoja de contactos lista para Daniel |
| T7. Aplicar el valor final que elija Daniel | estándar · medio | Sí, si cambia el valor | — |
| T8. ⚠ Capturas «después» y comparación (TEST-17), `verify` y e2e completo | avanzado · alto | Sí | Sebastián aprueba las capturas: solo cambia lo de la [tabla](#capturas-antes-y-después). `verify` y el e2e completo en verde. Sin errores de consola |
| T9. Documentos afectados | estándar · medio | No | — |

Bloques sugeridos para `sdd-implement`:

1. Base y BFF: T0 y T1.
2. Lienzo: T2 y T3.
3. Compra: T4 y T5.
4. Comparación: T6. T7 se hace cuando Daniel elige, en ese bloque o en el siguiente.
5. Cierre: T8 y T9.

## Documentos afectados

- [ADR-0013](../../../adrs/0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md), que amplía [ADR-0011](../../../adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md), en `sdd-decide`. [`docs/architecture/README.md`](../../../architecture/README.md), [`backend/architecture.md`](../../../../backend/architecture.md) y [`frontend/architecture.md`](../../../../frontend/architecture.md) lo anotan como decidido y pendiente de implementar; T9 lo pasa al estado real.
- [Contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md): `Tema.tokens` con `--ws-store-bg`, su regla (literal en los predefinidos, `background` en los propios) y las 31 declaraciones de `theme.css`.
- [`backend/architecture.md`](../../../../backend/architecture.md): la línea de `domain/temas/` no cambia de nombres; se revisa si cita cantidades.
- [`frontend/architecture.md`](../../../../frontend/architecture.md): §6, el e2e nuevo `storefront-checkout-panel.spec.ts`.
- [Especificación](specification.md): una nota fechada del hito de arquitectura en AC-13 y en los casos límite, con el `--ws-border-strong` nuevo de B y su efecto en los temas propios con esa base. No se reescriben las decisiones del hito de alcance.
- [Sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md): 31 tokens y 20 pares; `--ws-border-strong` de B en `#8894a6` y el par `borderStrong/surface` en la tabla de contraste; el lienzo de la tienda frente al del Admin; la tabla de contraste sobre el lienzo de la tienda en A, B y C; el panel y los campos del checkout; la frase «estructura neutra sobre un lienzo plomo», que pasa a valer solo para el Admin.
- [Glosario](../../../architecture/glosario.md): «Lienzo de la tienda» (`--ws-store-bg`, `bg-store-canvas`).
- [US04](../../../planning/user-stories/ep-02-comprar/us-04-agregar-al-carrito/us-04-agregar-al-carrito.md), Escenario 01, con el diálogo de dos botones.
- [Trazabilidad](../../../planning/TRACEABILITY.md): la fila «Confirmación al agregar al carrito» y filas nuevas para los textos, el lienzo y el panel del checkout.
- [Decisiones pendientes](../../../planning/PENDING-DECISIONS.md): se cierran «Textos del carrito y del checkout» y, cuando Daniel elija, «Fondo de la tienda».
- [`SOURCE-COMPLIANCE.md`](../../../../frontend/docs/SOURCE-COMPLIANCE.md): una nota fechada sobre el diálogo, sin reescribir la revisión del 2026-11-05.
- [Backlog](../../../planning/backlog.md): estado de PBI-0035 a PBI-0038 al entregar.

## Hito de arquitectura

Se pide aprobar:

- las responsabilidades por capa, con el token nuevo en el BFF, su réplica en el Admin y el lienzo de la tienda en una clase propia;
- que el contrato solo crece (una clave en `tokens` y una línea en `theme.css`), sin migración ni datos nuevos;
- las decisiones acordadas, el ADR que amplía ADR-0011 y la estrategia de pruebas, con TDD en las reglas, `theme.css` y el contrato del BFF y en la réplica del Admin;
- y estas tres preguntas, que se presentan de una en una.

### Pregunta 1. ¿Cómo lee la tienda su lienzo?

| Alternativa | Qué significa |
|---|---|
| **A. Una clase de Tailwind propia, `bg-store-canvas` (recomendada)** | `tokens.css` añade `--color-store-canvas: var(--ws-store-bg)`. La tienda la usa en el shell y la página 404, y `--ws-store-bg` en `html` y `body`; la vista previa de Temas, en su `figure`. `canvas` sigue siendo `--ws-bg` en las dos aplicaciones, así que el buscador de la cabecera conserva su relleno plomo y se sigue viendo como campo sin tocarlo (AC-06), también con el blanco |
| B. La tienda redefine `--color-canvas` en su `styles.css` | Menos cambios de plantilla, pero `canvas` significa una cosa en la tienda y otra en el Admin. El buscador pasa al lienzo nuevo: su relleno queda a 1.04:1 de la cabecera blanca con B, o igual con el blanco, y hay que ajustarlo (otro cambio visual). La vista previa del Admin necesita igualmente su propio cambio |
| C. La tienda redefine `--ws-bg` con el valor de `--ws-store-bg` | Un solo cambio, pero `--ws-bg` dejaría de ser el «fondo principal» del tema en la tienda: los pares `*/background` medirían un color que no se pinta, y el buscador cambia como en B |

Evidencia: el lienzo de la tienda es `bg-canvas` en el shell y en la 404, y `--ws-bg` en `html` y `body` ([`app.layout.ts`](../../../../frontend/src/app/layout/app.layout.ts), [`pagina-no-encontrada.page.ts`](../../../../frontend/src/app/layout/pagina-no-encontrada.page.ts), [`styles.css`](../../../../frontend/src/styles.css)). Los dos buscadores usan `bg-canvas` como relleno sobre la cabecera blanca. `tokens.css` lo importan las dos aplicaciones, y el Admin pinta con `bg-canvas` su login y la vista previa. Medido con las reglas del BFF: el plomo de hoy queda a 1.09:1 del blanco de la cabecera con B; el tono intermedio, a 1.04:1.

### Pregunta 2. ¿Dónde va el token en el mapa y cómo lo fijan A, B y C?

| Alternativa | Qué significa |
|---|---|
| **A. Justo antes de `--ws-bg`, derivado igual al fondo principal y fijado con literales en A, B y C (recomendada)** | `tokensDelTema` da `--ws-store-bg = colors.background` a todo tema; los predefinidos lo sobrescriben con `#FAFAFB`, `#f9fafc` y `#F9F9FA`, como hacen hoy con su franja superior. Pasar al blanco es cambiar tres literales. Al ir antes de `--ws-bg`, queda fuera de la escala neutra en las dos copias de las reglas sin tocar la réplica del Admin |
| B. Regla `lienzoDeLaTienda(fondo)`, «mitad hacia el blanco», solo para los predefinidos | Explica el origen de los valores, pero si Daniel elige el blanco la regla queda sin uso o cambia de sentido. Se replica en el Admin y se prueba con TDD sin que nadie la pida. Escrita como `color-mix()`, el navegador redondea los canales impares a su manera |
| C. Al final de `TOKENS_DEL_TEMA` | Agrupa lo nuevo al final de `theme.css`, pero la réplica del Admin calcula su escala neutra con un `slice` desde `--ws-bg` hasta el final: heredaría el token y un tema propio con la base de B tomaría el lienzo de B en la vista previa, contra REQ-14. Obliga a reescribir esa escala como lista |

Evidencia: [`temas-predefinidos.mjs`](../../../../backend/src/domain/temas/temas-predefinidos.mjs) ya sobrescribe `--ws-topbar` en A y C con literales, y B es un mapa literal. `ESCALA_NEUTRA` del Admin es `TOKENS_DEL_TEMA.slice(TOKENS_DEL_TEMA.indexOf('--ws-bg'))` ([`tema.rules.ts`](../../../../frontend/projects/admin/src/app/features/temas/domain/tema.rules.ts)). Los valores de D2 son la mitad hacia el blanco redondeada canal a canal (B: 243, 245 y 248 → 249, 250 y 252).

### Pregunta 3. ¿Cómo se aplican y se animan los campos con contorno?

| Alternativa | Qué significa |
|---|---|
| **A. `appearance="outline"` y tokens de Material en el panel, con la animación de Material (recomendada)** | Cada campo del checkout lleva `appearance="outline"`, como los filtros del catálogo. `ws-checkout-panel` fija `--mat-form-field-outlined-outline-color` en `--ws-border-strong`, `--mat-form-field-outlined-focus-outline-color` en `--ws-focus-ring` y el radio en `--ws-radius`. En reposo, contorno fino de 1 px; con el foco, 2 px en el color de foco. La etiqueta sube al borde con la transición de Material, de 150 ms, que Material 22 quita sola con `prefers-reduced-motion`. El contorno cambia de golpe |
| B. Como A, con el contorno en reposo en `--ws-border` | A la vista, más «limpio», pero queda a 1.29:1 de la superficie con B, muy lejos del 3:1 que pide WCAG 1.4.11 para el borde de un campo (STD-11) |
| C. Como A, más una transición propia del color del contorno | El contorno también se animaría, pero Material no la expone como token: habría que escribir sobre `.mdc-notched-outline__*`, internals prohibidos por STD-04 |

Evidencia: los filtros de [`catalogo.page.ts`](../../../../frontend/src/app/features/vitrina/presentation/catalogo.page.ts) ya usan `appearance="outline"`. `tokens.css` lleva `--mat-sys-outline` a `--ws-border-strong` y `--mat-sys-primary` a `--ws-link`. Material 22.2.4 expone los tokens `--mat-form-field-outlined-*` (color, color con foco, grosor con foco, radio y color de error), anima la etiqueta en 150 ms y el texto de ayuda en 180 ms, y desactiva esas transiciones si el navegador pide movimiento reducido (`_getAnimationsState`). Medido con las reglas del BFF, `--ws-border-strong` queda a 3.43:1, 2.996:1 y 3.16:1 de la superficie en A, B y C, y `--ws-border`, a 1.34:1, 1.29:1 y 1.32:1. Con B, el contorno de A queda justo por debajo de 3:1, igual que hoy en los filtros del catálogo. Al responder, se decidió corregirlo ([respuestas](#respuestas-del-hito)).

### Respuestas del hito

Las preguntas se presentaron de una en una el 2026-11-12, en la sesión de esta etapa, y Sebastián Avila las respondió allí.

| Pregunta | Decisión | Alternativas descartadas | Ajustes pedidos y dónde quedan |
|---|---|---|---|
| 1. Lienzo de la tienda | **A. Una clase de Tailwind propia, `bg-store-canvas`**, en el shell, la 404 y la vista previa de Temas, y `--ws-store-bg` en `html` y `body`; `bg-canvas` sigue siendo `--ws-bg` en las dos aplicaciones y el buscador no cambia. Elegida por Sebastián Avila el 2026-11-12 («A. Clase propia (Recomendado)») | B. Redefinir `--color-canvas` en la tienda (`canvas` con dos significados y el buscador a 1.04:1 de la cabecera); C. redefinir `--ws-bg` en la tienda (los pares sobre el fondo principal medirían un color que no se pinta) | Ninguno |
| 2. Token en el mapa | **A. `--ws-store-bg` justo antes de `--ws-bg`**, derivado igual al fondo principal en todo tema y fijado con literales en A, B y C (`#FAFAFB`, `#f9fafc` y `#F9F9FA`). Elegida por Sebastián Avila el 2026-11-12 («A. Antes de --ws-bg (Recomendado)») | B. Regla «mitad hacia el blanco» para los predefinidos (sin uso si Daniel elige el blanco, réplica y TDD sin pedido, redondeo de `color-mix()`); C. al final de `TOKENS_DEL_TEMA` (la réplica del Admin lo heredaría con la escala neutra, contra REQ-14) | Ninguno |
| 3. Campos con contorno | **A. `appearance="outline"` y tokens `--mat-form-field-outlined-*` en `ws-checkout-panel`**: contorno en reposo `--ws-border-strong`, foco de 2 px en `--ws-focus-ring` y la animación de la etiqueta de Material (150 ms, sin animación con movimiento reducido). Elegida por Sebastián Avila el 2026-11-12 («A. Outline + tokens (Recomendado)») | B. Contorno en reposo en `--ws-border` (1.29:1 con B, lejos del 3:1 de WCAG 1.4.11); C. transición propia del contorno (internals de Material, contra STD-04) | Sí. Sebastián Avila decidió el 2026-11-12, en su sesión principal, corregir el contorno de B en esta feature en lugar de aceptarlo como riesgo («Corregirlo en la 004 (Recomendado)»): `--ws-border-strong` de B pasa de `#8a96a8` (2.996:1) a `#8894a6` (3.073:1) y se mide con el par `borderStrong/surface`. Queda en el [enfoque](#enfoque), los [tipos y nombres](#tipos-intermedios-y-nombres), los [riesgos](#dependencias-y-riesgos), TEST-02, TEST-03, TEST-05, las [capturas](#capturas-antes-y-después) y T1 |
