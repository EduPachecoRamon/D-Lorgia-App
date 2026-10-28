const sessions = new Map();

export function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { mode: 'menu', lastTopic: null, updatedAt: Date.now() });
  }
  const session = sessions.get(userId);
  session.updatedAt = Date.now();
  return session;
}

export function resetSession(userId) {
  sessions.set(userId, { mode: 'menu', lastTopic: null, updatedAt: Date.now() });
}

export function cleanupSessions(maxAgeMs = 1000 * 60 * 60 * 12) {
  const cutoff = Date.now() - maxAgeMs;
  for (const [id, session] of sessions.entries()) {
    if (session.updatedAt < cutoff) sessions.delete(id);
  }
}
