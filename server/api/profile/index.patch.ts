import { profileActor, readPersonalProfile, updatePersonalProfile } from '../../services/profile-details';
import { profileDetailsSchema } from '../../../shared/utils/profile-details';
export default defineEventHandler(async event => {
 const actor = await profileActor(event, true);
 const result = profileDetailsSchema.safeParse(await readBody(event));
 if (!result.success) throw createError({ statusCode: 400, message: 'Проверьте адреса электронной почты и длину полей.' });
 await updatePersonalProfile(actor.id, result.data);
 return readPersonalProfile(actor.id);
});
