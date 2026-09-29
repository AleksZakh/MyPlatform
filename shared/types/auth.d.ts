declare module '#auth-utils' {
  interface User {
    id?: number;
    login: string;
    email?: string | null;
    fullName?: string | null;
    name?: string | null;
    authType?: 'DOMAIN' | 'EXTERNAL';
  }
  interface UserSession {
    sessionId?: string;
    registeredAt?: string;
  }
}
export {};
