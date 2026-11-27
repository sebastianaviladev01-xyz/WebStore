// Comprueba la configuración de agentes de IA del repositorio (ADR-0008).
//
// Solo comprobaciones estructurales, sin heurísticas sobre el estilo de la documentación:
// - El catálogo .agents/execution-catalog.json es un JSON válido. Cada herramienta resuelve todos los
//   niveles y roles con modelos conocidos y tiene todos los esfuerzos; un respaldo no repite el modelo;
//   un modelo limitado a un rol (onlyFor) no aparece fuera de ese rol; los esfuerzos de cada nivel están
//   disponibles; si la herramienta usa alias, cada modelo tiene el suyo; el escalado, si lo hay, usa un
//   modelo conocido con un esfuerzo disponible (ADR-0036); y su adaptador existe. Un
//   modelo validado tiene modelId y ningún modelo excluido está en models.
// - Los niveles que nombran los skills, los adaptadores y la guía de ejecución existen en el catálogo:
//   las listas «nivel (`ligero`, …)» y los pares «`nivel · esfuerzo`».
// - Cada skill de .agents/skills/ usa solo claves del estándar Agent Skills y su name coincide con la
//   carpeta. Tiene un puntero en .claude/skills/ con el mismo name y description, que remite a él, y no
//   hay punteros sin skill.
// - Cada CLAUDE.md de la raíz y de sus carpetas inmediatas importa @AGENTS.md, que existe a su lado.
//   El de la raíz importa además el adaptador de Claude Code.
// - AGENTS.md enlaza cada adaptador de .agents/adapters/ (aviso, no error).
//
// Uso, desde la raíz del repositorio: node tools/check-agents.mjs
// Escribe una línea por error o aviso y un resumen, y termina con 1 si hay algún error.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const STANDARD_KEYS = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
]);
const EXECUTION_GUIDE = 'docs/development/agent-execution.md';

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

const abs = (path) => join(root, path);
const rel = (path) => relative(root, path).replaceAll('\\', '/');
const isDir = (path) => existsSync(path) && statSync(path).isDirectory();
const read = (path) => readFileSync(path, 'utf8').replace(/^﻿/, '');
const subdirs = (path) =>
  isDir(path)
    ? readdirSync(path, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];

/** Claves de primer nivel del frontmatter YAML de un SKILL.md, con su valor si cabe en la línea. */
function frontmatter(path) {
  const lines = read(path).split(/\r?\n/);
  const values = new Map();
  if (lines[0] !== '---') return values;
  for (let i = 1; i < lines.length && lines[i] !== '---'; i++) {
    const match = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (match) values.set(match[1], match[2].trim().replace(/^["']|["']$/g, ''));
  }
  return values;
}

// --- Catálogo ------------------------------------------------------------------------------------

const catalogPath = abs('.agents/execution-catalog.json');
let catalog = null;
if (!existsSync(catalogPath)) {
  fail('falta .agents/execution-catalog.json');
} else {
  try {
    catalog = JSON.parse(read(catalogPath));
  } catch (error) {
    fail(`.agents/execution-catalog.json no es un JSON válido: ${error.message}`);
  }
}

const models = catalog?.models ?? {};
const efforts = catalog?.efforts ?? [];
const levels = catalog?.levels ?? {};
const roles = catalog?.roles ?? {};
const harnesses = catalog?.harnesses ?? {};

if (catalog) {
  for (const [key, model] of Object.entries(models)) {
    if (!['provisional', 'validated'].includes(model.status)) {
      fail(`modelo ${key}: estado desconocido ${model.status}`);
    }
    if (model.status === 'validated' && !model.modelId) fail(`modelo ${key}: validado sin modelId`);
  }
  for (const excluded of catalog.excludedModels ?? []) {
    if (Object.values(models).some((model) => model.name === excluded?.name)) {
      fail(`modelo excluido en models: ${excluded.name}`);
    }
  }
  for (const [level, definition] of Object.entries(levels)) {
    for (const effort of definition.efforts ?? []) {
      if (!efforts.includes(effort)) fail(`nivel ${level}: esfuerzo desconocido ${effort}`);
    }
  }

  for (const [name, harness] of Object.entries(harnesses)) {
    const harnessEfforts = harness.efforts ?? {};
    const used = new Set();

    if (!harness.adapter || !existsSync(abs(harness.adapter))) {
      fail(`${name}: no existe el adaptador ${harness.adapter}`);
    }
    for (const effort of efforts) {
      if (!(effort in harnessEfforts)) fail(`${name}: falta el esfuerzo ${effort}`);
    }

    // Un nivel o un rol: modelo y respaldos conocidos, sin repetir el modelo y sin modelos limitados a otro rol.
    const checkRoute = (where, route, role) => {
      if (!route?.model) fail(`${where}: falta el modelo`);
      for (const model of [route?.model, ...(route?.fallbacks ?? [])].filter(Boolean)) {
        if (!(model in models)) {
          fail(`${where}: modelo desconocido ${model}`);
          continue;
        }
        used.add(model);
        const onlyFor = models[model].onlyFor ?? [];
        if (onlyFor.length > 0 && !onlyFor.includes(role)) {
          fail(`${where}: ${model} solo sirve para ${onlyFor.join(', ')}`);
        }
      }
      if ((route?.fallbacks ?? []).includes(route?.model)) {
        fail(`${where}: el respaldo ${route.model} repite el modelo`);
      }
    };

    const harnessLevels = harness.levels ?? {};
    for (const level of Object.keys(harnessLevels)) {
      if (!(level in levels)) fail(`${name}: nivel desconocido ${level}`);
    }
    for (const [level, definition] of Object.entries(levels)) {
      if (!(level in harnessLevels)) {
        fail(`${name}: falta el nivel ${level}`);
        continue;
      }
      checkRoute(`${name}/${level}`, harnessLevels[level], null);
      for (const effort of definition.efforts ?? []) {
        if (effort in harnessEfforts && harnessEfforts[effort] === null) {
          fail(`${name}/${level}: el esfuerzo ${effort} no está disponible`);
        }
      }
    }

    const harnessRoles = harness.roles ?? {};
    for (const role of Object.keys(roles)) {
      if (!(role in harnessRoles)) {
        fail(`${name}: falta el rol ${role}`);
        continue;
      }
      const route = harnessRoles[role];
      checkRoute(`${name}/${role}`, route, role);
      if (!efforts.includes(route.effort)) {
        fail(`${name}/${role}: esfuerzo desconocido ${route.effort}`);
      } else if (harnessEfforts[route.effort] === null) {
        fail(`${name}/${role}: el esfuerzo ${route.effort} no está disponible`);
      }
    }

    // Escalado (ADR-0036): un modelo conocido, un esfuerzo disponible y, si la herramienta usa alias, el suyo.
    if (harness.escalation) {
      const { model, effort } = harness.escalation;
      if (!(model in models)) fail(`${name}/escalation: modelo desconocido ${model}`);
      if (!efforts.includes(effort)) fail(`${name}/escalation: esfuerzo desconocido ${effort}`);
      else if (harnessEfforts[effort] === null)
        fail(`${name}/escalation: el esfuerzo ${effort} no está disponible`);
      if (harness.agentAliases && !(model in harness.agentAliases))
        fail(`${name}: falta el alias de ${model}`);
    }

    if (harness.agentAliases) {
      for (const model of [...used].sort()) {
        if (!(model in harness.agentAliases)) fail(`${name}: falta el alias de ${model}`);
      }
    }
  }
}

// --- Skills y punteros ---------------------------------------------------------------------------

const skillsDir = abs('.agents/skills');
const pointersDir = abs('.claude/skills');
const skills = subdirs(skillsDir);
if (skills.length === 0) fail('no hay skills en .agents/skills/');

for (const name of skills) {
  const canonicalPath = join(skillsDir, name, 'SKILL.md');
  if (!existsSync(canonicalPath)) {
    fail(`skill ${name}: falta SKILL.md`);
    continue;
  }
  const canonical = frontmatter(canonicalPath);
  if (canonical.get('name') !== name) {
    fail(`skill ${name}: name es '${canonical.get('name') ?? ''}', no '${name}'`);
  }
  if (!canonical.get('description')) fail(`skill ${name}: falta description`);
  for (const key of canonical.keys()) {
    if (!STANDARD_KEYS.has(key)) fail(`skill ${name}: clave fuera del estándar ${key}`);
  }

  const pointerPath = join(pointersDir, name, 'SKILL.md');
  if (!existsSync(pointerPath)) {
    fail(`skill ${name}: falta el puntero .claude/skills/${name}/SKILL.md`);
    continue;
  }
  const pointer = frontmatter(pointerPath);
  if (pointer.get('name') !== canonical.get('name')) fail(`skill ${name}: el puntero tiene otro name`);
  if (pointer.get('description') !== canonical.get('description')) {
    fail(`skill ${name}: el puntero tiene otra description`);
  }
  if (!read(pointerPath).includes(`.agents/skills/${name}/SKILL.md`)) {
    fail(`skill ${name}: el puntero no remite a .agents/skills/${name}/SKILL.md`);
  }
}
for (const name of subdirs(pointersDir)) {
  if (!skills.includes(name)) fail(`puntero ${name} sin skill canónico en .agents/skills/`);
}

// --- Niveles nombrados en los skills, los adaptadores y la guía -----------------------------------

const markdownUnder = (dir) =>
  isDir(dir)
    ? readdirSync(dir, { recursive: true })
        .map((file) => join(dir, String(file)))
        .filter((file) => file.endsWith('.md'))
        .sort()
    : [];
const levelSources = [...markdownUnder(abs('.agents')), abs(EXECUTION_GUIDE)].filter((file) =>
  existsSync(file),
);
let levelReferences = 0;

if (catalog) {
  for (const file of levelSources) {
    const text = read(file);
    // «nivel (`ligero`, `estándar` o `avanzado`)» o «nivel `ligero`, …»
    for (const list of text.matchAll(/\bnivel(?:es)?\s*\(?((?:`[^`\n]+`(?:\s*,\s*|\s+[oy]\s+)?)+)/g)) {
      for (const [, level] of list[1].matchAll(/`([^`\n]+)`/g)) {
        levelReferences++;
        if (!(level in levels)) fail(`${rel(file)}: nivel desconocido ${level}`);
      }
    }
    // «`estándar · medio`»
    for (const [, level, effort] of text.matchAll(/`([^`·\n]+?) · ([^`\n]+?)`/g)) {
      levelReferences++;
      if (!(level in levels)) {
        fail(`${rel(file)}: nivel desconocido ${level}`);
      } else if (!(levels[level].efforts ?? []).includes(effort)) {
        fail(`${rel(file)}: el nivel ${level} no admite el esfuerzo ${effort}`);
      }
    }
  }
}

// --- CLAUDE.md y AGENTS.md -----------------------------------------------------------------------

const claudeFiles = [abs('CLAUDE.md'), ...subdirs(root).map((dir) => join(root, dir, 'CLAUDE.md'))].filter(
  (file) => existsSync(file),
);
if (!existsSync(abs('CLAUDE.md'))) fail('falta CLAUDE.md en la raíz');
const claudeAdapter = harnesses['claude-code']?.adapter;

for (const file of claudeFiles) {
  const name = rel(file);
  const imports = read(file)
    .split(/\r?\n/)
    .map((line) => line.trim());
  if (!imports.includes('@AGENTS.md')) fail(`${name}: falta @AGENTS.md`);
  const sibling = join(dirname(file), 'AGENTS.md');
  if (!existsSync(sibling)) fail(`${name}: falta ${rel(sibling)}`);
  if (name === 'CLAUDE.md' && claudeAdapter && !imports.includes(`@${claudeAdapter}`)) {
    fail(`CLAUDE.md: falta @${claudeAdapter}`);
  }
}

const agentsPath = abs('AGENTS.md');
const adaptersDir = abs('.agents/adapters');
if (!existsSync(agentsPath)) {
  fail('falta AGENTS.md');
} else if (isDir(adaptersDir)) {
  const agents = read(agentsPath);
  for (const adapter of readdirSync(adaptersDir).filter((file) => file.endsWith('.md'))) {
    if (!agents.includes(`.agents/adapters/${adapter}`)) {
      fail(`AGENTS.md no enlaza .agents/adapters/${adapter}`);
    }
  }
}

// --- Resultado -----------------------------------------------------------------------------------

for (const message of warnings) console.log(`agents: aviso: ${message}`);
for (const message of errors) console.log(`agents: ${message}`);
if (errors.length > 0) {
  console.log(`agents: ${errors.length} errores`);
  process.exit(1);
}
console.log(
  `agents: catálogo ${catalog.catalogVersion}, ${Object.keys(harnesses).length} herramientas, ` +
    `${skills.length} skills, ${levelReferences} referencias a niveles y ${claudeFiles.length} CLAUDE.md revisados` +
    (warnings.length > 0 ? `, ${warnings.length} avisos` : ''),
);
