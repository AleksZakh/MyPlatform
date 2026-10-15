import { libraryAdmin } from "../../../services/library/access";
import { uploadAsset } from "../../../services/library/files";
export default defineEventHandler(async (event) => {
  const actor = await libraryAdmin(event);
  const a = await uploadAsset(
    event,
    actor.userId,
    String(getQuery(event).kind),
  );
  return { id: a.id, filename: a.filename };
});
