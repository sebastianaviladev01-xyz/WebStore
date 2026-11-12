# 0011. Guardar los temas como recurso propio del BFF

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

### Por qué había que decidir

La feature [002](../specs/features/002-temas-configurables/specification.md) añade temas propios que solo gestiona el `superadmin` y un tema activo que leen la tienda y el Admin. El único canal de escritura del Admin es el snapshot, con una revisión global que sube con cada venta, y [`tienda.facade.ts`](../../frontend/projects/admin/src/app/features/tienda/application/tienda.facade.ts) reintenta solo tras `STALE_SNAPSHOT`: un segundo `superadmin` pisaría al primero, contra AC-19. Además, alguien tiene que calcular, a partir de cinco colores, el mapa de tokens y el contraste (D2 y D7). Son las preguntas 1 y 4 del [hito de arquitectura](../specs/features/002-temas-configurables/planning.md#hito-de-arquitectura).

### Opciones

Dónde viven los temas en el contrato:

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Recurso propio, con revisión propia (elegida)** | `GET /bff/appearance` público y `/bff/admin/themes` y `/bff/admin/active-theme` para el `superadmin`, con `appearance.revision` | Una venta no invalida un guardado de temas, y AC-19 se cumple sin reintento automático. Encaja con la división en comandos que el contrato pide para producción y con una tabla `tema` futura (PBI-0043) | Más código: rutas, casos de uso y otro gateway |
| Dentro del snapshot del Admin | `themes` y `activeThemeId` como colecciones de `PUT /admin/snapshot`, más una lectura pública | Menos rutas | Comparte la revisión global: cualquier venta da `STALE_SNAPSHOT`. Habría que cambiar el reintento de `TiendaFacade` para cumplir AC-19 |

Dónde están los temas predefinidos:

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Constantes del dominio del BFF (elegida)** | A, B y C viven en `domain/temas/temas-predefinidos.mjs` y no se guardan | Ajustar sus valores (por ejemplo, PBI-0037) es un cambio de código sin migración, y no se pueden editar con una petición directa | Para añadir un predefinido hay que publicar una versión |
| Guardados en el estado | Se siembran en `data.json` como los demás | Un solo origen para todos los temas | Quedan congelados en cada `data.json`: cada ajuste necesita una migración |

Dónde se calculan los tokens y el contraste:

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **En el BFF, con una réplica en el dominio del Admin (elegida)** | El BFF calcula los tokens que sirven `theme.css` y el JSON y valida D7. El Admin replica las reglas para la vista previa y el aviso en vivo, como ya replica la tabla de roles | El BFF es la autoridad y puede servir la hoja del [ADR-0010](0010-aplicar-el-tema-activo-con-una-hoja-de-estilos-del-bff.md). La vista previa responde sin red. La tienda no calcula nada | Dos copias de las reglas que hay que mantener iguales |
| En los dos frontends | El BFF solo guarda los cinco colores y valida el contraste | El BFF queda más simple | Tres copias de las reglas, y sin mapa en el BFF no hay `theme.css` |
| Solo en el BFF, con una ruta de vista previa | El formulario del Admin pide al BFF los tokens en cada cambio de color | Una sola copia | Una petición y su retardo por cada cambio de color; sin conexión no hay vista previa |

## Decisión

Guardaremos los temas como un recurso propio del BFF:

- Una capacidad `temas` en las cuatro capas del BFF, con las rutas de [apariencia y temas del plan](../specs/features/002-temas-configurables/planning.md#contrato-del-bff-afectado). Las escrituras exigen la revisión vigente y, si no coincide, responden `409 STALE_THEMES` sin aplicar nada ni reintentar.
- El estado gana `appearance` (`revision`, `activeThemeId` y `customThemes`), independiente de `state.revision`. La migración `schemaVersion: 3` lleva los colores de Contenido a un tema propio «Colores de Contenido» si difieren de B, y los quita de `config` ([estado del BFF](../specs/features/002-temas-configurables/planning.md#estado-del-bff)).
- Los predefinidos A, B y C son constantes del dominio. B copia `tokens.css` al pie de la letra, y TEST-18 lo comprobará.
- Un permiso nuevo, `themes.manage`, solo del `superadmin`, en [`rol.rules.mjs`](../../backend/src/domain/sesion/rol.rules.mjs) y en su réplica del Admin. Cambia la tabla de roles fijos del 05/11: `admin` y `vendedor` conservan exactamente sus permisos, y `content.manage` deja de dar acceso a los colores.
- El BFF calcula el mapa de tokens (derivación D2 y regla de la base neutra) y el contraste WCAG 2.1, y es la autoridad para guardar. El dominio del Admin replica esas reglas solo para la vista previa y el aviso; las dos copias leerán el mismo archivo de casos (`casos-tema.json`, TEST-14).

*Motivo:* una revisión propia es la única forma de cumplir AC-19 sin tocar el snapshot ni su reintento, y calcular en el BFF es lo que permite servir `theme.css`; la réplica del Admin solo añade la vista previa en vivo.

## Consecuencias

**Lo que se vuelve más fácil:**

- Los temas quedan aislados en su parte del estado y del contrato: pasar a una tabla `tema` con `appearance.revision` como versión optimista no cambia ni el contrato ni los frontends ([alineación con PBI-0043](../specs/features/002-temas-configurables/planning.md#estado-del-bff)).
- Ventas, pedidos y guardados del snapshot no interfieren con los temas, ni al revés.
- Cambiar los valores de un predefinido es una tarea pequeña, cubierta por TEST-02 y TEST-03.

**Lo que se vuelve más difícil:**

- Habrá un segundo gateway en el Admin y otro grupo de rutas que mantener en el [contrato](../../backend/docs/BFF-CONTRACT.md) y en el smoke test. Las rutas se añadirán al contrato con el código que las implementa (STD-05).
- Quitar `primaryColor` y `secondaryColor` de `/content/settings` y de `config` es un cambio incompatible del contrato: BFF, `BFF-CONTRACT.md`, smoke test y adaptadores cambian en el mismo PR (STD-05).
- Las reglas de contraste y derivación existen dos veces. Si se separan, falla TEST-14; si aun así discrepan, manda el BFF.
- La migración v3 es un cambio de datos irreversible para cada `data.json`: se escribirá con su prueba de caracterización primero (TEST-10).

**Fuera de alcance:**

- Temas por tienda (multi-tenant, PBI-0004) y más de cinco colores por tema.
- Una librería compartida entre la tienda y el Admin para la feature `temas`: rompería la separación de las dos aplicaciones.

## Referencias

- [Plan de la feature 002: contrato, estado y respuestas del hito](../specs/features/002-temas-configurables/planning.md)
- [WCAG 2.1 — Contrast ratio](https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio)
