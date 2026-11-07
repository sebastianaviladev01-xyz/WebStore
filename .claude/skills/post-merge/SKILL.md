---
name: post-merge
description: Cierra en local un cambio de WebStore cuyo PR ya está aprobado y fusionado en dev. Comprueba el merge, detiene sus servidores, elimina el worktree, la rama local y las copias de datos, y actualiza dev local. Úsalo cuando la persona diga que el PR está aprobado y mergeado o fusionado (por ejemplo, «listo, PR aprobado y mergeado» o «ya hice merge»).
argument-hint: "[rama | número de PR]"
---

Puntero al skill canónico. Lee `.agents/skills/post-merge/SKILL.md` desde la raíz del repositorio y sigue sus instrucciones con estos argumentos: $ARGUMENTS
