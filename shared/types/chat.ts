export interface ChatPerson { id: number; login: string | null; fullName: string | null; authType: string; status: string; department?: string | null; hasEmail?: boolean; invitationPending?: boolean }
export interface ChatMessageDto { id: number; conversationId: number; senderId: number; clientId: string; body: string; createdAt: string }
export interface ChatDialog { id: number; peer: ChatPerson; readThrough: number; peerReadThrough: number; unread: number; last: ChatMessageDto | null }
export interface ChatInbox { dialogs: ChatDialog[]; unread: number }
export interface ChatHistory { messages: ChatMessageDto[]; hasMore: boolean; peerReadThrough: number }

export interface ChatContacts { people: ChatPerson[]; hasMore: boolean }
