import { applyRuntimeEnvironment } from './runtime-env.mjs';
applyRuntimeEnvironment();
for (const name of ['NUXT_SESSION_PASSWORD', 'WS_AUTH_SECRET']) {
  if ((process.env[name] || '').length < 32) throw new Error(`${name} must contain at least 32 characters`);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
await import('../.output/server/index.mjs');
