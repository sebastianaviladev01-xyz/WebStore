# 0035. Construir por lotes el acceso a WhatsApp (PBI-0241), como excepción al flujo

- Estado: Aceptada
- Fecha: 2026-11-27

Decidida por Sebastián Avila el 2026-11-27. Al preguntarle si se construía el acceso a WhatsApp como un enlace configurable, respondió: «Sí, constrúyelo». Es una [excepción](../development/exceptions.md) a [ADR-0002](0002-adoptar-sdd-y-tdd.md) y a [ADR-0016](0016-volver-a-un-pull-request-por-hito.md), con la misma forma que [ADR-0033](0033-construir-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-24.md).

## Contexto

### Por qué había que decidir

En la reunión del 2026-11-20, Daniel señaló la esquina del storefront donde estaba la tuerca de temas: «Aquí lo que va a aparecer es el icono de WhatsApp». Después de ver un asistente de chat propio de otra aplicación, dejó el tema para más adelante: «eso se queda para el backlog, pero ya sabes dónde va a ir, se va a quedar en esa esquina». Quedó como [PBI-0241](../planning/backlog.md), en `propuesta`, fuera de los lotes de [ADR-0027](0027-cerrar-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-20.md) y de [ADR-0029](0029-cerrar-por-lotes-los-hallazgos-de-los-lotes-28-a-31.md) porque faltaba decidir si era un enlace o un asistente, y de dónde salía el número.

Con [ADR-0034](0034-decidir-las-preguntas-de-negocio-sin-esperar-a-daniel.md), esa pregunta la decide Sebastián Avila. El 2026-11-27 eligió el enlace configurable: un botón flotante que abre `wa.me` con el número que la tienda escribe en Contenido. Un asistente propio o la API de WhatsApp quedan fuera, porque dependen de un tercero. Las decisiones están en la fila «PBI-0241: acceso a WhatsApp» de las [decisiones pendientes](../planning/PENDING-DECISIONS.md) y son la especificación del lote.

- **Regla y ámbito:** STD-12, STD-16, STD-17 y el flujo SDD, en el BFF (dos campos nuevos de Contenido), el backoffice (la sección «WhatsApp» de Contenido) y el storefront (el botón flotante).
- **Riesgo:**
  - un elemento fijo nuevo en todas las páginas de la tienda puede tapar un control, sobre todo a 375 px;
  - cambia el contrato de Contenido del BFF (dos campos nuevos, sin cambio de `schemaVersion`);
  - quedan expuestos quien compra en la tienda, quien configura Contenido y quien revisa el PR.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Un lote único, cerrado en su PR (elegida)** | Como ADR-0033, con un solo lote | Rápido y conocido; un PR revisable; las decisiones ya están escritas | Menos puntos de control que las seis etapas |
| Una feature SDD | Seis etapas y sus PR | Más control | Mucho más lento para dos campos y un botón |
| Dejarlo en `propuesta` | Nada que tocar | Ningún cambio visual | Sebastián Avila pidió construirlo |

## Decisión

Construiremos PBI-0241 en el lote 49, único, con las reglas de ADR-0033:

1. **Un lote.**
   - Va en `feature/lote-49-acceso-a-whatsapp`, con su worktree, desde `dev`.
   - La sesión principal lo audita y abre su PR en borrador hacia `dev`. Lo fusiona una persona.
   - El cierre de este ADR y los registros van en el mismo PR.
2. **La especificación es la fila «PBI-0241: acceso a WhatsApp».**
   - Lo que esa fila no fija lo decide el lote con ADR-0034: lo que Daniel mostró, el comportamiento actual, la coherencia de los temas y la accesibilidad.
   - Lo que decide el lote queda escrito como decisión de Sebastián Avila, sin esperar a Daniel. Si Daniel pide otra cosa, se cambia.
3. **Fuera:** un asistente de chat propio, la API de WhatsApp Business y cualquier integración con Meta, que dependen de un tercero.

**Sigue prohibido** (compensación):

- saltarse la prueba primero en las áreas de STD-18: las reglas del BFF, la regla pura del frontend que arma el enlace y el contrato;
- cerrar el lote sin `npm run verify` y `npm run test:e2e` en verde;
- desactivar reglas de ESLint o de Sheriff;
- cambiar el diseño visual sin capturas antes y después (STD-12), o más allá del botón y de la sección nueva;
- que el botón tape un control de la tienda a 375 o 1440 px, o quede por encima de un diálogo o del menú lateral;
- bajar el contraste del botón de 3:1 (WCAG 1.4.11) con cualquiera de los temas A, B y C;
- guardar un número real en la semilla o en la demo;
- que un agente haga push a `dev`, fusione un PR o cree tags;
- superar Opus 5.5 con `high`;
- lo que [`exceptions.md`](../development/exceptions.md) excluye de toda excepción.

Cada commit lleva `Refs:` con `PBI-0241` y este ADR.

### Lotes

| Lote | Área | Elementos |
|---|---|---|
| 49 | BFF, backoffice y storefront, con los registros y el cierre | PBI-0241 |

*Motivo:* Sebastián Avila pidió construirlo. El lote conserva las pruebas, los controles, las capturas y la revisión por PR, como con ADR-0033.

## Consecuencias

**Lo que se vuelve más fácil:**

- el cliente escribe a la tienda por WhatsApp desde cualquier página, menos el checkout;
- la tienda decide el número y el mensaje inicial sin tocar código, y sin número no hay botón.

**Lo que se vuelve más difícil:**

- hay un elemento fijo más que cuidar en cada página nueva de la tienda;
- si Daniel pide un asistente propio, es otro PBI, con un tercero de por medio.

**Vigencia y cierre:**

- Responsable: Sebastián Avila. Termina cuando se fusiona el PR del lote 49 o cuando él la retira.
- Aprobación: Sebastián Avila, 2026-11-27. Falta informar a Daniel Avila de lo construido.
- Al cerrar, se quita de «Excepciones vigentes» y el flujo de ADR-0016 vuelve a regir sin excepción.
