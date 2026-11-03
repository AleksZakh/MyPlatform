export interface AppVersion {
  application: 'Space';
  release: string | null;
  commit: string | null;
  installedAt: string | null;
  environment: 'development' | 'production';
}
