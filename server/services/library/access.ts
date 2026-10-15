import { createError, getHeader, setHeader, type H3Event } from "h3";
import { getAccessActor, requirePermission } from "../access-control.service";
export async function libraryReader(event: H3Event) {
  setHeader(event, "Cache-Control", "private, no-store");
  if (event.context.externalSessionRevoked)
    throw createError({ statusCode: 401 });
  return (await getAccessActor(event)).user;
}
export async function libraryAdmin(event: H3Event, write = true) {
  await libraryReader(event);
  if (write && getHeader(event, "x-space-library") !== "1")
    throw createError({ statusCode: 403 });
  return requirePermission(event, "library.manage", "UPDATE", {
    auditDenial: write,
  });
}
