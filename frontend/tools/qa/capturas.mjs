// Capturas de QA visual con Playwright (PBI-0057, STD-12). Toma cada escenario de un archivo de escenarios por tema y
// por ancho, antes y después de un cambio, con la misma sesión, los mismos datos y el mismo método. Uso, desde frontend/:
//   node tools/qa/capturas.mjs <escenarios.mjs> antes|despues [escenario] [--salida carpeta]
// Sin `--salida`, guarda en `output/visual-qa/<nombre del archivo>/{antes,despues}` (carpeta ignorada por git).
// Requiere el BFF (QA_BFF, por omisión 3000) en modo demo, sobre una copia de datos que no cambie entre las dos tomas, el
// Admin (QA_ADMIN, 4300) y la tienda (QA_TIENDA, 4200). Ver `escenarios/ejemplo.mjs` y la sección «Comparar capturas»
// de docs/development/agent-execution.md. Las tomas emulan movimiento reducido salvo en los escenarios con
// `conMovimiento: true`: sin eso, lo que aparece al desplazarse (`wsReveal`) sale vacío en la página completa.
// La página completa dibuja los elementos fijos o pegados en su lugar del primer viewport (PBI-0252): un escenario con
// `desplazamientos` (por ejemplo, `[0, 'mitad', 'final']`) toma además la ventana en esas posiciones, cada una en
// `<escenario>-<ancho>-ventana-<posición>.png`. Sin `desplazamientos`, las tomas y sus nombres son los de siempre.
// Si el archivo de escenarios exporta `alTerminar`, se llama al acabar, también si una toma falla (PBI-0261).
import { basename, extname, join } from 'node:path';
import { chromium } from 'playwright';

import {
  ADMIN,
  asentar,
  cargarEscenarios,
  carpetaDeSalida,
  conSesion,
  cookieDeTema,
  dejarLimpia,
  TIENDA,
  tokensDeAdmin,
} from './lib/qa.mjs';
import { resolverDesplazamiento, tomasDeEscenario } from './lib/tomas.mjs';

/** Lleva la ventana a una posición de `desplazamientos` sin animación y espera a que se asiente. */
async function desplazar(page, posicion) {
  const medidas = await page.evaluate(() => ({
    altoDelDocumento: document.documentElement.scrollHeight,
    altoDeLaVentana: window.innerHeight,
  }));
  const y = resolverDesplazamiento(posicion, medidas);
  await page.evaluate((destino) => window.scrollTo({ top: destino, behavior: 'instant' }), y);
  await asentar(page);
}

const argumentos = process.argv.slice(2);
const posicion = argumentos.indexOf('--salida');
const salidaIndicada = posicion >= 0 ? argumentos.splice(posicion, 2)[1] : undefined;
const [archivo, etapa, solo] = argumentos;
if (!archivo || !['antes', 'despues'].includes(etapa)) {
  throw new Error('Uso: capturas.mjs <escenarios.mjs> antes|despues [escenario] [--salida carpeta]');
}

const { escenarios, anchos, alTerminar } = await cargarEscenarios(archivo);
const raiz = salidaIndicada ?? join('output', 'visual-qa', basename(archivo, extname(archivo)));
const salida = await carpetaDeSalida(raiz, etapa);
// Un `desplazamientos` mal escrito se dice antes de abrir el navegador, no a mitad de las tomas.
for (const [nombre, escenario] of Object.entries(escenarios)) tomasDeEscenario(nombre, escenario, 0);
const tokens = await tokensDeAdmin();

const navegador = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [nombre, escenario] of Object.entries(escenarios)) {
    if (solo && solo !== nombre) continue;
    for (const viewport of anchos) {
      if (escenario.soloMovil && viewport.width > 768) continue;
      // Movimiento reducido por omisión (lote 20): lo que aparece al desplazarse (`wsReveal`) se ve desde el principio y
      // la toma de página completa sale entera. Un escenario con `conMovimiento: true` se toma con las animaciones.
      const context = await navegador.newContext({
        viewport,
        locale: 'es-PE',
        timezoneId: 'America/Lima',
        reducedMotion: escenario.conMovimiento ? 'no-preference' : 'reduce',
      });
      await context.addCookies([cookieDeTema(escenario.tema ?? 'b', escenario.tienda ? TIENDA : ADMIN)]);
      const page = await context.newPage();
      if (escenario.rol) await conSesion(page, tokens[escenario.rol]);
      await escenario.antes?.(page, { tokens });
      await page.goto((escenario.tienda ? TIENDA : ADMIN) + escenario.ruta);
      await asentar(page);
      try {
        await escenario.accion?.(page);
        await asentar(page);
      } catch (error) {
        console.log(`  ${nombre}-${viewport.width}: la acción falló (${error.message.split('\n')[0]})`);
      }
      await dejarLimpia(page);
      // La de página completa y, si el escenario pide `desplazamientos`, una de la ventana en cada posición (PBI-0252).
      for (const { archivo, posicion } of tomasDeEscenario(nombre, escenario, viewport.width)) {
        if (posicion !== null) await desplazar(page, posicion);
        await page.screenshot({ path: join(salida, archivo), fullPage: posicion === null });
        console.log(`${etapa}/${archivo}`);
      }
      await context.close();
    }
  }
} finally {
  await navegador.close();
  // Lo que el archivo de escenarios cambió en la copia de datos (por ejemplo, el tema activo) vuelve a como estaba.
  await alTerminar?.();
}
