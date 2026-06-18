import { b as defineEventHandler, r as readBody, c as createError, s as setUserSession } from '../../../nitro/nitro.mjs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'stream';
import 'events';
import 'http';
import 'crypto';
import 'buffer';
import 'zlib';
import 'https';
import 'net';
import 'tls';
import 'url';
import 'node:events';
import 'node:buffer';
import 'ioredis';
import 'node:fs';
import 'node:path';
import 'activedirectory2';
import 'node:url';
import '@iconify/utils';
import 'consola';
import 'ipx';

const prisma = new PrismaClient();
const registerSchema = z.object({
  name: z.string().min(1, "\u0418\u043C\u044F \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E").max(50),
  login: z.string().min(3, "\u041B\u043E\u0433\u0438\u043D \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043C\u0438\u043D\u0438\u043C\u0443\u043C 3 \u0441\u0438\u043C\u0432\u043E\u043B\u0430").max(50),
  email: z.string().email("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 email"),
  password: z.string().min(6, "\u041F\u0430\u0440\u043E\u043B\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043C\u0438\u043D\u0438\u043C\u0443\u043C 6 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432"),
  sessionId: z.string().uuid("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 sessionId").optional()
});
const register_post = defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.format();
      const firstError = validationResult.error.issues[0];
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: (firstError == null ? void 0 : firstError.message) || "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438 \u0434\u0430\u043D\u043D\u044B\u0445",
        data: errors
      });
    }
    const { name, login, email, password, sessionId } = validationResult.data;
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { email },
          { login }
        ]
      }
    });
    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: "Conflict",
        message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441 \u0442\u0430\u043A\u0438\u043C email \u0438\u043B\u0438 \u043B\u043E\u0433\u0438\u043D\u043E\u043C \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442"
      });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = await prisma.users.create({
      data: {
        login,
        email,
        userName: name,
        password: hashedPassword,
        role: "user",
        // Значение по умолчанию для роли
        sessions: sessionId ? {
          create: {
            sessionId,
            timestamp: BigInt(Date.now())
          }
        } : void 0
      },
      include: {
        sessions: sessionId ? {
          select: {
            sessionId: true
          }
        } : false
      }
    });
    await setUserSession(event, {
      user: {
        id: newUser.id,
        name: newUser.userName,
        login: newUser.login,
        email: newUser.email
      },
      sessionId,
      registeredAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    console.log(`New user registered: ${login} (${email})`);
    return {
      success: true,
      statusCode: 201,
      message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D",
      data: newUser
    };
  } catch (error) {
    if (error.code === "P2002") {
      throw createError({
        statusCode: 409,
        statusMessage: "Conflict",
        message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441 \u0442\u0430\u043A\u0438\u043C\u0438 \u0434\u0430\u043D\u043D\u044B\u043C\u0438 \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442"
      });
    }
    if (error.statusCode) {
      throw error;
    }
    console.error("Registration error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F"
    });
  }
});

export { register_post as default };
//# sourceMappingURL=register.post.mjs.map
