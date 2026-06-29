import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  // Здесь работа с БД через Prisma/Sequelize/Knex
  const data = await prisma.incomControl.findMany()
  return data
})