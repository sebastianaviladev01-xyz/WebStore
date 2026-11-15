# 0019. Calcular con el tema el error, la alerta y el texto sobre el principal

- Estado: Aceptada
- Fecha: 2026-11-14

Decidida por la sesión principal del lote 03 por delegación de Sebastián Avila ([ADR-0017](0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md)); queda por confirmar por él en el PR del lote. Amplía [ADR-0011](0011-guardar-los-temas-como-recurso-propio-del-bff.md), como antes [ADR-0013](0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md) y [ADR-0014](0014-dar-al-tema-un-token-para-el-texto-sobre-el-enlace.md).

## Contexto

### Por qué había que decidir

Con un tema propio oscuro que el BFF acepta (superficie `#1B1E25`), el error (`#B42318`) y la alerta (`#8A4B08`), fijos en `tokens.css`, se leen a 2.54:1 y 2.45:1 ([PBI-0061](../planning/backlog.md)), y con un principal muy claro sobre esa base el texto sobre el principal queda a 1.04:1, porque se elige solo entre el blanco y el contraste, los dos claros ([PBI-0062](../planning/backlog.md)). Corregirlo en los temas propios cambia el mapa de tokens que calcula el BFF y que leen los dos frontends.

### Opciones

Cómo se leen el error y la alerta con cualquier tema:

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Cinco tokens del tema, con dos variantes fijas (elegida)** | `--ws-danger`, `--ws-danger-soft`, `--ws-danger-line`, `--ws-warning` y `--ws-warning-soft` pasan al mapa. Para cada uno de los dos avisos, el BFF elige la variante cuyo texto se lee mejor sobre el fondo principal y la superficie: la de hoy, o una clara (`#FDA29B`, `#FEC84B`) con el fondo suave y la línea mezclados con la superficie | A, B y C no cambian. Un tema oscuro gana avisos legibles (8.59:1 y 10.78:1 sobre `#1B1E25`) y recuadros oscuros. Seis pares nuevos lo miden y solo avisan | El mapa pasa de 32 a 37 tokens y las dos copias de las reglas crecen |
| Derivar el color del aviso de los colores del tema | Mezclar un rojo base con el contraste hasta llegar a 4.5:1 | Un tono por tema | Un rojo que se acerca al gris deja de leerse como error; difícil de explicar y de probar |
| Dejarlos fijos y solo medirlos | Añadir los pares sin cambiar los colores | Nada cambia a la vista | El Admin avisaría de un problema que nadie puede corregir: el aviso no depende de los cinco colores |

Entre qué colores se elige el texto sobre el principal:

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Entre el blanco, el contraste y la superficie (elegida)** | `textoMasLegible(principal, [BLANCO, C, Sf])`, como `--ws-on-link`; la franja superior usa los mismos candidatos | En un tema oscuro, la superficie se lee sobre un principal claro: `#FFFFBB` pasa de 1.04:1 a 16.10:1 y la base oscura de `casos-tema.json`, de 3.68:1 a 4.54:1. Una sola regla para los textos sobre la marca | En la base oscura, el principal fuerte pasa a mezclarse al 88 % (se aclara) y la franja cambia de tono |
| Entre el blanco y el contraste, como hasta ahora | Nada cambia | — | En una base oscura los dos candidatos son claros: el par solo avisa de lo que no se puede corregir |

## Decisión

Usaremos cinco tokens del tema para el error y la alerta, con dos variantes fijas que el BFF elige por legibilidad sobre el fondo principal y la superficie, y mediremos seis pares nuevos (`danger/*` y `warning/*`, a 4.5:1, sin bloquear). Elegiremos el texto sobre el principal y sobre la franja entre el blanco, el contraste y la superficie. A, B y C conservan sus valores: B los lleva como literales en minúsculas, igual que `tokens.css`. El contrato solo crece y no hay migración: los tokens se calculan al leer.

*Motivo:* es la opción que corrige los temas propios sin cambiar A, B y C, con reglas que ya usa el mapa (`textoMasLegible`) y que las pruebas compartidas del BFF y del Admin pueden fijar valor por valor.

## Consecuencias

**Más fácil:** un tema oscuro o de principal claro muestra los errores, las alertas, los botones y la franja con texto legible, y el Admin avisa si un tema propio deja alguno bajo su mínimo.

**Más difícil:** en una base oscura, el principal fuerte pasa a ser la mezcla al 88 % con el contraste, y el texto sobre el tinte (`--ws-on-primary-soft`), que lo usa si llega a 4.5:1, baja en la base oscura de `casos-tema.json` de 13.78:1 a 4.70:1: sigue sobre el mínimo, con menos margen. El mapa tiene 37 tokens; quien añada un token al tema debe seguir el mismo patrón (BFF, réplica del Admin, `casos-tema.json`, `tokens.css`, contrato y smoke test). El texto sobre el acento (`--ws-on-accent`) sigue eligiendo entre el blanco y el contraste: queda en el [backlog](../planning/backlog.md) como PBI-0152.

**Fuera de alcance:** el color de los fondos de Material (relleno de los campos, panel y opción seleccionada de las listas), que se resuelve en `tokens.css` con tokens que ya existían, sin cambiar el mapa ([`VISUAL-SYSTEM.md`](../../frontend/docs/VISUAL-SYSTEM.md)).

> Nota (2026-11-15, lote 02, PBI-0152): el texto sobre el acento (`--ws-on-accent`) se elige ahora como el texto sobre el principal, entre el blanco, el contraste y la superficie (`textoMasLegible(secundario, [BLANCO, C, Sf])`), en el BFF y en su réplica del Admin. En la base oscura de `casos-tema.json` (acento `#F97316`), `onAccent/accent` pasa de 2.80:1 a 5.95:1 y el caso de `revisarContraste` ya no avisa de ningún par. A, B y C fijan su literal y no cambian. Sin migración: los tokens se calculan al leer. La frase de Consecuencias que lo dejaba fuera queda como historia.
