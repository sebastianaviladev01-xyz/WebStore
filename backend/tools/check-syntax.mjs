/** Valida la sintaxis de cada .mjs de src/, tests/ y tools/ con `node --check`; se detiene en el primer error. */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function* moduleFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* moduleFiles(path);
    else if (entry.name.endsWith('.mjs')) yield path;
  }
}

let checked = 0;
for (const folder of ['src', 'tests', 'tools']) {
  for (const file of moduleFiles(join(root, folder))) {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    } catch {
      console.error(`Error de sintaxis en ${file}`);
      process.exit(1);
    }
    checked += 1;
  }
}
console.log(`Sintaxis correcta en ${checked} archivos.`);
