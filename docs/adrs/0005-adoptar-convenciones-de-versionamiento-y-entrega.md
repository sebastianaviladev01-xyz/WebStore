# 0005. Adoptar convenciones de versionamiento y entrega

- Estado: Aceptada
- Fecha: 2026-11-06

## Contexto

### Por qué había que decidir

WebStore se va a publicar en GitHub y su repositorio todavía no tiene commits. El [CI](../../.github/workflows/ci.yml) ya prevé las ramas `main` y `dev`, y existe una [plantilla de PR](../../.github/pull_request_template.md), pero no hay reglas escritas para ramas, commits, pull requests ni versiones. La trazabilidad SDD ([ADR-0002](0002-adoptar-sdd-y-tdd.md)) y la evidencia TDD se leen del historial, y gran parte del código lo producen agentes de IA, que necesitan reglas verificables.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Las convenciones de IdShield (elegida)** | Conventional Commits, `feature/*` → `dev`, `release/x.y.z` desde `main` certificada por QA, `hotfix/*`, merge commit y SemVer | El mismo modelo que el equipo ya usa; separa integración, versión candidata y producción | Más ramas y conflictos que se resuelven dos veces |
| GitHub Flow (`main` y ramas cortas) | Todo se integra directo en `main` | Simple | No separa integración, QA y producción, ni deja fuera el trabajo futuro |
| Sin convención escrita | Cada persona o agente elige su formato | Sin coste inicial | Historial irregular y sin trazabilidad |

## Decisión

Usaremos las convenciones de IdShield, adaptadas a WebStore:

- **Commits.** [Conventional Commits 1.0.0](https://www.conventionalcommits.org/es/v1.0.0/). Tipo y ámbito en inglés y en minúsculas ([ADR-0003](0003-usar-espanol-para-el-vocabulario-de-negocio.md)); el ámbito es `frontend` o `backend`. Descripción en español y en infinitivo. Referencias en la nota al pie `Refs:` (`NNN-slug/TASK-NN`, `USNN`, `ADR-NNNN` o `PBI-NNNN`).
- **Ramas.**

  | Rama | Propósito | Nace de | Recibe PR desde |
  |---|---|---|---|
  | `feature/*` | Desarrollo aislado | `main` | — |
  | `dev` | Integración de features. Puede contener trabajo futuro | — | `feature/*` y el retorno de `hotfix/*` |
  | `release/x.y.z` | Versión candidata, solo con código liberable, que certifica QA | `main` | `feature/*` que ya están en `dev` y el retorno de `hotfix/*` |
  | `main` | Producción | — | `release/x.y.z` certificada y, como corrección urgente, `hotfix/*` |
  | `hotfix/x.y.z` | Corrección urgente en producción | `main` | — |

  Un PR con otro origen genera una **alerta de flujo**, que decide el responsable de release. Hacia `main`, cualquier otro origen está prohibido.
- **Certificación.** QA certifica un commit concreto de `release/x.y.z`. Mientras no exista un ambiente de QA (el despliegue es una decisión abierta, [alcance](../planning/SCOPE.md#fase-posterior)), certifica ese commit levantado en local.
- **Integración.** Sin commits directos en `dev`, `release/*` ni `main`; todo entra por PR, que se fusiona con merge commit.
- **Versiones.** [SemVer 2.0.0](https://semver.org/lang/es/), a partir de `0.1.0`. El tag anotado `vX.Y.Z` lo crea una persona sobre el merge commit en `main`.
- **Transición.** Una persona hace el commit inicial en `main` y crea `dev` desde él. Mientras `main` no tenga la primera versión, las `feature/*` nacen de `dev`, y `release/0.1.0` se corta desde `dev`.
- **Agentes de IA.** Trabajan en `feature/*`, o en `hotfix/*` si una persona lo pide. No hacen push a `dev`, `release/*` ni `main`, no fusionan PR y no crean tags.
- **GitHub.** La configuración que respalda estas reglas (rama predeterminada, rulesets, método de merge, tags protegidos y check obligatorio del CI) queda documentada y la aplica un administrador del repositorio.

El detalle vive en [`docs/git/conventional-commits.md`](../git/conventional-commits.md) y [`docs/git/conventional-pull-requests.md`](../git/conventional-pull-requests.md).

*Motivo:* es el modelo que el equipo ya aplica en IdShield, y conserva en el historial la trazabilidad y la evidencia TDD.

## Consecuencias

- El historial se puede consultar por trazabilidad, por ejemplo con `git log --grep "001-slug/TASK-01"`.
- El merge commit conserva la evidencia TDD y los SHA citados en `verification.md`. A cambio, el historial no es lineal.
- Cada versión recibe solo las features elegidas: una feature que depende de otra no liberada tiene que esperar o entrar en la misma versión, y algunos conflictos se resuelven dos veces.
- GitHub protege ramas y exige PR, pero no impone la matriz origen → destino. Mientras no exista un workflow que la valide, se comprueba al revisar el PR.
- El commit inicial es la única entrada sin PR.
- Quedan fuera de alcance: el changelog y el versionado automáticos, la validación de mensajes con hooks, el despliegue y el campo `version` de los `package.json`.

## Referencias

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/es/v1.0.0/)
- [Semantic Versioning 2.0.0](https://semver.org/lang/es/)
- [GitHub — About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [GitHub — About merge methods on GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github)
