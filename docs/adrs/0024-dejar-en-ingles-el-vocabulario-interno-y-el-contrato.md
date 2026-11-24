# 0024. Dejar en inglés el vocabulario interno del código y el contrato HTTP

- Estado: Aceptada (provisional, por confirmar con Sebastián Avila y Daniel Avila)
- Fecha: 2026-11-23

Decidida por la sesión principal por delegación de Sebastián Avila el 2026-11-23, en el lote 18 de [ADR-0021](0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md), que pidió cerrar todo lo que no depende de terceros y aplicar «la mejor solucion a cualquier pregunta que surja». Cierra PBI-0022. Completa [ADR-0003](0003-usar-espanol-para-el-vocabulario-de-negocio.md) sin sustituirlo.

## Contexto

### Por qué había que decidir

[ADR-0003](0003-usar-espanol-para-el-vocabulario-de-negocio.md) pasó al español las carpetas de features, los archivos y los tipos y clases exportados, y dejó «pendientes de migrar» los métodos, las propiedades y signals de las clases, las funciones y constantes internas, y los campos y rutas del contrato HTTP. Ese pendiente, PBI-0022, quedó sin decidir el 2026-11-15 ([decisiones pendientes](../planning/PENDING-DECISIONS.md), «Vocabulario en inglés del código y del contrato»), y ADR-0021 pide no dejar abierto nada que no dependa de terceros.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **A. No migrar (elegida)** | Lo que ADR-0003 dejó pendiente se queda en inglés; las piezas nuevas siguen la misma regla | Sin riesgo ni costo; no cambia el contrato | Conviven los dos idiomas dentro de una clase |
| B. Migrar solo los nombres internos | Renombrar con el servicio de lenguaje de TypeScript los métodos, propiedades, signals, funciones y constantes, sin tocar el contrato | Un solo idioma de negocio en el código | Varios días de un diff enorme que no corrige ningún defecto y choca con cualquier rama abierta |
| C. Migrar también el contrato HTTP | Una versión nueva del contrato, con el BFF, los dos frontends, las pruebas y la documentación a la vez | Todo en español | Cambio incompatible para cualquier cliente del BFF, y el BFF productivo todavía no existe |

## Decisión

No migraremos al español el vocabulario que ADR-0003 dejó en inglés:

- Los métodos, las propiedades y signals de las clases y las funciones y constantes internas que ya existen se quedan como están: no se renombran. El código nuevo sigue usando el español de negocio, como ya hacen las reglas de `domain/` (por ejemplo, `direccionesDeLasLineas`), y no toma lo anterior como ejemplo ([`frontend/architecture.md` §4](../../frontend/architecture.md#4-componentes-y-convenciones)).
- Los campos y rutas del contrato HTTP del BFF se quedan en inglés (`/bff/checkout/orders`, `deliveryAddressMode`, `termsVersion`). Los campos nuevos siguen esa convención.
- Las carpetas de features, los archivos y los tipos y clases exportados siguen en español, como decidió ADR-0003.

*Motivo:* migrarlo no corrige ningún defecto, la parte del contrato es un cambio incompatible y el cliente no lo ve.

## Consecuencias

- **Más fácil:** no hay que planificar una migración ni coordinar el contrato con el BFF productivo; las ramas abiertas no chocan.
- **Más difícil:** dentro de una misma clase conviven nombres en los dos idiomas. El [glosario](../architecture/glosario.md) da el nombre en el código de cada término de negocio, que es lo que evita confundirlos.
- **Provisional:** la decidió la sesión principal por delegación. Si Sebastián Avila y Daniel Avila prefieren B o C, se hace como feature propia con su ADR, que sustituye a este.
