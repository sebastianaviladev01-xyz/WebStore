import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultFile = fileURLToPath(new URL('../data.json', import.meta.url));
const file = resolve(process.argv[2] ?? defaultFile);
const state = JSON.parse(readFileSync(file, 'utf8'));
state.accountSessions = [];
state.adminSessions = [];
writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
console.log('Sesiones locales de demostración eliminadas.');
