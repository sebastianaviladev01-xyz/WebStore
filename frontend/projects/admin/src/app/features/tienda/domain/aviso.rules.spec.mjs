import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 30 (ADR-0027, PBI-0244; provisional, por confirmar con Daniel): cada aviso de la barra superior lleva un
// «Desde» y un «Hasta» opcionales, con fecha y hora de Lima. El formulario los muestra y los recibe como el valor de un
// `datetime-local` (`AAAA-MM-DDTHH:mm`) y se guardan como instantes con `-05:00`, como la vigencia de los banners: el
// «Desde» al empezar el minuto y el «Hasta» al terminarlo. Contenido marca cada aviso como programado, vigente o
// vencido; la regla recibe el instante y no lee el reloj. La regla de los banners se antepone porque el archivo se
// transpila sin sus import (PBI-0080).
const source = [
  await readFile(new URL('./banner.rules.ts', import.meta.url), 'utf8'),
  await readFile(new URL('./aviso.rules.ts', import.meta.url), 'utf8'),
].join('\n');
const moduleSource = ts.transpileModule(source.replace(/^import [\s\S]*?;$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { avisoAFormulario, avisoDesdeFormulario, motivoDeVigenciaDeAviso, estadoDelAviso } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('PBI-0244: un aviso guardado se muestra en el formulario con su «Desde» y su «Hasta» en hora de Lima', () => {
  assert.deepEqual(
    avisoAFormulario({
      text: 'Black Friday',
      url: '/catalogo',
      startAt: '2026-11-27T00:00:00.000-05:00',
      endAt: '2026-11-28T04:59:59.999Z',
    }),
    { text: 'Black Friday', url: '/catalogo', startAt: '2026-11-27T00:00', endAt: '2026-11-27T23:59' },
  );
  // Un aviso de antes del lote, sin fechas, deja los dos campos vacíos.
  assert.deepEqual(avisoAFormulario({ text: 'Siempre', url: '' }), {
    text: 'Siempre',
    url: '',
    startAt: '',
    endAt: '',
  });
});

test('PBI-0244: al guardar, el «Desde» empieza el minuto y el «Hasta» lo termina, con la zona de Lima', () => {
  assert.deepEqual(
    avisoDesdeFormulario({
      text: ' Black Friday ',
      url: ' /catalogo ',
      startAt: '2026-11-27T00:00',
      endAt: '2026-11-27T23:59',
    }),
    {
      text: 'Black Friday',
      url: '/catalogo',
      startAt: '2026-11-27T00:00:00.000-05:00',
      endAt: '2026-11-27T23:59:59.999-05:00',
    },
  );
});

test('PBI-0244: sin fechas, el aviso se guarda como antes del lote, sin startAt ni endAt', () => {
  assert.deepEqual(avisoDesdeFormulario({ text: 'Siempre', url: '', startAt: '', endAt: '' }), {
    text: 'Siempre',
    url: '',
  });
  assert.deepEqual(
    avisoDesdeFormulario({ text: 'Solo hasta', url: '', startAt: '', endAt: '2026-12-24T18:00' }),
    { text: 'Solo hasta', url: '', endAt: '2026-12-24T18:00:59.999-05:00' },
  );
});

test('PBI-0244: un extremo que no se cambió conserva el instante guardado (no se envía como cambio)', () => {
  const guardado = {
    text: 'Cierre',
    url: '',
    startAt: '2026-11-27T05:00:00Z',
    endAt: '2026-11-27T23:59:59.999-05:00',
  };
  assert.deepEqual(avisoDesdeFormulario(avisoAFormulario(guardado), guardado), guardado);
});

test('PBI-0244: «Hasta» tiene que ser posterior a «Desde»; sin alguno de los dos, no se compara', () => {
  const motivo = 'El «Hasta» tiene que ser posterior al «Desde».';
  assert.equal(motivoDeVigenciaDeAviso('2026-11-27T10:00', '2026-11-27T09:00'), motivo);
  assert.equal(motivoDeVigenciaDeAviso('2026-11-27T10:00', '2026-11-27T10:00'), motivo);
  assert.equal(motivoDeVigenciaDeAviso('2026-11-27T10:00', '2026-11-27T10:01'), null);
  assert.equal(motivoDeVigenciaDeAviso('', '2026-11-27T09:00'), null);
  assert.equal(motivoDeVigenciaDeAviso('2026-11-27T10:00', ''), null);
  assert.equal(motivoDeVigenciaDeAviso('', ''), null);
});

test('PBI-0244: cada aviso está programado, vigente o vencido según el instante dado, en hora de Lima', () => {
  const desde = '2026-11-27T00:00';
  const hasta = '2026-11-27T23:59';
  // 26/11 a las 23:59:59 en Lima son las 04:59:59 UTC del 27.
  assert.equal(estadoDelAviso(desde, hasta, Date.parse('2026-11-27T04:59:59.999Z')), 'Programado');
  assert.equal(estadoDelAviso(desde, hasta, Date.parse('2026-11-27T05:00:00.000Z')), 'Vigente');
  assert.equal(estadoDelAviso(desde, hasta, Date.parse('2026-11-28T04:59:59.999Z')), 'Vigente');
  assert.equal(estadoDelAviso(desde, hasta, Date.parse('2026-11-28T05:00:00.000Z')), 'Vencido');
  // Sin fechas, siempre vigente; con uno solo, cuenta ese extremo.
  assert.equal(estadoDelAviso('', '', 0), 'Vigente');
  assert.equal(estadoDelAviso(desde, '', Date.parse('2030-01-01T00:00:00Z')), 'Vigente');
  assert.equal(estadoDelAviso('', hasta, Date.parse('2030-01-01T00:00:00Z')), 'Vencido');
});
