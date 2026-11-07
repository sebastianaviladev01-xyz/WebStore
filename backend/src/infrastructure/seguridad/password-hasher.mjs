import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(String(password), salt, 64).toString('hex') };
}

export function passwordMatches(password, credential) {
  if (!credential?.salt || !credential?.hash) return false;
  const actual = scryptSync(String(password), credential.salt, 64);
  const expected = Buffer.from(credential.hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
