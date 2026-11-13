# 0013. Dar a la tienda un token propio para su lienzo

- Estado: Aceptada
- Fecha: 2026-11-12

## Contexto

### Por qué había que decidir

La feature [004](../specs/features/004-ajustes-de-la-tienda/specification.md) aclara el lienzo de la tienda, que con el plomo de hoy hace que los componentes parezcan deshabilitados (PBI-0037), mientras el Admin conserva ese plomo, que según Daniel «funciona» en el dashboard (D3). Hoy las dos aplicaciones pintan su lienzo con `--ws-bg`, el «fondo principal» del tema, que además es la base de la escala neutra que heredan los temas propios ([ADR-0011](0011-guardar-los-temas-como-recurso-propio-del-bff.md)). Separar los dos lienzos cambia el mapa de tokens que calcula el BFF y que leen los dos frontends.

### Opciones

Cómo se separa el lienzo de la tienda (D3 de la [especificación](../specs/features/004-ajustes-de-la-tienda/specification.md#decisiones-del-hito-de-alcance)):

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Un token propio en el mapa del tema, calculado por el BFF (elegida)** | `--ws-store-bg` en el mapa de cada tema: un literal en A, B y C y el «fondo principal» en todo tema propio. La tienda pinta su lienzo con él y el Admin sigue con `--ws-bg` | El Admin conserva el plomo, ningún tema propio cambia, el contraste sobre el lienzo nuevo se mide y la vista previa de Temas sigue siendo fiel | El mapa crece a 31 tokens y las dos copias de las reglas cambian |
| Cambiar el «fondo principal» de A, B y C | Los tres predefinidos con un `colors.background` más claro | Sin token nuevo | El Admin pierde el plomo que Daniel aprobó, y los temas propios con la base de un predefinido dejan de heredar su escala |
| Aclarar el lienzo con CSS solo en la tienda | Una regla en los estilos de la tienda, sin pasar por el BFF | El cambio más pequeño | Aclara también los temas propios; en uno oscuro puede bajar de AA sin que nadie lo mida, y la vista previa de Temas deja de mostrar lo que se pinta |
| Un sexto color editable, «fondo de la tienda» | Un color más en el formulario de Temas y en `colors` | Cada tema propio elige su lienzo | Cambia el modelo de cinco colores, el formulario, el contrato de `colors` y los datos guardados: desproporcionado para esta feature |
| Pintar el lienzo del Admin con `subtle` | La tienda toma el fondo nuevo y el Admin pasa a `--ws-surface-subtle` | Sin token nuevo | No conserva el plomo exacto y el Admin deja de mostrar el fondo de los temas propios |

Dónde va el token en el mapa y cómo lo fijan A, B y C ([pregunta 2 del plan](../specs/features/004-ajustes-de-la-tienda/planning.md#pregunta-2-dónde-va-el-token-en-el-mapa-y-cómo-lo-fijan-a-b-y-c)):

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Justo antes de `--ws-bg`, igual al fondo principal y con literales en A, B y C (elegida)** | `tokensDelTema` lo deriva de `colors.background` en todo tema y los predefinidos lo sobrescriben, como ya hacen con su franja superior | Pasar al blanco, si Daniel lo elige, es cambiar tres literales. Queda fuera de la escala neutra en las dos copias de las reglas sin tocar cómo la calcula el Admin | El origen de los valores (la mitad hacia el blanco) no queda en el código |
| Una regla «mitad hacia el blanco» para los predefinidos | `lienzoDeLaTienda(fondo)` calcula el valor de A, B y C | Explica el valor | Queda sin uso si Daniel elige el blanco, hay que replicarla y probarla sin que nadie la pida, y con `color-mix()` el navegador redondea los canales impares a su manera |
| Al final de `TOKENS_DEL_TEMA` | El token nuevo cierra el mapa y `theme.css` | Agrupa lo nuevo | La réplica del Admin toma la escala neutra con un `slice` desde `--ws-bg` hasta el final: un tema propio con la base de B heredaría el lienzo de B en la vista previa, contra REQ-14 |

Cómo lee la tienda el token ([pregunta 1 del plan](../specs/features/004-ajustes-de-la-tienda/planning.md#pregunta-1-cómo-lee-la-tienda-su-lienzo)):

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Una clase de Tailwind propia, `bg-store-canvas` (elegida)** | `tokens.css` añade `--color-store-canvas: var(--ws-store-bg)` y `canvas` sigue siendo `--ws-bg` en las dos aplicaciones | Cada nombre significa lo mismo en la tienda y en el Admin, y el buscador de la cabecera conserva su relleno sin tocarlo | Hay que cambiar la clase en cada lienzo (shell, 404 y vista previa) |
| Redefinir `--color-canvas` en la tienda | La tienda apunta `canvas` al token nuevo | Menos plantillas que tocar | `canvas` significa una cosa en cada aplicación, y el buscador queda a 1.04:1 de la cabecera con B |
| Redefinir `--ws-bg` en la tienda | La tienda da a `--ws-bg` el valor del token nuevo | Un solo cambio | Los pares sobre el fondo principal medirían un color que no se pinta, y el buscador cambia igual |

## Decisión

Añadiremos al mapa del tema un token propio del lienzo de la tienda, `--ws-store-bg`, que calcula el BFF. Amplía el cálculo de tokens de ADR-0011, que sigue vigente:

- `TOKENS_DEL_TEMA` pasa de 30 a 31 nombres, con `--ws-store-bg` justo antes de `--ws-bg`. No entra en la escala neutra que heredan los temas propios.
- En todo tema, `tokensDelTema` le da el valor de `colors.background`, herede o no la escala de un predefinido: ningún tema propio cambia su lienzo. A, B y C lo fijan con un literal (D2): `#FAFAFB`, `#f9fafc` y `#F9F9FA`, hasta que Daniel elija entre ese tono y el blanco (AC-14). Sus cinco colores, `--ws-bg` y `colors.background` no cambian.
- `PARES_DE_CONTRASTE` gana cuatro pares sobre el token: `contrast/storeBackground`, `muted/storeBackground`, `link/storeBackground` y `focusRing/storeBackground`. Solo avisan: `INSUFFICIENT_THEME_CONTRAST` sigue bloqueando solo por `contrast/background` y `contrast/surface`.
- La tienda pinta su lienzo con `--ws-store-bg`, mediante la clase `bg-store-canvas`. El Admin sigue con `--ws-bg`, salvo la vista previa de Temas, que es una tienda en miniatura y usa el token nuevo. `tokens.css`, el respaldo, lo declara con el valor de B.
- El contrato solo crece: una clave más en `Tema.tokens` y una declaración más en `theme.css`. No hay migración ni datos nuevos, porque los tokens se calculan al leer.

*Motivo:* es la única opción que aclara la tienda sin quitarle al Admin el plomo que Daniel aprobó, sin cambiar los temas propios y con el contraste medido por el BFF, que sigue siendo la autoridad de ADR-0011.

## Consecuencias

**Lo que se vuelve más fácil:**

- Pasar al blanco, si Daniel lo elige, es cambiar tres literales y lo que depende de ellos, en una lista cerrada ([valor final del lienzo](../specs/features/004-ajustes-de-la-tienda/planning.md#valor-final-del-lienzo)).
- La vista previa de Temas y las tablas de contraste describen lo que la tienda pinta.
- Un cliente del contrato que ignore la clave nueva sigue funcionando: no es un cambio incompatible.

**Lo que se vuelve más difícil:**

- El lienzo deja de ser el mismo en las dos aplicaciones: «lienzo de la tienda» es un término nuevo del glosario y `bg-canvas` ya no vale para el fondo de una página de la tienda.
- El token y los pares nuevos existen dos veces, en el BFF y en la réplica del Admin. Los comprueba el mismo archivo de casos (`casos-tema.json`); si discrepan, manda el BFF.
- La posición del token importa: si se moviera detrás de `--ws-bg`, la réplica del Admin lo heredaría con la escala neutra. Lo protege el caso del tema propio con la base de B, que espera su propio fondo.
- En un tema propio, los pares sobre el lienzo de la tienda valen lo mismo que los del fondo principal: un par que no llegue a su mínimo se avisa dos veces, con nombres distintos.
- Un tema propio que copió la base de un predefinido se ve en la tienda más oscuro que ese predefinido, porque su lienzo es su propio fondo. Para aclararlo, el `superadmin` cambia el fondo del tema.

**Ajustes de la misma feature que no cambian esta decisión:**

- `--ws-border-strong` de B pasa de `#8a96a8` (2.996:1) a `#8894a6` (3.073:1 sobre la superficie), para que el contorno de los campos cumpla WCAG 1.4.11, decidido por Sebastián Avila en el [hito de arquitectura](../specs/features/004-ajustes-de-la-tienda/planning.md#respuestas-del-hito). Es un valor de un predefinido, como los demás de su mapa; los temas propios con la base de B lo heredan.
- Un quinto par nuevo, `borderStrong/surface` (mínimo 3, solo avisa), mide ese contorno en todo tema. Con él, `PARES_DE_CONTRASTE` pasa de 15 a 20.

**Fuera de alcance:**

- Que el `superadmin` elija el lienzo de la tienda de un tema propio: sería el sexto color, descartado.
- Cambiar el lienzo del Admin o el «fondo principal» de los predefinidos.

## Referencias

- [Especificación de la feature 004: D2, D3, REQ-05, REQ-07, REQ-14 y REQ-15](../specs/features/004-ajustes-de-la-tienda/specification.md)
- [Plan de la feature 004: enfoque, tipos y nombres, riesgos y respuestas del hito](../specs/features/004-ajustes-de-la-tienda/planning.md)
- [WCAG 2.1 — Non-text Contrast (1.4.11)](https://www.w3.org/TR/WCAG21/#non-text-contrast)
