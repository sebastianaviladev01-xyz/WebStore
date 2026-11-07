# NNN. Título de la feature — Especificación

- Feature: `NNN-slug`
- Historia de usuario: USxx — nombre, en `ep-NN-slug/us-NN-slug/us-NN-slug.md` del [índice de historias](../../planning/user-stories/user-stories.md). Si no sale de una historia: el PBI del backlog o el ADR de origen
- Estado: borrador | aprobada
- Fecha: AAAA-MM-DD
- Hito de alcance: pendiente | aprobado por <persona> el AAAA-MM-DD

<!-- Reemplaza cada texto de ejemplo. Al copiar esta plantilla a docs/specs/features/NNN-slug/, añade un "../" a cada enlace relativo. -->

## Problema y actores

Qué problema resuelve la feature, para quién y por qué importa. Actores que intervienen: comprador (invitado o con cuenta), superadministrador, administrador, vendedor o un sistema externo. Aplicaciones afectadas: Storefront, Admin, BFF.

## Alcance

**Incluye:**

- …

**Excluye:**

- … (indicar en qué historia, feature o elemento del backlog se cubre, si se sabe)

## Requisitos

| ID | Requisito | Origen | Prioridad |
|---|---|---|---|
| REQ-01 | Descripción observable del comportamiento | USxx, descripción funcional | Alta |

## Criterios de aceptación

### AC-01 — Nombre del escenario

- Cubre: REQ-01
- Origen: USxx, Escenario 01 | propuesto

**Dado** …
**Cuando** …
**Entonces** …

## Datos y contrato

Campos, validaciones y formatos. Enlaza el [contrato del BFF](../../../backend/docs/BFF-CONTRACT.md) y el [glosario](../../architecture/glosario.md) en lugar de copiarlos; aquí solo va lo que esta feature añade o cambia, con los roles que pueden hacer cada operación.

| Campo u operación | Regla | Roles | Origen |
|---|---|---|---|
| … | … | … | REQ-xx |

## Interfaz

Pantallas afectadas en Storefront y Admin, y si la feature cambia el diseño visual. Si no se pidió un cambio visual, el diseño se conserva ([STD-12](../../architecture/standards.md)).

| Pantalla o ruta | Cambio esperado | Cambio visual pedido |
|---|---|---|
| … | … | Sí / No |

## Integraciones

Servicios o sistemas externos que intervienen y qué se espera de cada uno. En la demo, el BFF de prueba sustituye al productivo.

## Casos límite y fallos

| Caso | Comportamiento esperado | REQ/AC |
|---|---|---|
| … | … | … |

## Hechos, supuestos y decisiones pendientes

**Hechos** (verificables en el repositorio o en la historia):

- …

**Supuestos** (se asumen hasta que se confirmen):

- …

**Decisiones pendientes** (bloquean el trabajo que dependa de ellas; enlaza la fila de [`PENDING-DECISIONS.md`](../../planning/PENDING-DECISIONS.md) o del [backlog](../../planning/backlog.md)):

- …

## Preguntas abiertas

1. …

## Referencias

- [Historias de usuario](../../planning/user-stories/user-stories.md)
- [Estándares](../../architecture/standards.md)
- [Trazabilidad](../../planning/TRACEABILITY.md)
