// types/session.ts или server/types/session.ts
export interface SessionUser {
  sessionId?: string
  login: string
  email: string
  role: string
  dateTime: string
  loggedIn: boolean  // 👈 ДОБАВЛЯЕМ СВОЙСТВО
}

export interface UserSession {
  user: SessionUser
  redirectUrl?: string
}