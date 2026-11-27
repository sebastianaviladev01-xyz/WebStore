import { expect, request as nuevoRequest, test, type Locator, type Page } from '@playwright/test';

import { aceptarEliminacion, ventanaDeConfirmacion } from './apoyo/confirmacion';
import { activarTema, colorDelToken } from './apoyo/contraste';
import { cuentasAdmin, desplegarGrupo, desplegarTodos, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * Página «Temas» del Admin (feature 002). TEST-19: el `superadmin` lista, crea, edita, borra y activa temas
 * (AC-03 a AC-11), la vista previa no cambia el resto del Admin (AC-07), el contraste bloquea o avisa
 * (AC-14), activar aplica sin recargar (AC-10) y los datos desactualizados se avisan (AC-19); `admin` y
 * `vendedor` no tienen el módulo (AC-04). Cada prueba crea por la API del Admin los temas que necesita, con un
 * nombre único por ejecución, y arranca con B activo; al terminar, B queda activo y sin los temas de la spec.
 */
const PREFIJO = `E2E${Date.now().toString(36)}`;
const nombreUnico = (sufijo: string): string => `${PREFIJO} ${sufijo}`;

interface TemaDto {
  id: string;
  name: string;
  kind: 'predefined' | 'custom';
}
interface TemasAdminDto {
  revision: number;
  activeThemeId: string;
  themes: TemaDto[];
}

/** Colores de los temas propios que crea la spec: legibles, sin bloqueo de contraste y distintos de B. */
const COLORES_PROPIOS = {
  primary: '#1D4ED8',
  secondary: '#D97706',
  background: '#F3F5F8',
  surface: '#FFFFFF',
  contrast: '#16202E',
} as const;
// Lote 28 (PBI-0240): C lleva el grafito de principal (antes, el ámbar rgb(242, 183, 5)).
const PRIMARIO_C = 'rgb(31, 35, 40)';
/** TEST-15 (feature 004): el lienzo del Admin con B sigue en `--ws-bg`; el de la tienda no llega al Admin. */
const FONDO_PRINCIPAL = { b: 'rgb(243, 245, 248)' } as const;

/** Sesión del `superadmin` contra la API del Admin, para preparar y limpiar el estado sin pasar por la interfaz. */
async function conApi<T>(accion: (api: ClienteTemas) => Promise<T>): Promise<T> {
  const contexto = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const sesion = await contexto.post('/bff/admin/sessions', {
      data: { email: cuentasAdmin.superadmin.email, password: cuentasAdmin.superadmin.password },
    });
    expect(sesion.ok()).toBe(true);
    const headers = { authorization: `Bearer ${(await sesion.json()).token}` };

    const leer = async (respuesta: Awaited<ReturnType<typeof contexto.get>>): Promise<TemasAdminDto> => {
      expect(respuesta.ok()).toBe(true);
      return (await respuesta.json()) as TemasAdminDto;
    };
    const listar = async () => leer(await contexto.get('/bff/admin/themes', { headers }));
    return await accion({
      listar,
      async activar(themeId) {
        const { revision } = await listar();
        return leer(await contexto.put('/bff/admin/active-theme', { headers, data: { revision, themeId } }));
      },
      async crear(name) {
        const { revision } = await listar();
        const vista = await leer(
          await contexto.post('/bff/admin/themes', {
            headers,
            data: { revision, name, colors: COLORES_PROPIOS },
          }),
        );
        return vista.themes.find((tema) => tema.name === name)!;
      },
      async borrar(id) {
        const { revision } = await listar();
        return leer(await contexto.delete(`/bff/admin/themes/${id}?revision=${revision}`, { headers }));
      },
    });
  } finally {
    await contexto.dispose();
  }
}

interface ClienteTemas {
  listar(): Promise<TemasAdminDto>;
  activar(themeId: string): Promise<TemasAdminDto>;
  crear(name: string): Promise<TemaDto>;
  borrar(id: string): Promise<TemasAdminDto>;
}

/** Deja B activo y borra los temas propios que creó esta spec (los demás no se tocan). */
async function restablecer(): Promise<void> {
  await conApi(async (api) => {
    if ((await api.listar()).activeThemeId !== 'b') await api.activar('b');
    for (const tema of (await api.listar()).themes) {
      if (tema.kind === 'custom' && tema.name.startsWith(PREFIJO)) await api.borrar(tema.id);
    }
  });
}

const menu = (page: Page) => page.getByRole('navigation', { name: 'Administración' });
const predefinidos = (page: Page) => page.getByRole('region', { name: 'Predefinidos' });
const propios = (page: Page) => page.getByRole('region', { name: 'Propios' });
const fila = (seccion: Locator, nombre: string) =>
  seccion.getByRole('listitem').filter({ has: seccion.page().getByText(nombre, { exact: true }) });
const nuevoTema = (page: Page) => page.getByRole('button', { name: 'Nuevo tema' });
const dialogo = (page: Page) => page.getByRole('dialog');

/**
 * Abre «Nuevo tema» y espera a que el diálogo termine de abrirse: Material pone el foco en «Nombre» al acabar la
 * animación, y si la prueba ya está escribiendo en otro campo, el texto acaba en «Nombre» (lote 48, fallo intermitente
 * del CI: el código «0f766e» quedó en el nombre).
 */
async function abrirNuevoTema(page: Page): Promise<void> {
  await nuevoTema(page).click();
  await expect(dialogo(page).getByRole('textbox', { name: 'Nombre' })).toBeFocused();
}

async function abrirTemas(page: Page): Promise<void> {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await desplegarGrupo(page, 'Tienda');
  await menu(page).getByRole('link', { name: 'Temas', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Temas', exact: true })).toBeVisible();
  await expect(nuevoTema(page)).toBeEnabled();
}

/** Valor de `--ws-primary` calculado en el elemento. */
const primarioDe = (elemento: Locator) =>
  elemento.evaluate((nodo) => getComputedStyle(nodo).getPropertyValue('--ws-primary').trim());

test.describe('Temas del Admin', () => {
  test.beforeEach(restablecer);
  test.afterAll(restablecer);

  test('el superadmin abre Temas y ve los predefinidos sin Editar ni Borrar, con B activo', async ({
    page,
  }) => {
    await abrirTemas(page);
    await expect(page).toHaveTitle('WebStore Admin | Temas');

    const lista = predefinidos(page);
    for (const nombre of ['Violeta tienda', 'Azul cobalto', 'Grafito y ámbar']) {
      await expect(fila(lista, nombre)).toHaveCount(1);
    }
    await expect(lista.getByRole('button', { name: /^Editar / })).toHaveCount(0);
    await expect(lista.getByRole('button', { name: /^Borrar / })).toHaveCount(0);
    await expect(lista.getByText('Activo', { exact: true })).toHaveCount(1);
    await expect(fila(lista, 'Azul cobalto').getByText('Activo', { exact: true })).toBeVisible();
  });

  test('crear un tema: nombre repetido, bloqueo por contraste, aviso y guardado', async ({ page }) => {
    const nombre = nombreUnico('creado');
    await abrirTemas(page);
    await abrirNuevoTema(page);
    const formulario = dialogo(page);
    await expect(formulario.getByRole('heading', { name: 'Nuevo tema' })).toBeVisible();
    // Lote 25 (PBI-0224): a 1440 px, la ventana mide 1200 px (antes 960) y la vista previa es más ancha que los colores.
    expect((await formulario.boundingBox())?.width).toBe(1200);
    const vistaPrevia = await formulario
      .getByRole('heading', { name: 'Vista previa' })
      .locator('..')
      .boundingBox();
    const colores = await formulario.getByRole('group', { name: 'Colores' }).boundingBox();
    expect(vistaPrevia!.width).toBeGreaterThan(colores!.width * 1.2);

    // Nombre repetido, sin distinguir mayúsculas ni espacios.
    await formulario.getByLabel('Nombre').fill(' azul COBALTO ');
    await formulario.getByRole('button', { name: 'Guardar tema' }).click();
    await expect(formulario.getByText('Ya existe un tema con ese nombre.')).toBeVisible();
    await expect(formulario).toBeVisible();
    await expect(
      propios(page)
        .getByRole('listitem')
        .filter({ hasText: /Editar/ }),
    ).toHaveCount(0);

    await formulario.getByLabel('Nombre').fill(nombre);

    // Contraste muy bajo: bloquea.
    await formulario.getByLabel('Contraste', { exact: true }).fill('#c8cdd5');
    const bloqueo = formulario.locator('[data-contraste="bloqueo"]');
    await expect(bloqueo).toContainText(/Texto sobre el fondo principal: \d+\.\d:1, mínimo 4\.5:1/);
    await expect(formulario.getByRole('button', { name: 'Guardar tema' })).toBeDisabled();

    // Contraste medio: solo avisa y se puede guardar.
    await formulario.getByLabel('Contraste', { exact: true }).fill('#5f6b7a');
    await expect(formulario.locator('[data-contraste="aviso"]')).toBeVisible();
    await expect(formulario.locator('[data-contraste="bloqueo"]')).toHaveCount(0);
    await expect(formulario.getByRole('button', { name: 'Guardar tema' })).toBeEnabled();

    await formulario.getByRole('button', { name: 'Guardar tema' }).click();
    await expect(formulario).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: `Tema «${nombre}» creado.` })).toBeVisible();
    await expect(fila(propios(page), nombre)).toHaveCount(1);
  });

  test('la vista previa cambia con el color y el resto del Admin no', async ({ page }) => {
    await abrirTemas(page);
    await abrirNuevoTema(page);
    const vista = dialogo(page).locator('ws-admin-vista-previa-tema');
    const raiz = page.locator('html');

    const antes = { vista: await primarioDe(vista), raiz: await primarioDe(raiz) };
    expect(antes.vista).not.toBe('');

    await dialogo(page).getByLabel('Principal', { exact: true }).fill('#0f766e');
    await expect.poll(() => primarioDe(vista)).not.toBe(antes.vista);
    expect((await primarioDe(vista)).toLowerCase()).toBe('#0f766e');
    expect(await primarioDe(raiz)).toBe(antes.raiz);
  });

  // PBI-0077: «el Admin conserva su fondo principal» solo se probaba con B. Con A y con C, el lienzo del Admin es el
  // `--ws-bg` del tema activo, no el `--ws-store-bg` de la tienda.
  for (const tema of ['a', 'c'] as const) {
    test(`con ${tema.toUpperCase()}, el Admin pinta su fondo principal y no el lienzo de la tienda`, async ({
      page,
    }) => {
      await activarTema(tema);
      await page.goto('/login');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const [principal, lienzoDeLaTienda] = await Promise.all([
        colorDelToken(page, '--ws-bg'),
        colorDelToken(page, '--ws-store-bg'),
      ]);
      expect(principal).not.toBe(lienzoDeLaTienda);
      const fondos = () =>
        page.evaluate(() => [
          getComputedStyle(document.body).backgroundColor,
          getComputedStyle(document.querySelector('main')!).backgroundColor,
        ]);
      expect(await fondos()).toEqual([principal, principal]);
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      expect((await fondos())[0]).toBe(principal);
    });
  }

  test('TEST-15: con B, el Admin sigue en el fondo principal y la vista previa usa el lienzo de la tienda', async ({
    page,
  }) => {
    const fondoDelBody = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await fondoDelBody()).toBe(FONDO_PRINCIPAL.b);
    expect(await page.locator('main').evaluate((main) => getComputedStyle(main).backgroundColor)).toBe(
      FONDO_PRINCIPAL.b,
    );

    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    expect(await fondoDelBody()).toBe(FONDO_PRINCIPAL.b);

    await desplegarGrupo(page, 'Tienda');
    await menu(page).getByRole('link', { name: 'Temas', exact: true }).click();
    await expect(nuevoTema(page)).toBeEnabled();
    expect(await fondoDelBody()).toBe(FONDO_PRINCIPAL.b);

    // La muestra de cada tema enseña su fondo principal de siempre (el tercer color), no el de la tienda.
    const muestraDeB = fila(predefinidos(page), 'Azul cobalto').locator('span[aria-hidden="true"] > span');
    await expect(muestraDeB).toHaveCount(5);
    await expect(muestraDeB.nth(2)).toHaveCSS('background-color', FONDO_PRINCIPAL.b);

    // La vista previa se pinta con el lienzo de la tienda del tema que se edita (`--ws-store-bg`), no con `--ws-bg`.
    await abrirNuevoTema(page);
    const vista = dialogo(page).locator('ws-admin-vista-previa-tema');
    const figura = vista.locator('figure');
    await expect(figura).toBeVisible();
    const lienzo = () => figura.evaluate((nodo) => getComputedStyle(nodo).backgroundColor);
    const variable = (nombre: string) =>
      vista.evaluate((nodo, n) => getComputedStyle(nodo).getPropertyValue(n).trim(), nombre);
    expect((await variable('--ws-store-bg')).toUpperCase()).toBe('#F3F5F8');
    expect(await lienzo()).toBe(FONDO_PRINCIPAL.b);

    await vista.evaluate((nodo: HTMLElement) => nodo.style.setProperty('--ws-store-bg', '#123456'));
    await expect.poll(lienzo).toBe('rgb(18, 52, 86)');
    expect((await variable('--ws-bg')).toUpperCase()).toBe('#F3F5F8');
    expect(await fondoDelBody()).toBe(FONDO_PRINCIPAL.b);
  });

  test('TEST-15: un texto secundario bajo su mínimo avisa también sobre el fondo de la tienda y se guarda', async ({
    page,
  }) => {
    const nombre = nombreUnico('secundario');
    await abrirTemas(page);
    await abrirNuevoTema(page);
    const formulario = dialogo(page);
    await formulario.getByLabel('Nombre').fill(nombre);
    await formulario.getByLabel('Contraste', { exact: true }).fill('#5f6b7a');

    const aviso = formulario.locator('[data-contraste="aviso"]');
    await expect(aviso).toContainText(/Texto secundario sobre el fondo principal: \d+\.\d:1, mínimo 4\.5:1/);
    await expect(aviso).toContainText(
      /Texto secundario sobre el fondo de la tienda: \d+\.\d:1, mínimo 4\.5:1/,
    );
    await expect(formulario.locator('[data-contraste="bloqueo"]')).toHaveCount(0);

    await formulario.getByRole('button', { name: 'Guardar tema' }).click();
    await expect(formulario).toBeHidden();
    await expect(fila(propios(page), nombre)).toHaveCount(1);
  });

  test('editar un tema propio abre el diálogo con su nombre y guarda el nuevo', async ({ page }) => {
    const original = nombreUnico('editar');
    const nuevo = nombreUnico('editado');
    await conApi((api) => api.crear(original));
    await abrirTemas(page);

    await page.getByRole('button', { name: `Editar ${original}` }).click();
    const formulario = dialogo(page);
    await expect(formulario.getByRole('heading', { name: 'Editar tema' })).toBeVisible();
    await expect(formulario.getByLabel('Nombre')).toHaveValue(original);

    await formulario.getByLabel('Nombre').fill(nuevo);
    await formulario.getByRole('button', { name: 'Guardar tema' }).click();
    await expect(formulario).toBeHidden();
    await expect(fila(propios(page), nuevo)).toHaveCount(1);
    await expect(fila(propios(page), original)).toHaveCount(0);
  });

  test('PBI-0235: en una pantalla baja, la ventana del tema crece hasta casi todo el alto y se desplaza dentro', async ({
    page,
  }) => {
    // Lote 27: antes, el contenido se quedaba en el 65 % del alto y la ventana, muy por debajo de la pantalla.
    await page.setViewportSize({ width: 1440, height: 640 });
    await abrirTemas(page);
    await abrirNuevoTema(page);
    const formulario = dialogo(page);
    await expect(formulario.getByRole('heading', { name: 'Nuevo tema' })).toBeVisible();
    const caja = (await formulario.boundingBox())!;
    expect(caja.height).toBeGreaterThanOrEqual(640 - 32 - 1);
    expect(caja.y + caja.height).toBeLessThanOrEqual(640);
    // Los botones siguen a la vista y lo de abajo se alcanza desplazando el contenido, no la página.
    await expect(formulario.getByRole('button', { name: 'Guardar tema' })).toBeInViewport();
    const nota = formulario.getByText('Solo cambia aquí.', { exact: false });
    await nota.scrollIntoViewIfNeeded();
    await expect(nota).toBeInViewport();
    await expect(formulario.getByRole('button', { name: 'Guardar tema' })).toBeInViewport();
    await expect(formulario.getByRole('heading', { name: 'Nuevo tema' })).toBeInViewport();
  });

  test('PBI-0237: a 375 px, el error del nombre no se monta sobre «Colores»', async ({ page }) => {
    // Se entra con el menú lateral del escritorio y se pasa a 375 px ya en Temas.
    await abrirTemas(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await abrirNuevoTema(page);
    const formulario = dialogo(page);
    const nombre = formulario.getByRole('textbox', { name: 'Nombre' });
    await nombre.fill('');
    await nombre.blur();
    const error = formulario.getByText('El nombre del tema debe tener entre 1 y 40 caracteres.');
    await expect(error).toBeVisible();
    // PBI-0264: el diálogo y el error entran con animación (la escala del diálogo y el desplazamiento del error), y
    // medir las dos cajas en un instante de la animación dio una vez 0,34 px de cruce. Se mide hasta que la posición se
    // asienta: si el error sigue sobre «Colores» al terminar, la espera se agota y la prueba falla igual.
    const colores = formulario.getByText('Colores', { exact: true });
    await expect
      .poll(
        async () => {
          const cajaError = (await error.boundingBox())!;
          const cajaColores = (await colores.boundingBox())!;
          return cajaColores.y - (cajaError.y + cajaError.height);
        },
        { message: 'espacio entre el final del error y «Colores»' },
      )
      .toBeGreaterThanOrEqual(0);
  });

  // Lote 29 (ADR-0027, PBI-0239): junto al selector nativo, cada color tiene un campo de texto con su código hexadecimal.
  // Daniel: «yo quiero escribir hexadecimal, no me permite». Los dos se sincronizan, el código se acepta con o sin «#» y
  // en minúsculas, y uno mal escrito se marca, no se aplica ni se guarda. La revisión de contraste mira lo escrito.
  test('PBI-0239: el código hexadecimal se escribe junto al selector, se sincroniza y uno mal escrito no se guarda', async ({
    page,
  }) => {
    const nombre = nombreUnico('hexadecimal');
    await abrirTemas(page);
    await abrirNuevoTema(page);
    const formulario = dialogo(page);
    const vista = formulario.locator('ws-admin-vista-previa-tema');
    const codigo = (color: string) =>
      formulario.getByRole('textbox', { name: `Código hexadecimal de ${color}`, exact: true });
    const selector = (color: string) => formulario.getByLabel(color, { exact: true });

    // Cada color tiene su campo, con su ayuda, y empieza con el código del selector.
    for (const color of ['Principal', 'Secundario', 'Fondo principal', 'Fondo secundario', 'Contraste']) {
      await expect(codigo(color)).toBeVisible();
      await expect(codigo(color)).toHaveAccessibleDescription(/escribe su código hexadecimal, como #1F2328/);
      expect((await codigo(color).inputValue()).toLowerCase()).toBe(await selector(color).inputValue());
    }

    // Escrito sin «#» y en minúsculas: se aplica al selector y a la vista previa, y al salir se normaliza.
    await codigo('Principal').fill('0f766e');
    await expect(selector('Principal')).toHaveValue('#0f766e');
    await expect.poll(async () => (await primarioDe(vista)).toLowerCase()).toBe('#0f766e');
    await codigo('Principal').press('Tab');
    await expect(codigo('Principal')).toHaveValue('#0F766E');

    // Del selector al campo.
    await selector('Principal').fill('#1d4ed8');
    await expect(codigo('Principal')).toHaveValue('#1D4ED8');

    // La revisión de contraste se aplica al código escrito: bloquea y luego solo avisa.
    await codigo('Contraste').fill('#C8CDD5');
    await expect(formulario.locator('[data-contraste="bloqueo"]')).toContainText(
      /Texto sobre el fondo principal: \d+\.\d:1, mínimo 4\.5:1/,
    );
    await expect(formulario.getByRole('button', { name: 'Guardar tema' })).toBeDisabled();
    await codigo('Contraste').fill('#5F6B7A');
    await expect(formulario.locator('[data-contraste="aviso"]')).toBeVisible();
    await expect(formulario.locator('[data-contraste="bloqueo"]')).toHaveCount(0);

    // Un código mal escrito se marca con su error y no cambia el color.
    const secundarioAntes = await selector('Secundario').inputValue();
    await codigo('Secundario').fill('#12345G');
    await codigo('Secundario').press('Tab');
    const motivo = 'Usa seis dígitos del 0 al 9 o letras de la A a la F, como #1F2328.';
    await expect(codigo('Secundario')).toHaveAttribute('aria-invalid', 'true');
    await expect(codigo('Secundario')).toHaveAccessibleDescription(new RegExp(motivo.replace('.', '\\.')));
    await expect(formulario.getByText(motivo)).toBeVisible();
    await expect(selector('Secundario')).toHaveValue(secundarioAntes);

    // Con un código mal escrito no se guarda: el diálogo sigue abierto y no llega nada al BFF.
    let creados = 0;
    page.on('request', (peticion) => {
      if (peticion.method() === 'POST' && peticion.url().endsWith('/bff/admin/themes')) creados += 1;
    });
    await formulario.getByLabel('Nombre').fill(nombre);
    await formulario.getByRole('button', { name: 'Guardar tema' }).click();
    await expect(formulario).toBeVisible();
    await expect(codigo('Secundario')).toBeFocused();
    expect(creados).toBe(0);

    // Corregido, el error se va y se guarda con los códigos escritos.
    await codigo('Secundario').fill('#f2b705');
    await expect(codigo('Secundario')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(formulario.getByText(motivo)).toHaveCount(0);
    await formulario.getByRole('button', { name: 'Guardar tema' }).click();
    await expect(formulario).toBeHidden();
    expect(creados).toBe(1);
    const guardado = await conApi(async (api) =>
      (await api.listar()).themes.find((tema) => tema.name === nombre),
    );
    expect((guardado as unknown as { colors: Record<string, string> }).colors).toMatchObject({
      primary: '#1D4ED8',
      secondary: '#F2B705',
      contrast: '#5F6B7A',
    });
  });

  test('PBI-0239: a 375 px, cada color muestra su selector y su código sin desbordar la ventana', async ({
    page,
  }) => {
    await abrirTemas(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await abrirNuevoTema(page);
    const formulario = dialogo(page);
    const cajaDialogo = (await formulario.boundingBox())!;
    for (const color of ['Principal', 'Secundario', 'Fondo principal', 'Fondo secundario', 'Contraste']) {
      for (const campo of [
        formulario.getByLabel(color, { exact: true }),
        formulario.getByRole('textbox', { name: `Código hexadecimal de ${color}`, exact: true }),
      ]) {
        await campo.scrollIntoViewIfNeeded();
        const caja = (await campo.boundingBox())!;
        expect(caja.x).toBeGreaterThanOrEqual(cajaDialogo.x);
        expect(caja.x + caja.width).toBeLessThanOrEqual(cajaDialogo.x + cajaDialogo.width);
      }
    }
    const contenido = formulario.locator('.ws-tema-dialog-contenido');
    expect(await contenido.evaluate((nodo) => nodo.scrollWidth <= nodo.clientWidth)).toBe(true);
    await formulario
      .getByRole('textbox', { name: 'Código hexadecimal de Fondo principal', exact: true })
      .fill('abc');
    await formulario
      .getByRole('textbox', { name: 'Código hexadecimal de Fondo principal', exact: true })
      .blur();
    await expect(
      formulario.getByText('Usa seis dígitos del 0 al 9 o letras de la A a la F, como #1F2328.'),
    ).toBeVisible();
    expect(await contenido.evaluate((nodo) => nodo.scrollWidth <= nodo.clientWidth)).toBe(true);
  });

  test('borrar un tema propio que no es el activo lo quita de la lista', async ({ page }) => {
    const nombre = nombreUnico('borrar');
    await conApi((api) => api.crear(nombre));
    await abrirTemas(page);
    await expect(fila(propios(page), nombre)).toHaveCount(1);

    // Lote 43 (PBI-0269): la ventana propia de confirmación, con el nombre del tema.
    await page.getByRole('button', { name: `Borrar ${nombre}` }).click();
    await aceptarEliminacion(page, nombre);
    await expect(page.getByRole('status').filter({ hasText: `Tema «${nombre}» borrado.` })).toBeVisible();
    await expect(fila(propios(page), nombre)).toHaveCount(0);
  });

  test('el tema activo no se borra', async ({ page }) => {
    const nombre = nombreUnico('activo');
    await conApi((api) => api.crear(nombre));
    await abrirTemas(page);

    await page.getByRole('button', { name: `Activar ${nombre}` }).click();
    await expect(fila(propios(page), nombre).getByText('Activo', { exact: true })).toBeVisible();

    // No debe abrirse ninguna confirmación: la regla se avisa antes.
    let confirmaciones = 0;
    page.on('dialog', (aviso) => {
      confirmaciones += 1;
      void aviso.dismiss();
    });
    await page.getByRole('button', { name: `Borrar ${nombre}` }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Activa otro tema antes de borrar este.' }),
    ).toBeVisible();
    await expect(fila(propios(page), nombre)).toHaveCount(1);
    expect(confirmaciones).toBe(0);
    await expect(ventanaDeConfirmacion(page)).toHaveCount(0);
  });

  test('activar «Grafito y ámbar» aplica el tema al Admin sin recargar', async ({ page }) => {
    await abrirTemas(page);
    const boton = nuevoTema(page);
    await expect(boton).not.toHaveCSS('background-color', PRIMARIO_C);
    const origen = await page.evaluate(() => performance.timeOrigin);
    let navegaciones = 0;
    page.on('framenavigated', (marco) => {
      if (marco === page.mainFrame()) navegaciones += 1;
    });

    await page.getByRole('button', { name: 'Activar Grafito y ámbar' }).click();
    await expect(
      fila(predefinidos(page), 'Grafito y ámbar').getByText('Activo', { exact: true }),
    ).toBeVisible();
    await expect(boton).toHaveCSS('background-color', PRIMARIO_C);

    expect(navegaciones).toBe(0);
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(origen);
  });

  test('con datos desactualizados avisa y muestra el tema que activó la otra persona', async ({
    page,
    browser,
  }) => {
    const nombre = nombreUnico('rival');
    await conApi((api) => api.crear(nombre));
    await abrirTemas(page);
    await expect(fila(predefinidos(page), 'Azul cobalto').getByText('Activo', { exact: true })).toBeVisible();

    const otro = await browser.newContext({ baseURL: urls.admin });
    try {
      const otraPagina = await otro.newPage();
      await abrirTemas(otraPagina);
      await otraPagina.getByRole('button', { name: 'Activar Grafito y ámbar' }).click();
      await expect(
        fila(predefinidos(otraPagina), 'Grafito y ámbar').getByText('Activo', { exact: true }),
      ).toBeVisible();
    } finally {
      await otro.close();
    }

    // La primera página sigue con la revisión vieja y no recarga.
    await page.getByRole('button', { name: `Activar ${nombre}` }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: /^\s*Otra persona cambió los temas/ }),
    ).toBeVisible();
    await expect(
      fila(predefinidos(page), 'Grafito y ámbar').getByText('Activo', { exact: true }),
    ).toBeVisible();
    await expect(fila(predefinidos(page), 'Azul cobalto').getByText('Activo', { exact: true })).toHaveCount(
      0,
    );
  });

  for (const rol of ['admin', 'vendedor'] as const) {
    test(`${rol} no tiene Temas en el menú y /temas lo deja en Dashboard`, async ({ page }) => {
      await ingresarAlAdmin(page, cuentasAdmin[rol]);
      // Con todo desplegado: con «Tienda» plegado, la ausencia de «Temas» pasaría siempre.
      await desplegarTodos(page);
      await expect(menu(page).getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
      await expect(menu(page).getByRole('link', { name: 'Temas', exact: true })).toHaveCount(0);

      await page.goto('/temas');
      await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
      await expect(page.getByRole('heading', { level: 1, name: 'Temas', exact: true })).toHaveCount(0);
    });
  }
});
