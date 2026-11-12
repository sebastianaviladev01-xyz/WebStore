import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

// Prueba de límites (frontend/architecture.md §2.1), como la de IdShield. Cada sonda es un texto que ESLint
// analiza con la ruta de un archivo real de la capa que sondea: Sheriff analiza el texto recibido, no el
// del disco, así que la prueba no escribe nada en src/. Si se renombra un archivo de las tablas, actualízalas.

const root = fileURLToPath(new URL('../..', import.meta.url));
const eslint = new ESLint({ cwd: root });
const dependencyRule = '@softarc/sheriff/dependency-rule';

const files = {
  catalogoPage: 'src/app/features/vitrina/presentation/catalogo.page.ts',
  inicioPage: 'src/app/features/vitrina/presentation/inicio.page.ts',
  productoModel: 'src/app/features/catalogo/domain/producto.model.ts',
  catalogoFacade: 'src/app/features/catalogo/application/catalogo.facade.ts',
  carritoFacade: 'src/app/features/carrito/application/carrito.facade.ts',
  bffCatalogoGateway: 'src/app/features/catalogo/data/bff-catalogo.gateway.ts',
  bffHttp: 'src/app/core/bff-http.ts',
  emptyState: 'src/app/shared/ui/empty-state.component.ts',
  appLayout: 'src/app/layout/app.layout.ts',
  appConfig: 'src/app/app.config.ts',
  tiendaFacade: 'projects/admin/src/app/features/tienda/application/tienda.facade.ts',
  bffTiendaGateway: 'projects/admin/src/app/features/tienda/data/bff-tienda.gateway.ts',
  rolRules: 'projects/admin/src/app/features/sesion/domain/rol.rules.ts',
  adminLayout: 'projects/admin/src/app/layout/app.layout.ts',
};
const contents = new Map(Object.values(files).map((file) => [file, readFileSync(root + file, 'utf8')]));
// Feature `temas` (TEST-16). Se sondea con la ruta de su facade del Admin y de los modelos de cada aplicación.
const temas = {
  facadeAdmin: 'projects/admin/src/app/features/temas/application/temas.facade.ts',
  modeloAdmin: 'projects/admin/src/app/features/temas/domain/tema.model.ts',
  modeloTienda: 'src/app/features/temas/domain/tema.model.ts',
};

async function lint(file, imports) {
  const code = imports.map((path, index) => `import * as m${index} from '${path}';`).join('\n');
  const [result] = await eslint.lintText(
    `${code}\nexport const probe = [${imports.map((_, index) => `m${index}`).join(', ')}];\n`,
    { filePath: root + file },
  );
  return result.messages;
}
const byRule = (messages, rule) => messages.filter((message) => message.ruleId === rule);

describe('Sheriff rechaza las dependencias prohibidas', () => {
  const probes = [
    ['presentation → data', files.catalogoPage, '../../catalogo/data/bff-catalogo.gateway'],
    ['domain → application', files.productoModel, '../application/catalogo.facade'],
    ['application → data', files.catalogoFacade, '../data/bff-catalogo.gateway'],
    [
      'feature no declarada (catalogo → carrito)',
      files.catalogoFacade,
      '../../carrito/application/carrito.facade',
    ],
    [
      'application → presentation',
      files.carritoFacade,
      '../../vitrina/presentation/tarjeta-producto.component',
    ],
    ['core → feature', files.bffHttp, '../features/catalogo/domain/producto.model'],
    ['shared/ui → feature', files.emptyState, '../../features/catalogo/domain/producto.model'],
    ['layout → data', files.appLayout, '../features/catalogo/data/bff-catalogo.gateway'],
    ['data → application', files.bffTiendaGateway, '../../sesion/application/sesion.facade'],
    ['feature no declarada (sesion → tienda)', files.rolRules, '../../tienda/domain/tienda.model'],
    ['admin → storefront', files.tiendaFacade, '../../../../../../../src/app/core/bff-http'],
  ];
  for (const [name, file, path] of probes) {
    test(`${name}: ${file} no puede importar ${path}`, async () => {
      assert.equal(byRule(await lint(file, [path]), dependencyRule).length, 1);
    });
  }

  test('acepta las dependencias que la arquitectura permite', async () => {
    const messages = await lint(files.inicioPage, [
      '../../catalogo/application/catalogo.facade',
      '../../contenido/domain/contenido.model',
      '../../../shared/ui/reveal.directive',
      '../../../core/bff-request.error',
    ]);
    assert.deepEqual(messages, []);
  });
});

describe('feature temas (TEST-16)', () => {
  test('en el Admin, temas puede depender de sesion', async () => {
    const messages = await lint(temas.facadeAdmin, [
      '../../sesion/application/sesion.facade',
      '../../sesion/domain/rol.rules',
      '../domain/temas.gateway',
    ]);
    assert.deepEqual(messages, []);
  });
  const prohibidas = [
    [
      'temas de la tienda → temas del Admin',
      temas.modeloTienda,
      '../../../../../projects/admin/src/app/features/temas/domain/tema.model',
    ],
    [
      'temas del Admin → temas de la tienda',
      temas.modeloAdmin,
      '../../../../../../../src/app/features/temas/domain/tema.model',
    ],
    [
      'temas → tienda en el Admin (no declarada)',
      temas.facadeAdmin,
      '../../tienda/application/tienda.facade',
    ],
    ['sesion → temas en el Admin (sin ciclos)', files.rolRules, '../../temas/domain/tema.model'],
  ];
  for (const [name, file, path] of prohibidas) {
    test(`${name}: ${file} no puede importar ${path}`, async () => {
      assert.equal(byRule(await lint(file, [path]), dependencyRule).length, 1);
    });
  }
});

describe('layout del Admin (TEST-02, feature 003)', () => {
  // El menú de usuario vive en `layout/` y la página Perfil en `features/sesion/presentation/`: la regla que
  // obliga a separarlos es que el layout no puede importar la capa de presentación de una feature.
  test('layout → presentation de sesion: el layout no puede importar features/sesion/presentation', async () => {
    const messages = await lint(files.adminLayout, ['../features/sesion/presentation/login.page']);
    assert.equal(byRule(messages, dependencyRule).length, 1);
  });

  test('el layout sí puede depender de la capa application de sesion', async () => {
    const messages = await lint(files.adminLayout, ['../features/sesion/application/sesion.facade']);
    assert.deepEqual(byRule(messages, dependencyRule), []);
  });
});

describe('no-restricted-imports limita las librerías externas', () => {
  for (const library of ['@angular/core', 'rxjs']) {
    test(`domain/ no puede importar ${library}`, async () => {
      assert.equal(byRule(await lint(files.productoModel, [library]), 'no-restricted-imports').length, 1);
    });
  }
  for (const file of [files.catalogoFacade, files.catalogoPage, files.appLayout, files.tiendaFacade]) {
    test(`${file} no puede importar @angular/common/http`, async () => {
      assert.equal(byRule(await lint(file, ['@angular/common/http']), 'no-restricted-imports').length, 1);
    });
  }
  for (const file of [files.bffCatalogoGateway, files.bffHttp, files.appConfig, files.bffTiendaGateway]) {
    test(`${file} sí puede importar @angular/common/http`, async () => {
      assert.deepEqual(byRule(await lint(file, ['@angular/common/http']), 'no-restricted-imports'), []);
    });
  }
});

after(() => {
  for (const [file, content] of contents) assert.equal(readFileSync(root + file, 'utf8'), content, file);
});
