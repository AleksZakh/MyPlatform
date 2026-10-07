// Translate the existing server environment to Nuxt runtime overrides before importing Nitro.
export function applyRuntimeEnvironment(env = process.env) {
  const aliases = {
    NUXT_AD_URL: 'AD_URL', NUXT_AD_BASE_DN: 'AD_DOMAIN_USERS',
    NUXT_AD_USERNAME: 'AD_USERNAME', NUXT_AD_PASSWORD: 'AD_PASSWORD',
    NUXT_AD_TIMEOUT: 'AD_TIMEOUT', NUXT_PUBLIC_FILE_STORAGE_MOUNT: 'FILE_STORAGE_PATH',
  };
  for (const [target, source] of Object.entries(aliases)) {
    if (env[target] === undefined && env[source] !== undefined) env[target] = env[source];
  }
}
