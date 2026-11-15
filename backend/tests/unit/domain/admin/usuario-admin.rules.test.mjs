/**
 * Usuarios del Admin (lote 02, PBI-0102): `LAST_SUPERADMIN` (no queda ningún superadministrador activo) y
 * `SELF_LOCKOUT` (quien guarda se quedaría sin su cuenta o sin su rol) son errores distintos, con su orden, y el
 * alcance de quien gestiona solo llega a los roles que le tocan.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  requireUsersInScope,
  requireValidAdminUsers,
} from '../../../../src/domain/admin/usuario-admin.rules.mjs';

const usuario = (id, role, active = true) => ({ id, name: id, email: `${id}@example.com`, role, active });
const root = usuario('u-1', 'superadmin');
const otroRoot = usuario('u-2', 'superadmin');
const gerente = usuario('u-3', 'admin');
const ventas = usuario('u-4', 'vendedor');

const rechazo = (code, kind = 'conflict') => ({ code, kind });

test('una lista con quien guarda y un superadministrador activo es válida', () => {
  assert.doesNotThrow(() => requireValidAdminUsers([root, gerente, ventas], root));
  assert.doesNotThrow(() => requireValidAdminUsers([root, gerente, ventas], gerente));
});

test('lo que no es una lista responde INVALID_USERS', () => {
  for (const lista of [undefined, null, {}, 'u-1'])
    assert.throws(() => requireValidAdminUsers(lista, root), rechazo('INVALID_USERS', 'validation'));
});

test('un rol que no es de los tres fijos responde INVALID_ROLE, también el de un rol anterior', () => {
  for (const role of ['owner', 'catalog-maintainer', 'root', '', undefined])
    assert.throws(
      () => requireValidAdminUsers([root, { ...ventas, role }], root),
      rechazo('INVALID_ROLE', 'validation'),
      String(role),
    );
});

test('LAST_SUPERADMIN: sin ningún superadministrador activo, aunque quien guarda siga en la lista', () => {
  assert.throws(() => requireValidAdminUsers([], gerente), rechazo('LAST_SUPERADMIN'));
  assert.throws(
    () => requireValidAdminUsers([{ ...root, active: false }, gerente], gerente),
    rechazo('LAST_SUPERADMIN'),
  );
  assert.throws(() => requireValidAdminUsers([gerente, ventas], gerente), rechazo('LAST_SUPERADMIN'));
});

test('SELF_LOCKOUT: quien guarda no puede eliminar, desactivar ni cambiar el rol de su propia cuenta', () => {
  const lista = [root, otroRoot, gerente, ventas];
  // Eliminarse.
  assert.throws(
    () =>
      requireValidAdminUsers(
        lista.filter((item) => item.id !== gerente.id),
        gerente,
      ),
    rechazo('SELF_LOCKOUT'),
  );
  // Desactivarse.
  assert.throws(
    () =>
      requireValidAdminUsers(
        lista.map((item) => (item.id === ventas.id ? { ...item, active: false } : item)),
        ventas,
      ),
    rechazo('SELF_LOCKOUT'),
  );
  // Cambiarse el rol, también hacia arriba.
  assert.throws(
    () =>
      requireValidAdminUsers(
        lista.map((item) => (item.id === gerente.id ? { ...item, role: 'superadmin' } : item)),
        gerente,
      ),
    rechazo('SELF_LOCKOUT'),
  );
});

test('un superadministrador que se quita a sí mismo con otro activo recibe SELF_LOCKOUT, no LAST_SUPERADMIN', () => {
  // Con otro superadministrador activo la única falta es la propia: SELF_LOCKOUT, no LAST_SUPERADMIN.
  assert.throws(
    () => requireValidAdminUsers([{ ...root, active: false }, otroRoot], root),
    rechazo('SELF_LOCKOUT'),
  );
  assert.throws(() => requireValidAdminUsers([otroRoot, gerente], root), rechazo('SELF_LOCKOUT'));
});

test('cuando faltan las dos cosas, LAST_SUPERADMIN va primero', () => {
  // El único superadministrador se desactiva a sí mismo: no queda ninguno y además se bloquea.
  assert.throws(
    () => requireValidAdminUsers([{ ...root, active: false }, gerente], root),
    rechazo('LAST_SUPERADMIN'),
  );
  assert.throws(() => requireValidAdminUsers([gerente], root), rechazo('LAST_SUPERADMIN'));
});

test('desactivar a otro superadministrador es válido mientras quede uno activo', () => {
  assert.doesNotThrow(() => requireValidAdminUsers([root, { ...otroRoot, active: false }], root));
});

const alcance = (previo, siguiente, rol) => () => requireUsersInScope(previo, siguiente, rol);
const fuera = { code: 'USER_SCOPE_VIOLATION', kind: 'forbidden' };

test('el superadministrador gestiona cualquier rol, también eliminar', () => {
  const previo = [root, gerente, ventas];
  assert.doesNotThrow(alcance(previo, [root, { ...gerente, role: 'vendedor' }, ventas], 'superadmin'));
  assert.doesNotThrow(alcance(previo, [root, gerente], 'superadmin'));
  assert.doesNotThrow(alcance(previo, [...previo, usuario('u-5', 'admin')], 'superadmin'));
});

test('el administrador crea, edita y desactiva vendedores', () => {
  const previo = [root, gerente, ventas];
  assert.doesNotThrow(alcance(previo, [...previo, usuario('u-5', 'vendedor')], 'admin'));
  assert.doesNotThrow(alcance(previo, [root, gerente, { ...ventas, name: 'Otro', active: false }], 'admin'));
});

test('el administrador no elimina a nadie, ni siquiera a un vendedor', () => {
  assert.throws(alcance([root, gerente, ventas], [root, gerente], 'admin'), fuera);
});

test('el administrador no cambia ni crea administradores o superadministradores, ni asciende a un vendedor', () => {
  const previo = [root, gerente, ventas];
  assert.throws(alcance(previo, [{ ...root, active: false }, gerente, ventas], 'admin'), fuera);
  assert.throws(alcance(previo, [root, { ...gerente, name: 'Otro nombre' }, ventas], 'admin'), fuera);
  assert.throws(alcance(previo, [...previo, usuario('u-5', 'admin')], 'admin'), fuera);
  assert.throws(alcance(previo, [root, gerente, { ...ventas, role: 'admin' }], 'admin'), fuera);
});

test('un cambio en otro campo del administrador (la contraseña temporal) no cuenta como cambio de su ficha', () => {
  const previo = [root, gerente, ventas];
  assert.doesNotThrow(alcance(previo, [root, { ...gerente, temporaryPassword: 'x' }, ventas], 'admin'));
});

test('un rol sin users.manage no tiene alcance sobre nadie', () => {
  const previo = [root, gerente, ventas];
  assert.throws(alcance(previo, [...previo, usuario('u-5', 'vendedor')], 'vendedor'), fuera);
});
