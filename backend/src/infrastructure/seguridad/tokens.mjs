import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';

/** Hash con el que se guardan tokens y códigos: el valor original solo lo conoce el cliente. */
export const digest = (value) => createHash('sha256').update(String(value)).digest('hex');

/** Código temporal de 6 dígitos (verificación de cuenta y recuperación de contraseña). */
export const createCode = () => String(randomInt(100000, 1000000));

export const createToken = () => randomBytes(32).toString('base64url');

export const newId = () => randomUUID();
