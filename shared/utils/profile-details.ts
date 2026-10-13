import { z } from 'zod';
const email = z.union([z.literal(''), z.string().trim().email().max(255)]);
export const profileDetailsSchema = z.object({
 nickname: z.string().trim().max(80), contactEmail: email, additionalEmail: email,
 phone: z.string().trim().max(50), postalAddress: z.string().trim().max(500), about: z.string().trim().max(1000),
}).strict();
export type ProfileDetails = z.infer<typeof profileDetailsSchema>;
export const emptyProfileDetails = (): ProfileDetails => ({ nickname: '', contactEmail: '', additionalEmail: '', phone: '', postalAddress: '', about: '' });
export interface PersonalProfileDto extends ProfileDetails {
 fullName: string | null; login: string | null; accountEmail: string | null;
 organization: string | null; position: string | null; avatarVersion: string | null;
}
