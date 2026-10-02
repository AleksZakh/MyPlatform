import { defineEventHandler, readBody, setResponseHeader } from 'h3';
import { requestPasswordReset } from '~~/server/services/password-reset.service';
export default defineEventHandler(async event => {
  setResponseHeader(event, 'Cache-Control', 'no-store');
  const body: unknown = await readBody(event);
  const email = body && typeof body === 'object' ? (body as Record<string, unknown>).email : undefined;
  return requestPasswordReset(event, email);
});
