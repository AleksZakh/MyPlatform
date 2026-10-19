import { libraryReader } from '../../../services/library/access';
import { settings } from '../../../services/library-video/core';
export default defineEventHandler(async event => { await libraryReader(event); return settings(); });
