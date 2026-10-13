import { randomUUID } from 'node:crypto';
import { profileActor, updatePersonalProfile } from '../../services/profile-details';
import { normalizeAvatar, AVATAR_UPLOAD_LIMIT } from '../../utils/profile-avatar';
export default defineEventHandler(async event => {
 const actor = await profileActor(event, true);
 const declared = Number(getHeader(event, 'content-length'));
 if (declared > AVATAR_UPLOAD_LIMIT) throw createError({ statusCode: 413, message: 'Размер фото должен быть не больше 5 МБ.' });
 // Bound the stream as well: Content-Length is optional and cannot be trusted.
 let size = 0; const chunks: Buffer[] = [];
 for await (const chunk of event.node.req) {
  const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  size += buffer.length;
  if (size > AVATAR_UPLOAD_LIMIT) throw createError({ statusCode: 413, message: 'Размер фото должен быть не больше 5 МБ.' });
  chunks.push(buffer);
 }
 const avatar = await normalizeAvatar(Buffer.concat(chunks));
 const avatarVersion = randomUUID();
 await updatePersonalProfile(actor.id, { avatar: new Uint8Array(avatar), avatarVersion });
 return { avatarVersion };
});
