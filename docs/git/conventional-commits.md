# Convención de commits

Este repositorio adopta [Conventional Commits 1.0.0](https://www.conventionalcommits.org/es/v1.0.0/) para mantener un historial legible, trazable hasta la especificación y apto para herramientas automáticas. La decisión está en [ADR-0005](../adrs/0005-adoptar-convenciones-de-versionamiento-y-entrega.md); las ramas y los pull requests, en la [convención de ramas y pull requests](conventional-pull-requests.md).

## Formato

```text
<tipo>[ámbito opcional][!]: <descripción>

[cuerpo opcional]

[nota(s) al pie opcional(es)]
```

- Escribe el tipo y el ámbito en minúsculas y en inglés: son términos técnicos ([ADR-0003](../adrs/0003-usar-espanol-para-el-vocabulario-de-negocio.md)).
- Usa como ámbito la carpeta de primer nivel afectada: `frontend` o `backend`. Omítelo cuando el cambio sea transversal o solo de documentación del sistema (`docs:`, `ci:`, `build:`).
- Redacta la descripción en español, de forma breve, en infinitivo y sin punto final. Usa los términos del [glosario](../architecture/glosario.md).
- Separa el cuerpo y las notas al pie con una línea en blanco.
- En el cuerpo, explica qué cambia y por qué, en viñetas si hay varios puntos y con líneas de unos 72 caracteres. Puedes resumir la verificación; la evidencia completa va en `verification.md` o en el PR.
- Mantén un único cambio lógico por commit. Separa cambios con propósitos distintos cuando sea posible.
- No añadas `Co-Authored-By` ni firmas de herramientas de IA, aunque la herramienta las ponga por defecto.

## Tipos

- `feat`: incorpora una funcionalidad.
- `fix`: corrige un defecto.
- `docs`: modifica únicamente documentación.
- `refactor`: reorganiza código sin cambiar su comportamiento observable.
- `test`: agrega o modifica pruebas.
- `build`: cambia el sistema de construcción, los scripts de npm o las dependencias.
- `ci`: cambia workflows o automatización de integración continua.
- `perf`: mejora el rendimiento.
- `style`: cambia formato sin alterar el comportamiento.
- `chore`: realiza mantenimiento que no encaja en los tipos anteriores.
- `revert`: revierte uno o más commits anteriores.

En las áreas con TDD obligatorio ([STD-18](../architecture/standards.md)), la prueba puede ir en su propio commit `test(...)` antes del commit que la hace pasar. Como los PR se fusionan con merge commit, el historial conserva ese orden como evidencia.

## Cambios incompatibles

Marca un cambio incompatible con `!` antes de los dos puntos o con una nota al pie `BREAKING CHANGE: <descripción>`. Explica la incompatibilidad y la migración necesaria.

- Un cambio incompatible del contrato del BFF es un [disparador de revisión adicional](../architecture/development-workflow.md#disparadores-de-revisión-adicional).
- Además, determina el número de la siguiente versión ([numerar la versión](conventional-pull-requests.md#numerar-la-versión)).

Ejemplo ilustrativo:

```text
feat(backend)!: exigir la revisión en el guardado del Admin

BREAKING CHANGE: PUT /bff/admin/snapshot rechaza un cuerpo sin
revision; el Admin debe enviarla en cada guardado
```

## Referencias de trazabilidad

Cuando el trabajo corresponda a una feature, una historia o un ADR, añade su identificador en una nota al pie `Refs:`. Si hay varios, sepáralos con comas. Usa los formatos del proyecto:

- TASK o AC de una feature, con la carpeta delante: `001-slug/TASK-01` ([convenciones de especificaciones](../specs/README.md#convenciones)).
- Historia de usuario: `US06`.
- Decisión: `ADR-0005`.
- Elemento del backlog: `PBI-0001`.

```text
Refs: 001-slug/TASK-01, ADR-0003
```

- No uses el identificador como ámbito ni lo escribas en la descripción.
- No incluyas URL.
- Así la trazabilidad se puede consultar con `git log --grep "001-slug/TASK-01"`.

No uses palabras clave de cierre de GitHub, como `Closes #12` o `Fixes #12`, salvo solicitud expresa. El estado de una feature se gestiona en su [índice](../specs/features/README.md).

El nombre de la rama de trabajo sigue la [convención de ramas](conventional-pull-requests.md#nombres-de-rama), por ejemplo `feature/001-slug`.

## Ejemplos

Ilustrativos: muestran la forma, no cambios que ya existan.

```text
docs: registrar las convenciones de versionamiento y entrega

Refs: ADR-0005
```

```text
fix(frontend): asociar la etiqueta al filtro de estado de pedidos

- El mat-select del filtro no tenía nombre accesible para lectores
  de pantalla.

Refs: PBI-0023
```

```text
refactor(frontend): renombrar los métodos del carrito al español

Refs: PBI-0022, ADR-0003
```

```text
test(backend): cubrir la ventana de 24 h al cancelar un pedido
```

## Antes de confirmar

Revisa el contenido indexado (`git diff --staged`). Comprueba que ni el diff ni el mensaje incluyen:

- credenciales, hosts ni secretos ([`AGENTS.md`](../../AGENTS.md#reglas));
- `backend/data.json` ni copias suyas, tokens de sesión o de pedido;
- datos personales reales de clientes;
- capturas o perfiles de QA (`frontend/output/`).
