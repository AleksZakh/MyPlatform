export interface AppVersion {
  application: 'Space / MyPlatform';
  release: string | null;
  commit: string | null;
  installedAt: string | null;
  environment: 'development' | 'production';
}
