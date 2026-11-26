# 0030. Alejar el principal fuerte que no se distingue del principal

- Estado: Aceptada
- Fecha: 2026-11-25

Decidida en el lote 34 de [ADR-0029](0029-cerrar-por-lotes-los-hallazgos-de-los-lotes-28-a-31.md) (PBI-0247), con su decisión provisional de partida. Queda «Provisional, por confirmar con Daniel». Amplía la derivación del principal fuerte de los temas propios ([ADR-0011](0011-guardar-los-temas-como-recurso-propio-del-bff.md), D2) con la regla del acento fuerte del lote 20 ([ADR-0023](0023-dar-al-tema-un-borde-del-acento-y-un-acento-fuerte-legible.md)), y cierra lo que [ADR-0028](0028-hacer-visible-el-secundario-en-la-tienda-e-invertir-el-tema-c.md) dejó fuera de alcance.

## Contexto

### Por qué había que decidir

El principal fuerte (`--ws-primary-strong`) es el botón principal con el puntero encima. En un tema propio se deriva mezclando el principal con el contraste (al 62 % con texto blanco, al 88 % con otro texto). Si el principal casi es el contraste, la mezcla casi es el principal y el botón no cambia: un grafito `#1F2328` sobre la base de B da 1.06:1, y un principal igual al contraste, 1.00:1. El lote 28 lo resolvió solo en C, con un literal (`color-mix(in srgb, #1F2328 90%, #FFFFFF)`, 1.36:1).

Aplicar a todos los temas propios la regla del acento fuerte (que el puntero encima se distinga a 1.3:1) cambiaría el principal fuerte, la franja superior y el texto sobre el tinte de 4 de los 6 temas propios de `casos-tema.json`, que hoy se distinguen entre 1.16:1 y 1.52:1. ADR-0029 pide no tocar los que ya se distinguen.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Alejar solo el principal fuerte que no llega a 1.1:1 (elegida)** | Si la mezcla derivada se distingue del principal a menos de 1.1:1, el principal fuerte pasa a la primera mezcla del principal con el blanco o el negro, de 10 en 10 %, que se distingue a 1.3:1 y deja su texto a 4.5:1. La franja superior y el texto sobre el tinte siguen en la mezcla derivada | Solo cambian los temas que tienen el defecto; A, B, C y los temas propios que ya se distinguen quedan idénticos. Con los colores de C da el mismo literal que C fija | Un salto: un tema a 1.09:1 pasa a 1.3:1 o más y uno a 1.12:1 se queda como está |
| Aplicar la regla del acento fuerte a todos los temas propios | Todo principal fuerte bajo 1.3:1 se aleja | Una sola regla para el principal y el acento | Cambia 4 de los 6 temas propios de los casos, también su franja superior; ADR-0029 lo descarta |
| Dejarlo como está | El botón principal de esos temas no cambia con el puntero encima | Nada que tocar | El defecto sigue; solo C lo tiene resuelto |

## Decisión

- **Cuándo se aleja.** Cuando la mezcla derivada del principal fuerte se distingue del principal a menos de **1.1:1** (`DIFERENCIA_MINIMA_DEL_PRINCIPAL`). Es un umbral de detección: los principales fuertes derivados de los casos que se ven cambiar con el puntero encima están en 1.16:1 o más (`#123456` y `#3B82F6`), y los que apenas cambian quedan entre 1.00:1 y 1.09:1: un principal igual o casi igual a su contraste (`#0F172A`, `#111111`, `#1F2328` o `#1E293B` sobre la base de B) o un principal muy claro sobre una base oscura de contraste claro (`#FFFFBB`, 1.005:1).
- **Hasta dónde.** Hasta la diferencia del acento fuerte del lote 20 (`DIFERENCIA_AL_PASAR`, **1.3:1**), con la misma búsqueda: la primera mezcla con el blanco o el negro, de 10 en 10 % (90 %, 80 %…, el blanco primero en cada peso), que se distingue del principal a 1.3:1 y deja el texto sobre el principal a 4.5:1. Si ninguna sirve, la mezcla derivada, como antes. Un principal oscuro se aclara (el grafito, al 90 % con el blanco: 1.36:1) y uno claro se oscurece (`#FFFFBB`, al 80 % con el negro: 1.60:1).
- **Qué no cambia.** La franja superior (`--ws-topbar` y `--ws-on-topbar`) y el texto sobre el tinte (`--ws-on-primary-soft`) siguen calculándose con la mezcla derivada, como en C, que fija el principal fuerte y conserva su franja grafito. El mapa sigue con 38 tokens y 29 pares; sin migración: los temas propios guardados se recalculan al leer.
- **Temas que cambian.** Solo los que no llegan a 1.1:1. De los 6 temas propios de `casos-tema.json`, uno: el principal muy claro sobre la base oscura (`#FFFFBB`), de `color-mix(in srgb, #FFFFBB 88%, #F5F7FA)` (1.005:1) a `color-mix(in srgb, #FFFFBB 80%, #000000)` (1.60:1), con su texto de 16.03:1 a 10.04:1. Los otros cinco, A, B y C no cambian. C conserva su literal, que ahora coincide con lo que se deriva de sus colores.

*Motivo:* corrige el botón principal de los temas que tienen el defecto con la regla que ya usa el acento fuerte y que C fijó a mano, sin tocar ningún tema que ya se distingue.

## Consecuencias

**Lo que se vuelve más fácil:** un tema propio con el principal casi igual a su contraste (un negro sobre un contraste negro) tiene un botón principal que cambia con el puntero encima, como C, sin fijar nada a mano.

**Lo que se vuelve más difícil:**

- El principal fuerte deja de ser siempre la mezcla con el contraste: la franja superior de esos temas ya no es su principal fuerte. Quien lea el mapa debe mirar `--ws-topbar`, no suponer que es igual.
- El salto alrededor de 1.1:1: un tema que se distingue a 1.12:1 sigue con ese cambio pequeño. Subir el umbral cambiaría temas que hoy se distinguen.
- La réplica del Admin (`tema.rules.ts`) repite la regla; `casos-tema.json` las compara (TEST-14).

**Fuera de alcance:** Daniel puede pedir otra diferencia para el botón principal; las dos cifras son constantes de `tema.rules`.
