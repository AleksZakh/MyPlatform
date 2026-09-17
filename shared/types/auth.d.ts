declare module '#auth-utils' {
  interface User {
    login: string;
    fullName?: string;
    email?: string;
  }
}

declare module '#auth-utils' {
  interface User {
    id?: number;

    login: string;

    email?: string | null;

    fullName?: string | null;

    authType?:
      | 'DOMAIN'
      | 'EXTERNAL';
  }
}

export {};