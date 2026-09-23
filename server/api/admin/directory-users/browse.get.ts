import { defineEventHandler } from 'h3'
import { adCache } from '../../../utils/adCache'
import { listStructureMembers } from '../../../services/directory-provision.service'
export default defineEventHandler(async event => listStructureMembers(event, await adCache.get(), '', true))
