import { defineEventHandler, readBody, setResponseHeader } from 'h3';
import { completePasswordReset } from '~~/server/services/password-reset.service';
export default defineEventHandler(async event => {
  setResponseHeader(event, 'Cache-Control', 'no-store');
  return completePasswordReset(event, await readBody<unknown>(event));
});
