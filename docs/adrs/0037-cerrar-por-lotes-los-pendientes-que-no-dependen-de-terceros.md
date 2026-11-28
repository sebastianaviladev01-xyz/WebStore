# 0037. Cerrar por lotes los pendientes que no dependen de terceros, como excepción al flujo

- Estado: Aceptada
- Fecha: 2026-11-27

Decidida por Sebastián Avila el 2026-11-27: «cierra todos los pendientes al 100% por lotes para avanzar más rápido, la auditas al 100, corriges ahí mismo si hay errores y me dices si está apto para mergear y fusionar, en orden por favor, excepto lo de quitar el campo URL, eso se queda». Es una [excepción](../development/exceptions.md) a [ADR-0002](0002-adoptar-sdd-y-tdd.md) y a [ADR-0016](0016-volver-a-un-pull-request-por-hito.md), con la misma forma que [ADR-0033](0033-construir-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-24.md) y [ADR-0035](0035-construir-por-lotes-el-acceso-a-whatsapp.md).

## Contexto

### Por qué había que decidir

Después de la auditoría de las reuniones (PR #116), el [backlog](../planning/backlog.md) tenía 30 PBI en `propuesta`. Doce no dependen de terceros, del cliente ni de Daniel:

- del backoffice: PBI-0276 (fichas por rol en Usuarios), PBI-0277 (que no se indexe), PBI-0288 (un color por barra en el Dashboard) y PBI-0289 (el logo como las demás imágenes);
- del BFF: PBI-0197 (las imágenes de categoría anteriores al lote 11) y PBI-0198 (limitar las peticiones al checkout);
- de la tienda: PBI-0278 (ordenar el catálogo), PBI-0282 (ampliar la foto), PBI-0279 (recojo en tienda), PBI-0280 (crear la cuenta con los datos del pedido), PBI-0281 (reglas del cambio del pedido) y PBI-0283 (reseñas).

Seis de ellos se habían dejado para el backlog funcional, después de la demo. Sebastián Avila, que decide las preguntas de negocio ([ADR-0034](0034-decidir-las-preguntas-de-negocio-sin-esperar-a-daniel.md)), pidió el 2026-11-27 construirlos todos ahora. Esa decisión es la más reciente y manda. Las decisiones de cada elemento están en la fila «Lotes 50 a 56: los pendientes que no dependen de terceros» de las [decisiones pendientes](../planning/PENDING-DECISIONS.md) y son la especificación de los lotes.

PBI-0197 y PBI-0198 se habían dejado fuera ([ADR-0021](0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md)) por necesitar el backend de producción. Este ADR los vuelve a abrir: el lote busca una solución sin dependencias nuevas en el BFF (STD-14). Si no la hay, lo dice con su motivo y el PBI vuelve a quedar fuera.

Los otros 18 PBI dependen de terceros, del cliente o de Daniel (pasarela de pago, facturación, correo real, revisión legal, modelo de datos, dominio, ERP, datos reales de Ecom, envío nacional, asistente de chat, SSR) y quedan fuera.

- **Regla y ámbito:** STD-12, STD-16, STD-17, STD-18 y el flujo SDD, en el BFF, el backoffice y el storefront.
- **Riesgo:**
  - cambia el contrato del BFF (orden del catálogo, recojo en tienda, reglas del cambio del pedido, reseñas, límite del checkout y el logo);
  - cambia el checkout tres días antes de presentar la demo (2026-11-30);
  - quedan expuestos quien compra en la tienda, quien la administra y quien revisa los PR.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Lotes por área, cada uno con su PR (elegida)** | Como ADR-0033: seis lotes y un cierre | Rápido y conocido; PR revisables; las decisiones ya están escritas | Menos puntos de control que las seis etapas |
| Una feature SDD por elemento | Doce features con sus etapas y PR | Más control | Mucho más lento |
| Dejarlos en `propuesta` | Nada que tocar | La demo no cambia | Sebastián Avila pidió cerrarlos |

## Decisión

Construiremos los doce PBI en los lotes 50 a 55 y cerraremos con el lote 56, con las reglas de ADR-0033:

1. **Un lote por área**, cada uno en `feature/lote-NN-…`, con su worktree. El lote 50 lleva este ADR y los demás parten de su commit. La sesión principal audita cada lote, corrige lo que encuentre en el mismo lote y abre su PR en borrador hacia `dev`. Lo fusiona una persona, en orden numérico.
2. **La especificación es la fila «Lotes 50 a 56».** Lo que esa fila no fija lo decide el lote con ADR-0034: el comportamiento actual, la coherencia de los temas y la accesibilidad. Queda escrito como decisión de Sebastián Avila, sin esperar a Daniel. Si Daniel pide otra cosa, se cambia.
3. **El campo «URL/Data URL del logo» se queda** (Sebastián Avila, 2026-11-27). PBI-0289 se cierra guardando el logo cargado como las demás imágenes, sin quitar el campo.
4. **Fuera:** los 18 PBI que dependen de terceros, del cliente o de Daniel.

**Sigue prohibido** (compensación):

- saltarse la prueba primero en las áreas de STD-18: las reglas del BFF, las reglas puras del frontend y el contrato;
- cerrar un lote sin `npm run verify` y `npm run test:e2e` en verde;
- añadir dependencias al BFF (STD-14);
- desactivar reglas de ESLint o de Sheriff;
- cambiar el diseño visual sin capturas antes y después (STD-12), o más allá de lo que pide cada PBI;
- bajar un contraste de 4,5:1 (texto) o 3:1 (elementos gráficos) con cualquiera de los temas A, B y C;
- modificar `backend/data.json` (se usa una copia con `WEBSTORE_DATA_FILE`, STD-09);
- que un agente haga push a `dev`, fusione un PR o cree tags;
- superar Opus 5.5 con `high`, salvo el escalado a Fable 5.2 de [ADR-0036](0036-usar-opus-5-5-en-todo-y-fable-5-2-cuando-haga-falta.md), con su motivo;
- lo que [`exceptions.md`](../development/exceptions.md) excluye de toda excepción.

Cada commit lleva `Refs:` con sus PBI y este ADR.

### Lotes

| Lote | Área | Elementos |
|---|---|---|
| 50 | Backoffice: Usuarios, indexación, Dashboard y logo | PBI-0276, PBI-0277, PBI-0288 y PBI-0289 |
| 51 | BFF: imágenes de categoría y límite del checkout | PBI-0197 y PBI-0198 |
| 52 | Tienda: orden del catálogo y foto ampliada | PBI-0278 y PBI-0282 |
| 53 | Tienda, backoffice y BFF: recojo en tienda y cuenta desde el pedido | PBI-0279 y PBI-0280 |
| 54 | Tienda, backoffice y BFF: reglas del cambio del pedido | PBI-0281 |
| 55 | Tienda, backoffice y BFF: reseñas | PBI-0283 |
| 56 | Cierre: e2e combinada y registros | — |

*Motivo:* Sebastián Avila pidió cerrar los pendientes por lotes para avanzar más rápido. Los lotes conservan las pruebas, los controles, las capturas y la revisión por PR, como con ADR-0033.

## Consecuencias

**Lo que se vuelve más fácil:**

- el backlog queda solo con lo que depende de terceros, del cliente o de Daniel;
- la tienda gana orden del catálogo, foto ampliada, recojo en tienda, cuenta desde el pedido y reseñas.

**Lo que se vuelve más difícil:**

- la demo cambia poco antes de presentarse: cada lote se fusiona solo con su e2e completa en verde;
- hay más contrato del BFF que mantener cuando llegue el backend de producción.

**Vigencia y cierre:**

- Responsable: Sebastián Avila. Termina cuando se fusiona el PR del lote 56 o cuando él la retira.
- Aprobación: Sebastián Avila, 2026-11-27. Falta informar a Daniel Avila de lo construido.
- Al cerrar, se quita de «Excepciones vigentes» y el flujo de ADR-0016 vuelve a regir sin excepción.
