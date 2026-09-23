export function validateProductionSecrets(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV !== 'production') return;
  const secrets = [env.JWT_SECRET, env.JWT_REFRESH_SECRET];
  if (secrets.some(value => !value || value.length < 32 || /secret-dev|votre-jwt|votre-refresh/i.test(value))
      || secrets[0] === secrets[1]) {
    throw new Error('Production : fournir deux secrets JWT distincts et aléatoires de 32 caractères minimum.');
  }
}

export function frontendOrigin(env: NodeJS.ProcessEnv): string {
  if (env.NODE_ENV !== 'production') return env.FRONTEND_URL || '*';
  const origin = env.FRONTEND_URL || env.RENDER_EXTERNAL_URL;
  if (!origin || origin === '*') throw new Error('Production : FRONTEND_URL ou RENDER_EXTERNAL_URL HTTPS requis.');
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.origin !== origin) throw new Error('Production : origine HTTPS exacte requise, sans chemin ni slash final.');
  return origin;
}
