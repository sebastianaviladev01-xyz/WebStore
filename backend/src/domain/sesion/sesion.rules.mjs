export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export const isSessionAlive = (session) => new Date(session.expiresAt).getTime() > Date.now();

export const findAliveSession = (sessions, tokenHash) =>
  sessions.find((item) => item.tokenHash === tokenHash && isSessionAlive(item));
