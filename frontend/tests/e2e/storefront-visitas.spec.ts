import { expect, test } from '@playwright/test';

/**
 * Lote 07b (ADR-0017), PBI-0027: la tienda envía un latido para «Personas en línea» del Admin. Solo lleva un
 * identificador aleatorio de la pestaña: sin cookie, sin cuenta y sin otros datos; la misma pestaña repite el suyo y
 * otra pestaña tiene otro.
 */
const esLatido = (url: string, metodo: string) =>
  metodo === 'POST' && new URL(url).pathname === '/bff/visits';

test('la tienda envía un latido con un identificador de pestaña, sin cookie ni datos de la persona', async ({
  page,
  context,
}) => {
  const primero = page.waitForRequest((peticion) => esLatido(peticion.url(), peticion.method()));
  await page.goto('/');
  const peticion = await primero;
  const cuerpo = peticion.postDataJSON() as Record<string, unknown>;
  expect(Object.keys(cuerpo)).toEqual(['visitId']);
  expect(cuerpo['visitId']).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
  const respuesta = await peticion.response();
  expect(respuesta?.status()).toBe(204);
  expect(respuesta?.headers()['set-cookie']).toBeUndefined();
  expect((await context.cookies()).some((cookie) => cookie.value === cuerpo['visitId'])).toBe(false);

  // Al recargar, la misma pestaña repite su identificador.
  const segundo = page.waitForRequest((otra) => esLatido(otra.url(), otra.method()));
  await page.reload();
  expect(((await segundo).postDataJSON() as { visitId: string }).visitId).toBe(cuerpo['visitId']);

  // Otra pestaña tiene otro.
  const otraPagina = await context.newPage();
  const tercero = otraPagina.waitForRequest((otra) => esLatido(otra.url(), otra.method()));
  await otraPagina.goto('/');
  expect(((await tercero).postDataJSON() as { visitId: string }).visitId).not.toBe(cuerpo['visitId']);
  await otraPagina.close();
});
