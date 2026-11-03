import type { AppVersion } from '../../shared/types/app-version';

/** Read only the running process metadata. Never inspect the mutable current symlink,
 * infer installation time from build time, or return the process environment. */
export function appVersion(env: NodeJS.ProcessEnv = process.env): AppVersion {
  const release = /^\d{8}T\d{6}Z-[a-f0-9]{12}$/.test(env.SPACE_RELEASE_ID || '') ? env.SPACE_RELEASE_ID! : null;
  const installed = env.SPACE_RELEASE_INSTALLED_AT || '';
  const validDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(installed) && Number.isFinite(Date.parse(installed));
  return {
    application: 'Space / MyPlatform', release, commit: release ? release.slice(-12) : null,
    installedAt: release && validDate ? new Date(installed).toISOString() : null,
    environment: env.NODE_ENV === 'production' ? 'production' : 'development',
  };
}
