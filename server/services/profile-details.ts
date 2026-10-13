import { createError, getHeader, setHeader, type H3Event } from 'h3';
import { getAccessActor } from './access-control.service';
import { prisma } from '../utils/prisma';
import type { Prisma } from '@prisma/client';
import { emptyProfileDetails } from '../../shared/utils/profile-details';
export async function profileActor(event: H3Event, write = false) {
 setHeader(event, 'Cache-Control', 'private, no-store');
 if (event.context.externalSessionRevoked) throw createError({ statusCode: 401 });
 if (write && getHeader(event, 'x-space-profile') !== '1') throw createError({ statusCode: 403 });
 return (await getAccessActor(event)).user;
}
export async function readPersonalProfile(userId: number) {
 const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: {
  fullName: true, login: true, email: true, organization: true, position: true,
  profile: { select: { nickname: true, contactEmail: true, additionalEmail: true, phone: true, postalAddress: true, about: true, avatarVersion: true } },
 } });
 return { ...emptyProfileDetails(), ...user.profile, avatarVersion: user.profile?.avatarVersion ?? null,
  fullName: user.fullName, login: user.login, accountEmail: user.email, organization: user.organization, position: user.position };
}
export async function updatePersonalProfile(userId: number, data: Prisma.UserProfileUpdateInput) {
 return prisma.$transaction(async tx => {
  await tx.$queryRaw`SELECT id FROM app_users WHERE id = ${userId} FOR UPDATE`;
  const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (user?.status !== 'ACTIVE') throw createError({ statusCode: 403 });
  await tx.userProfile.upsert({ where: { userId }, create: { userId }, update: {} });
  await tx.userProfile.update({ where: { userId }, data });
 });
}
