import { libraryAdmin } from "../../../services/library/access";
import { removeCategory } from "../../../services/library/service";
import { positiveId } from "../../../services/library/input";
export default defineEventHandler(async (event) => {
  const actor = await libraryAdmin(event);
  const body = await readBody(event);
  return removeCategory(
    event,
    actor.userId,
    positiveId(getRouterParam(event, "id")),
    body?.targetId ? positiveId(body.targetId) : undefined,
  );
});
