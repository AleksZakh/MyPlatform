export interface ChatPerson { id: number; login: string | null; fullName: string | null; authType: string; status: string; department?: string | null; hasEmail?: boolean; directoryObjectId?: string; directoryLogin?: string; invitationPending?: boolean }
export interface ChatMessageDto { revision?: number; editedAt?: string | null; deletedAt?: string | null; id: number; conversationId: number; senderId: number; clientId: string; body: string; createdAt: string; sender?: { fullName: string | null; login: string | null } }
export interface ChatDialog { id: number; kind?: string; archived?: boolean; myRole?: string; memberCount?: number; peer: ChatPerson; readThrough: number; peerReadThrough: number; unread: number; last: ChatMessageDto | null }
export interface ChatInbox { dialogs: ChatDialog[]; unread: number }
export interface ChatHistory { messages: ChatMessageDto[]; hasMore: boolean; peerReadThrough: number }

export interface ChatContacts { people: ChatPerson[]; hasMore: boolean; warning?: string | null }

export interface ChatGroup { id: number; name: string; archived: boolean; myRole: string; members: (ChatPerson & { role: string })[] }

export interface ChatChanges { messages: ChatMessageDto[]; cursor: number; hasMore: boolean }
