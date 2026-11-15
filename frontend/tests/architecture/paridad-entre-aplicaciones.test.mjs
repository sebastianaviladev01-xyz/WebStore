import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Paridad del código copiado (lote 03, PBI-0080). La tienda y el Admin no pueden importarse entre sí
// (frontend/architecture.md §2.1), así que lo que comparten va copiado en cada uno; esta prueba falla si una copia
// cambia sin la otra. Las reglas de temas del Admin y del BFF ya se comparan con `casos-tema.json` (TEST-14).

const root = fileURLToPath(new URL('../..', import.meta.url));
const leer = (ruta) => readFileSync(root + ruta, 'utf8');
const TIENDA = 'src/app/features/temas/';
const ADMIN = 'projects/admin/src/app/features/temas/';

test('las copias de la feature temas son iguales en la tienda y en el Admin', () => {
  for (const archivo of [
    'domain/tema-visible.rules.ts',
    'domain/tema-visible.rules.spec.mjs',
    'application/cookie-vista-previa.ts',
  ])
    assert.equal(leer(TIENDA + archivo), leer(ADMIN + archivo), archivo);
});

test('el selector de tema es igual en las dos aplicaciones, salvo su etiqueta y la hoja que lo pinta', () => {
  // Las únicas diferencias permitidas: el selector del componente y la hoja de estilos que lo nombra.
  const diferencias = [
    ["selector: 'ws-selector-tema'", "selector: 'ws-admin-selector-tema'"],
    ['Estilos en `storefront.css`, solo con tokens.', 'Estilos en `styles.css` del Admin, solo con tokens.'],
  ];
  let tienda = leer(TIENDA + 'presentation/selector-tema.component.ts');
  for (const [deLaTienda, delAdmin] of diferencias) {
    assert.ok(tienda.includes(deLaTienda), `falta en la tienda: ${deLaTienda}`);
    tienda = tienda.replace(deLaTienda, delAdmin);
  }
  assert.equal(tienda, leer(ADMIN + 'presentation/selector-tema.component.ts'));
});

/** Declaración exportada `nombre` de un archivo TypeScript, tal como está escrita. */
function declaracion(fuente, nombre) {
  const archivo = ts.createSourceFile('modelo.ts', fuente, ts.ScriptTarget.ES2022, true);
  const nodo = archivo.statements.find((sentencia) => sentencia.name?.text === nombre);
  assert.ok(nodo, `falta ${nombre}`);
  return nodo.getFullText(archivo).trim();
}

test('el modelo de un tema es el mismo en las dos aplicaciones: colores, tokens, tema y apariencia', () => {
  const tienda = leer(TIENDA + 'domain/tema.model.ts');
  const admin = leer(ADMIN + 'domain/tema.model.ts');
  for (const nombre of ['ColoresTema', 'NombreToken', 'TokensTema', 'Tema', 'Apariencia'])
    assert.equal(declaracion(tienda, nombre), declaracion(admin, nombre), nombre);
});

test('la tienda y el Admin fechan en la misma zona horaria que el BFF', () => {
  const zona = /timeZone: '([^']+)'/;
  const delBff = zona.exec(readFileSync(root + '../backend/src/domain/comun/reloj.mjs', 'utf8'))?.[1];
  assert.equal(delBff, 'America/Lima');
  assert.equal(zona.exec(leer('src/app/features/checkout/domain/fecha-entrega.rules.ts'))?.[1], delBff);
  assert.match(
    leer('projects/admin/src/app/features/tienda/domain/resumen.rules.ts'),
    new RegExp(`export const ZONA_IANA_LIMA = '${delBff}';`),
  );
});

test('la relación de contraste de las e2e da lo mismo que la del BFF y la del Admin (casos-tema.json)', async () => {
  // Tercera copia: la usan las e2e para medir colores del navegador. Se transpila sin sus import, que solo usan
  // las funciones de Playwright.
  const fuente = leer('tests/e2e/apoyo/contraste.ts').replace(/^import [\s\S]*?;$/gm, '');
  const salida = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const { relacionDeContraste } = await import(
    `data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`
  );
  const casos = JSON.parse(readFileSync(root + '../backend/tests/unit/domain/temas/casos-tema.json', 'utf8'));
  const enRgb = (hex) =>
    `rgb(${[1, 3, 5].map((inicio) => parseInt(hex.slice(inicio, inicio + 2), 16)).join(', ')})`;
  for (const { a, b, relacion, decimales } of casos.contraste) {
    const factor = 10 ** decimales;
    assert.equal(
      Math.round(relacionDeContraste(enRgb(a), enRgb(b)) * factor) / factor,
      relacion,
      `${a} sobre ${b}`,
    );
  }
});
