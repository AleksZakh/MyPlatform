// types/nuxt.d.ts
import 'nuxt/schema';

declare module 'nuxt/schema' {
  interface NuxtConfig {
    fileStorage?: {
      mount?: string;
    };
  }
}
