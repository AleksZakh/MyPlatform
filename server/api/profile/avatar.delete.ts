import { profileActor, updatePersonalProfile } from '../../services/profile-details';
export default defineEventHandler(async event => {
 const actor = await profileActor(event, true);
 await updatePersonalProfile(actor.id, { avatar: null, avatarVersion: null });
 return { avatarVersion: null };
});
