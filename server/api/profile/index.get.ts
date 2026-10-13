import { profileActor, readPersonalProfile } from '../../services/profile-details';
export default defineEventHandler(async event => readPersonalProfile((await profileActor(event)).id));
