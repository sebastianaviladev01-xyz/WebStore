# AGENTS.md — Frontend

Reglas para agentes que trabajan en `frontend/`. Especializan las del [`AGENTS.md` raíz](../AGENTS.md); no las repiten.

La fuente de verdad del diseño es [`architecture.md`](architecture.md): features con capas internas, puertos y adaptadores, reglas de dependencia y convenciones. Léelo antes de escribir código.

## Reglas

- Respeta las [reglas obligatorias](architecture.md#21-reglas-obligatorias). Una dependencia nueva entre features se declara en [`sheriff.config.ts`](sheriff.config.ts) sin crear ciclos, y se refleja en `architecture.md` §2.2.
- Sigue las [convenciones de nombres](architecture.md#4-componentes-y-convenciones): sufijo de rol en el archivo, negocio en español y técnico en inglés.
- Conserva los selectores `ws-*`, las clases CSS y los tokens: los estilos y el diseño visual dependen de ellos.
- Ningún secreto en el bundle, en `localStorage` ni en `sessionStorage` más allá del token opaco de sesión. Los guards son UX: la autorización la repite el BFF.
- Las reglas puras de `domain/` llevan su prueba `*.spec.mjs` junto al código.

## Comandos

Desde `frontend/`: `npm run lint`, `npm test`, `npm run test:architecture`, `npm run build:all` o, todo junto, `npm run verify`. Los recorridos e2e, con `npm run test:e2e` (Playwright, unos minutos): nunca usan `backend/data.json` ni los puertos de desarrollo, y los nuevos van en `tests/e2e/{storefront,admin}-*.spec.ts`. Para QA visual con Chrome headless, los scripts de [`tools/qa/`](tools/qa/).

## Prohibido

- Desactivar `strict`, reglas de ESLint o de Sheriff para que pase el build. Las únicas excepciones de línea están justificadas en el propio código.
- Llamar al BFF desde `application/` o `presentation/`, o usar `HttpClient` fuera de `data/` y `core/`.
- Importar código del Admin desde el Storefront o al revés.
