---
name: onboarding
description: Acompaña la incorporación de una persona nueva a WebStore. Pregunta su experiencia y su área, revisa sus accesos, prepara con su visto bueno el entorno del primer día, lo comprueba con ready-check y le presenta la ruta de lectura de la guía de incorporación. Úsalo cuando alguien empiece en el proyecto o pida orientación general (por ejemplo, «soy nuevo en el proyecto» o «¿por dónde empiezo?»).
metadata:
  project: webstore
---

# Incorporar a una persona

## Entrada

Argumentos opcionales: la experiencia (`junior` o `senior`) y el área (`frontend` o `backend`). Lo que falte, pregúntalo.

## Lee primero

- `docs/development/onboarding.md`: es la fuente. Este skill la recorre con la persona y no repite su contenido.
- `AGENTS.md`, sección «Orientación para agentes».

## Pasos

Pregunta de una en una y espera la respuesta antes de seguir.

1. Pregunta la experiencia y el área, si no vienen en los argumentos.
2. Recorre «Accesos y herramientas» de la guía. Lo que falte, la persona lo pide a quien corresponda: no crees cuentas ni toques credenciales.
3. Prepara el entorno según «Primer día» de la guía. Comprueba que la versión de Node.js cumple `engines` de `package.json` y propón `npm run setup` desde la raíz; ejecútalo cuando la persona lo apruebe. Las operaciones destructivas siguen necesitando confirmación.
4. Acompaña a la persona a levantar el BFF, el Storefront y el Admin, probarlos y apagarlos según «Levantar y apagar el proyecto» (`docs/development/local-environment.md`), y comprueba cada resultado esperado. Los accesos de demostración están en el `README.md` y solo sirven en local.
5. Ejecuta el skill `ready-check` (`.agents/skills/ready-check/SKILL.md`) y comparte su veredicto.
6. Presenta la ruta común de lectura y la de su experiencia en bloques cortos, con lo que la persona se lleva de cada documento. Si lo pide, resume o explica un documento y enlázalo; no lo sustituyas.
7. Ofrece un primer cambio guiado, solo si la persona quiere: un cambio pequeño de documentación con el flujo completo (rama `feature/*` desde `origin/dev`, commit, `pr-create` y, tras el merge, `post-merge`). Si el repositorio todavía no tiene remoto en GitHub, llega hasta el commit e indícalo.
8. Cierra con «Reglas que más se olvidan» y «Trabajar con un agente» de la guía, y con lo que quedó pendiente.

## Salida

Un resumen corto:

- accesos y entorno: listos o pendientes;
- el veredicto de `ready-check`;
- la ruta de lectura propuesta;
- los siguientes pasos.

## No hacer

- No propongas cambios al flujo, a los estándares ni a los skills durante la incorporación. Un hueco real de la documentación se anota aparte, con archivo y línea.
- No asignes roles ni decidas el siguiente trabajo del proyecto.
- No hagas push ni abras PR fuera del skill `pr-create`, y no fusiones.
- No modifiques `backend/data.json` para enseñar el proyecto: si hace falta tocar datos, usa una copia con `WEBSTORE_DATA_FILE`.
