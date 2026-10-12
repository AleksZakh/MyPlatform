export const INVITATION_LIFETIME = 7 * 24 * 60 * 60 * 1000;
export const INVITATION_COOLDOWN = 24 * 60 * 60 * 1000;
export function invitationIsUsable(invitation: { sentAt: Date | null; consumedAt: Date | null; expiresAt: Date; directoryObjectId: string; recipientVersion: Date } | null,
 user: { authType: string; status: string; directoryObjectId: string | null; updatedAt: Date }, directory: { directoryObjectId: string | null; accountDisabled: boolean }, now = new Date()) {
 return !!invitation && user.authType === 'DOMAIN' && user.status === 'PENDING_ACTIVATION'
   && !directory.accountDisabled && !!directory.directoryObjectId && !!invitation.sentAt && !invitation.consumedAt
   && invitation.expiresAt > now && invitation.recipientVersion.getTime() === user.updatedAt.getTime()
   && invitation.directoryObjectId.toLowerCase() === directory.directoryObjectId.toLowerCase()
   && user.directoryObjectId?.toLowerCase() === directory.directoryObjectId.toLowerCase();
}
