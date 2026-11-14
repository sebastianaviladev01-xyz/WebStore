# Convención de ramas y pull requests

Este repositorio usa pull requests de GitHub para revisar e integrar cambios de forma trazable. Esta guía define:

- el modelo de ramas;
- cómo se crean, revisan, aprueban y fusionan los pull requests;
- cómo se compone y se numera una versión.

Complementa la [convención de commits](conventional-commits.md). La decisión está en [ADR-0005](../adrs/0005-adoptar-convenciones-de-versionamiento-y-entrega.md). Es el mismo modelo que usa IdShield.

## Principios

- Mantén cada pull request enfocado en un único propósito y entrega en él el cambio completo: no lo repartas en PR pequeños. En una feature SDD, un solo PR con todas sus etapas y otro, después del merge, para el registro de la entrega ([un pull request por feature](../architecture/development-workflow.md#un-pull-request-por-feature), [ADR-0015](../adrs/0015-entregar-cada-feature-en-un-solo-pull-request.md)).
- Describe el resultado funcional y las decisiones relevantes. Una lista de archivos o commits no reemplaza la explicación.
- Revisa el diff completo contra la rama destino antes de solicitar aprobación.
- Registra los comandos de validación ejecutados y sus resultados reales. No declares como ejecutada una prueba que se omitió ([STD-13](../architecture/standards.md)).
- Si el PR toca la interfaz, adjunta capturas antes y después ([STD-12](../architecture/standards.md)).
- No incluyas en títulos, descripciones, comentarios, capturas ni logs:
  - credenciales, hosts ni secretos;
  - tokens de sesión o de pedido ni contenido de `backend/data.json`;
  - datos personales reales.
- No fusiones un pull request mientras tenga observaciones bloqueantes, conversaciones sin resolver o una alerta de flujo pendiente.

## Modelo de ramas

| Rama | Propósito | Nace de | Vida |
|---|---|---|---|
| `feature/*` | Desarrollo aislado: features, correcciones y documentación | `main` | Hasta integrarse en `dev` y, si se libera, en su `release/x.y.z` |
| `dev` | Integración de features. Puede contener trabajo futuro | — | Permanente |
| `release/x.y.z` | Versión candidata: composición exacta de la siguiente versión, solo con código liberable. Es lo que certifica QA | `main` | Hasta que existe su tag `vX.Y.Z` |
| `main` | Producción | — | Permanente |
| `hotfix/x.y.z` | Corrección urgente en producción | `main` | Hasta su retorno a las demás ramas |

QA es una etapa, no una rama: QA certifica una `release/x.y.z` concreta ([certificar la versión](#certificar-la-versión)). Solo hay una `release/x.y.z` abierta a la vez.

WebStore todavía no tiene ambientes desplegados: el despliegue es una decisión abierta ([alcance](../planning/SCOPE.md#fase-posterior)). Mientras no exista un ambiente de QA, QA certifica el commit de la release levantado en local según el [entorno local](../development/local-environment.md), y la certificación lo dice.

**Rama por defecto en GitHub: `dev`.** A diferencia de IdShield, que usa `main`, en WebStore la rama por defecto del repositorio es `dev`. Así, «Compare & pull request» y los pull request nuevos proponen `dev` como destino, y un clon empieza donde se integra el trabajo. El modelo no cambia: las ramas `feature/*` nacen según [Transición](#transición) y `main` solo recibe una `release/x.y.z` certificada o un `hotfix/*`. Se cambió el 2026-11-07, después de que se abriera por error un pull request de `dev` hacia `main` (#6, cerrado sin fusionar). El plan actual del repositorio privado no permite proteger ramas; si llega a permitirlo (GitHub Pro o una organización con plan de pago), conviene proteger `main` y `dev`: exigir pull request y la CI en verde, y bloquear el push forzado y el borrado.

### Política de pull requests

| Rama origen | Rama destino | Tratamiento |
|---|---|---|
| `feature/*` | `dev` | Flujo normal de integración |
| `hotfix/*` | `dev` | Retorno de una corrección urgente |
| `feature/*` que ya está en `dev` y no arrastra trabajo ajeno | `release/x.y.z` | Flujo normal de composición de la versión |
| `hotfix/*` | `release/x.y.z` abierta | Retorno de una corrección urgente |
| Cualquier otro origen, incluidos `dev` y una `feature/*` que no cumple lo anterior | `release/x.y.z` | Genera una alerta de flujo |
| `release/x.y.z` certificada por QA | `main` | Flujo normal hacia producción |
| `hotfix/*` | `main` | Corrección urgente; exige un retorno trazable |
| Cualquier otro origen, incluidos `dev`, `feature/*` y una `release/x.y.z` sin certificar | `main` | Prohibido |
| Cualquier origen | Otro destino | Permitido si se documenta el propósito y no se eluden las reglas anteriores |

- No hay commits directos en `dev`, `release/*` ni `main`: todo entra por pull request.
- La solicitud de una persona no habilita un origen prohibido hacia `main`.
- Un `hotfix/*` se reserva para una corrección urgente en producción. Las correcciones ordinarias siguen el flujo de integración y de versión.

### Nombres de rama

- Feature del flujo SDD: `feature/<NNN-slug>`, con la carpeta de su especificación. Es una sola rama para todas las etapas de la feature. Ejemplo: `feature/001-comprar-como-invitado`.
- Registro de la entrega de una feature: `feature/registrar-entrega-<NNN-slug>`. Ejemplo: `feature/registrar-entrega-001-comprar-como-invitado`.
- Otro trabajo: `feature/<slug>`, en kebab-case y en español. Ejemplo: `feature/convenciones-versionamiento-entrega`.
- Versión: `release/<x.y.z>`, con el número [SemVer](#numerar-la-versión). Ejemplo: `release/0.1.0`.
- Corrección urgente: `hotfix/<x.y.z>`, con la versión de parche que producirá. Ejemplo: `hotfix/0.1.1`.

Crea cada `feature/*` desde `main` actualizado:

```bash
git fetch origin --prune
git switch -c feature/<slug> origin/main
```

### Transición

- **Estado de partida.** El repositorio todavía no tiene commits. Una persona hace el commit inicial con la estructura actual en `main` y crea `dev` desde él. Es la única entrada sin pull request.
- Mientras `main` no tenga la primera versión, las ramas `feature/*` nacen de `origin/dev`.
- La primera versión, `release/0.1.0`, se corta desde `dev` en lugar de componerse feature a feature. Después de fusionarla en `main`, las features vuelven a nacer de `main`.

## Crear un pull request

El skill [`pr-create`](../../.agents/skills/pr-create/SKILL.md) aplica los pasos 1 a 3 y abre el PR en borrador cuando la persona aprueba el título, las etiquetas y el cuerpo. El paso 4 sigue siendo de la persona.

### 1. Actualizar y revisar las referencias

Antes de crear el pull request, actualiza las referencias remotas y sustituye los marcadores por las ramas reales:

```bash
git fetch origin --prune
git log --oneline origin/<destino>..origin/<origen>
git diff --stat origin/<destino>...origin/<origen>
git diff origin/<destino>...origin/<origen>
```

Comprueba que:

- las ramas origen y destino cumplen la [política](#política-de-pull-requests);
- el diff contiene únicamente los cambios previstos;
- no se incorporan archivos generados (`dist/`, `frontend/output/`), `backend/data.json`, secretos ni cambios ajenos;
- los commits pertenecen al trabajo descrito y siguen la [convención de commits](conventional-commits.md);
- la rama está lo bastante actualizada para resolver conflictos y ejecutar las validaciones aplicables.

**Conflictos con `dev`.** No fusiones `dev` en la `feature/*`: arrastraría trabajo futuro y la feature ya no podría entrar en una versión. Resuélvelos así:

1. Crea una rama de integración `feature/<slug>-dev` desde la feature.
2. Fusiona `origin/dev` en ella y resuelve los conflictos.
3. Abre el PR hacia `dev` desde esa rama.

La `feature/<slug>` original queda limpia para la versión. No uses el botón de resolver conflictos de GitHub en un PR hacia `dev`, porque fusiona `dev` en la rama origen.

### 2. Redactar el título

Usa el formato de Conventional Commits y describe el resultado neto del pull request:

```text
<tipo>[ámbito opcional][!]: <descripción>
```

- Usa los tipos y ámbitos de la [convención de commits](conventional-commits.md).
- Escribe la descripción en español, en infinitivo y sin punto final.
- Usa `!` cuando el cambio sea incompatible y explica la migración en la descripción.
- No pongas identificadores de trazabilidad en el título: van en la sección de trazabilidad.
- El PR de una versión hacia `main` usa `chore` y nombra la versión.

Ejemplos ilustrativos:

```text
fix(frontend): asociar la etiqueta al filtro de estado de pedidos
refactor(backend): renombrar los casos de uso de pedidos al español
docs: registrar las convenciones de versionamiento y entrega
chore: liberar la versión 0.1.0 en producción
```

### 3. Completar la descripción

GitHub precarga [`.github/pull_request_template.md`](../../.github/pull_request_template.md) desde la **rama predeterminada** del repositorio, no desde la rama origen. Completa todas sus secciones (resultado y motivo, trazabilidad, verificación y riesgos) sin reemplazarlas por la lista automática de commits.

Además de la plantilla:

- Para una corrección urgente, enlaza los PR de retorno ([corrección urgente](#corrección-urgente-en-producción)).
- Si hay una desviación de la política, registra la [alerta de flujo](#alerta-de-flujo).
- No añadas firmas de herramientas de IA al final, como «Generated with …».
- Escribe los enlaces relativos desde la URL del pull request, no desde la carpeta del documento: `../blob/dev/<ruta>` para lo que ya está en `dev` y `../blob/<rama>/<ruta>` para lo que añade el PR. Un enlace `../docs/...` da 404.

### 4. Solicitar revisión

- Haz una autorrevisión del diff y completa el checklist de la plantilla antes de pedir revisores.
- Elige revisores con conocimiento del área afectada y respeta los checks y reglas configurados en GitHub.
- Si agregas commits después de recibir observaciones, indica qué cambió y pide una nueva revisión de las áreas afectadas.
- No establezcas un número de aprobaciones distinto del configurado por los administradores del repositorio.

## Comprobar que un cambio ya está en `dev`

Un cambio está en `dev` cuando su commit es alcanzable desde `origin/dev` o cuando existe en esa rama un commit con un parche equivalente. Que dos ramas tengan archivos parecidos, o que una rama se haya creado desde `dev`, no es evidencia suficiente.

```bash
git fetch origin --prune
git merge-base --is-ancestor origin/<origen> origin/dev
```

Un código de salida `0` confirma que la punta de la rama es ancestro de `origin/dev`. Como los PR se fusionan con merge commit, esta comprobación suele bastar. Cualquier otro resultado exige continuar la revisión.

Para comparar los parches no comunes, por ejemplo cuando un cambio llegó a `dev` por cherry-pick:

```bash
git cherry origin/dev origin/<origen>
```

- Una línea con `-` indica que existe un parche equivalente en `dev`.
- Una línea con `+` indica que no se encontró un parche equivalente. Debe generar una alerta.
- Una salida vacía indica que la rama origen no tiene commits simples exclusivos.

`git cherry` no sustituye la revisión de los merges. Si la evidencia no es concluyente, trata el cambio como si no estuviera en `dev` hasta que el responsable de release resuelva la alerta.

Para comprobar que la feature no arrastra trabajo ajeno a la versión:

```bash
git log --oneline origin/release/<x.y.z>..origin/<origen>
```

Solo deben aparecer commits de la feature. Si aparecen commits de otras features o merges de `dev`, la rama arrastra trabajo ajeno y debe generar una alerta.

## Componer una versión

1. **Numerar.** Elige `x.y.z` según las reglas de [numerar la versión](#numerar-la-versión).
2. **Crear la rama.** Comprueba que no haya otra `release/x.y.z` abierta y créala desde `main` actualizado:

   ```bash
   git fetch origin --prune
   git switch -c release/<x.y.z> origin/main
   git push -u origin release/<x.y.z>
   ```

3. **Componer.** Lleva por PR cada `feature/*` elegida que ya esté en `dev` ([comprobación](#comprobar-que-un-cambio-ya-está-en-dev)). La versión contiene solo lo elegido.
4. **Llevar a QA.** Abre el PR `release/x.y.z` → `main` en borrador: ahí se registra la certificación.
5. **Certificar.** QA certifica un commit concreto de la release ([certificar la versión](#certificar-la-versión)).
6. **Corregir durante QA.** Si QA encuentra un defecto, la corrección es una `feature/*` más, creada desde `release/x.y.z`. Entra primero en `dev` y después en la release, y la certificación se repite sobre el nuevo commit.
7. **Liberar.** Con la certificación aprobada, fusiona el PR `release/x.y.z` → `main`.
8. **Etiquetar.** Una persona crea y publica el tag anotado sobre el merge commit en `main`, citando el commit certificado:

   ```bash
   git fetch origin --prune
   git tag -a v<x.y.z> -m "Versión <x.y.z>, certificada en <commit>" origin/main
   git push origin v<x.y.z>
   ```

9. **Cerrar.** Con el tag publicado, `release/x.y.z` se puede borrar.

Si QA rechaza la versión y no se va a corregir, cierra el PR sin fusionar y borra la rama. Como no hay tag, el número se puede reutilizar.

### Certificar la versión

La certificación responde sin ambigüedad qué versión certificó QA: `release/x.y.z` en un commit concreto. Se registra en el PR `release/x.y.z` → `main` con este formato:

```text
### Certificación QA

- Versión: release/<x.y.z>
- Commit certificado: <sha>
- Entorno: <local según docs/development/local-environment.md | ambiente de QA>
- Resultado: APROBADA | RECHAZADA
- Responsable de QA: <nombre o rol>
- Fecha y evidencia: <detalle>
```

- La certificación vale solo para ese commit. Si la release recibe otro commit, se certifica de nuevo.
- Antes de fusionar, comprueba que `main` recibirá exactamente lo certificado:

  ```bash
  git fetch origin --prune
  git rev-parse origin/release/<x.y.z>
  git merge-base --is-ancestor origin/main origin/release/<x.y.z>
  ```

  `git rev-parse` debe devolver el commit certificado, y un código de salida `0` de `git merge-base` confirma que `main` es ancestro de la release.
- Si `main` avanzó por una corrección urgente, lleva primero su retorno a la release y certifica el nuevo commit.

### Numerar la versión

Las versiones siguen [SemVer 2.0.0](https://semver.org/lang/es/). El incremento sale de los tipos de los commits que incluye la versión:

| Contenido | Incremento |
|---|---|
| Algún cambio incompatible (`!` o `BREAKING CHANGE`) | MAJOR. Mientras la versión sea `0.y.z`, sube MINOR |
| Algún `feat`, sin cambios incompatibles | MINOR |
| Solo `fix` y otros tipos sin cambio funcional | PATCH |

- La primera versión es `0.1.0`.
- Pasar a `1.0.0` lo decide una persona.
- El tag `vX.Y.Z` es la fuente del número de versión. El campo `version` de los `package.json` no se usa para numerar versiones.

## Alerta de flujo

Un pull request genera una alerta cuando se cumple al menos una de estas condiciones:

- hacia `release/x.y.z`: el origen no es una `feature/*` ni el retorno de un `hotfix/*`, la feature no está en `dev` o arrastra trabajo ajeno;
- la revisión no puede demostrar de forma concluyente lo anterior.

La alerta se registra en la descripción o en un comentario visible con este formato:

```text
### [ALERTA DE FLUJO] Desviación hacia <destino>

- Origen: <rama>
- Destino: <rama>
- Regla activada: <origen no permitido | cambio que no está en dev | arrastra trabajo ajeno | evidencia no concluyente>
- Cambios o commits afectados: <detalle>
- Evidencia revisada: <comandos, commits o PR relacionados>
- Riesgo: <impacto de continuar>
- Acción solicitada: <cambiar el destino, integrar primero en dev, recrear la rama desde main o autorizar la desviación>
- Estado: PENDIENTE | AUTORIZADA | RECHAZADA
- Responsable de release: <nombre o rol>
- Justificación y fecha de la decisión: <detalle>
```

Mientras el estado sea `PENDIENTE`, no se aprueba ni se fusiona el pull request. El **responsable de release** es la persona que compone la versión y la lleva a QA y a producción: autoriza la desviación, con justificación y evidencia en el PR, o la rechaza. La alerta se conserva después de la decisión. Una desviación autorizada no es una [excepción a los estándares](../development/exceptions.md): esas se registran por ADR.

## Corrección urgente en producción

Un PR `hotfix/x.y.z` → `main` explica por qué no puede seguir el flujo normal y enlaza, con su estado:

- el PR de retorno a `dev`;
- el PR de retorno a la `release/x.y.z` abierta, si existe, que obliga a certificarla de nuevo;
- cualquier diferencia deliberada entre implementaciones.

Los PR de retorno pueden seguir abiertos al aprobar la corrección urgente, pero deben estar creados y enlazados. La corrección sube el PATCH y se etiqueta como en el [paso 8](#componer-una-versión).

## Revisar un pull request

Revisa en este orden, para detectar primero los problemas que invalidan el flujo completo:

1. **Origen y destino:** la [política](#política-de-pull-requests), la [presencia en `dev`](#comprobar-que-un-cambio-ya-está-en-dev), la [certificación QA](#certificar-la-versión) hacia `main` y cualquier alerta.
2. **Alcance:** título, descripción, commits y diff representan el mismo propósito.
3. **Contenido:** la [revisión de PR](../development/pull-request-checklist.md).
4. **Cierre:** las conversaciones están resueltas antes de aprobar.

Usa estos prefijos para que la acción esperada sea inequívoca:

- `[BLOQUEANTE]`: defecto, riesgo o incumplimiento que debe corregirse antes de aprobar.
- `[ALERTA DE FLUJO]`: desviación de ramas que debe resolver el responsable de release.
- `[PREGUNTA]`: información necesaria para comprender o decidir sobre el cambio.
- `[SUGERENCIA]`: mejora opcional que no condiciona la aprobación.

Un comentario indica la ubicación o el comportamiento observado, el riesgo concreto y la acción esperada. Después de nuevos pushes, vuelve a revisar las áreas modificadas.

El PR de una feature trae todas sus etapas. Revísalo por commits, en el orden de las etapas: la especificación, el plan, los ADR, las tareas, cada bloque y la verificación. Cada hito aprobado tiene su commit, y el de entrega debe figurar como aprobado en `verification.md`.

## Aprobar y fusionar

Aprueba únicamente cuando:

- el flujo de ramas es válido o la desviación está autorizada;
- hacia `main` desde una release, la certificación QA está aprobada y corresponde a la punta de la release;
- no hay bloqueantes, conversaciones ni preguntas decisivas pendientes;
- el diff final coincide con lo revisado;
- las validaciones exigibles terminaron bien o sus limitaciones fueron aceptadas;
- los checks y reglas de GitHub permiten la integración;
- el retorno de la corrección urgente está trazado, cuando corresponde.

Fusiona con **merge commit**. Así se conservan los commits rojo/verde que prueban TDD ([STD-18](../architecture/standards.md)) y los SHA citados en `verification.md`. No uses squash ni rebase, ni push directo, reescritura del historial o bypass de controles sobre ramas protegidas.

## Agentes de IA

- Trabajan en ramas `feature/*`, o en `hotfix/*` si una persona lo pide, y siguen esta guía y la de commits.
- No hacen push a `dev`, `release/*` ni `main`.
- No fusionan pull requests ni crean ni publican tags. Lo hace una persona.

## Configuración recomendada en GitHub

Estado: **documentada, no configurada**. La aplica un administrador del repositorio:

- **Rama predeterminada `dev`.** Los PR de trabajo apuntan ahí por defecto, y GitHub lee de ella la plantilla de PR.
- **Rulesets** sobre `dev`, `release/*` y `main`: cambios solo mediante pull request, conversaciones resueltas antes del merge, sin force push y sin borrado de `dev` ni `main`.
- **Método de merge:** solo merge commit, con squash y rebase desactivados. El mensaje por defecto del merge commit es el título del pull request.
- **Ruleset de tags** `v*`: solo los administradores crean, actualizan o borran tags de versión.
- **Check obligatorio:** el job `Verificar (sintaxis, formato, lint, arquitectura, build, pruebas y contrato)` de [`ci.yml`](../../.github/workflows/ci.yml), con GitHub Actions como origen.
  - El workflow corre en todo PR y en cada push a `main` y `dev`, sin filtro de rutas: ejecuta `npm run setup`, `npm run verify` y `npm run audit:all`.
  - No añadas un filtro de rutas al trigger `pull_request`: un workflow omitido por filtro deja el check pendiente y bloquea el merge.
  - El nombre del check es el `name` del job. Cámbialo solo a la vez que el ruleset.

Los rulesets protegen ramas y condicionan el merge, pero no imponen la matriz de origen y destino ni comprueban que un cambio ya esté en `dev`. Eso se comprueba al revisar el PR.

Referencias oficiales:

- [Creating a pull request template for your repository](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository)
- [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [About merge methods on GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github)
- [Troubleshooting required status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks)
