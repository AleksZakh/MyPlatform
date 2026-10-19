import { tus } from '../../../services/library-video/upload';
import { settings } from '../../../services/library-video/core';
import { libraryAdmin } from '../../../services/library/access';
export default defineEventHandler(async event => {
  await libraryAdmin(event, false); tus(event, false);
  setHeader(event, 'Tus-Extension', 'creation'); setHeader(event, 'Tus-Max-Size', String((await settings()).maxBytes));
  setResponseStatus(event, 204); return null;
});
