import { libraryAdmin } from "../../../../services/library/access";
import { trashBook } from "../../../../services/library/service";
import { positiveId } from "../../../../services/library/input";
export default defineEventHandler(async (event) => {
  const actor = await libraryAdmin(event);
  const body = await readBody(event);
  return trashBook(
    event,
    actor.userId,
    positiveId(getRouterParam(event, "id")),
    positiveId(body?.version),
    true,
  );
});
