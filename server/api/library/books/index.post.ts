import { libraryAdmin } from "../../../services/library/access";
import { saveBook } from "../../../services/library/service";
import { positiveId } from "../../../services/library/input";
export default defineEventHandler(async (event) => {
  const actor = await libraryAdmin(event);
  return saveBook(event, actor.userId, await readBody(event));
});
