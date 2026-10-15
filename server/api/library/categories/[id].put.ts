import { libraryAdmin } from "../../../services/library/access";
import { saveCategory } from "../../../services/library/service";
import { positiveId } from "../../../services/library/input";
export default defineEventHandler(async (event) => {
  const actor = await libraryAdmin(event);
  return saveCategory(
    event,
    actor.userId,
    await readBody(event),
    positiveId(getRouterParam(event, "id")),
  );
});
