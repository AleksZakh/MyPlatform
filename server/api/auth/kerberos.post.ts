import { randomUUID } from 'node:crypto'
import { createError, defineEventHandler, getRequestHeader, setResponseHeader } from 'h3'
import { logger } from '../../utils/logger'
import { findDomainUser } from '../../services/ad-directory.service'
import { ensureDomainUser, assertDomainUserCanLogin } from '../../services/domain-user.service'

/** nginx validates SPNEGO. Nitro must only be reachable through the trusted proxy. */
export default defineEventHandler(async event => {
  const requestId = randomUUID()
  let stage = 'proxy'
  setResponseHeader(event, 'Cache-Control', 'no-store')
  setResponseHeader(event, 'X-Space-Auth-Request', requestId)
  const mark = (value: string) => { stage = value; setResponseHeader(event, 'X-Space-Auth-Stage', value) }
  mark(stage)
  try {
    // Compatibility with existing proxy configurations. All three headers must be overwritten/cleared by nginx.
    const remoteUser = getRequestHeader(event, 'x-remote-user') || getRequestHeader(event, 'remote-user') || getRequestHeader(event, 'x-forwarded-user')
    if (!remoteUser) throw createError({ statusCode: 401, statusMessage: 'KERBEROS_IDENTITY_MISSING' })
    mark('directory')
    const directoryUser = await findDomainUser(remoteUser, event)
    if (!directoryUser) throw createError({ statusCode: 403, statusMessage: 'KERBEROS_DIRECTORY_USER_NOT_FOUND' })
    mark('account')
    const appUser = await ensureDomainUser(directoryUser)
    assertDomainUserCanLogin(directoryUser, appUser)
    const user = {
      id: appUser.id, login: appUser.login || directoryUser.login,
      fullName: appUser.fullName || directoryUser.fullName, email: appUser.email ?? undefined,
      authType: 'DOMAIN' as const, authMethod: 'KERBEROS' as const,
      username: appUser.login || directoryUser.login,
      name: appUser.fullName || directoryUser.fullName || directoryUser.login,
      department: directoryUser.department ?? undefined,
      title: appUser.position ?? directoryUser.position ?? undefined,
    }
    mark('session')
    await setUserSession(event, { user, loggedInAt: new Date().toISOString() })
    event.context.user = user
    mark('complete')
    logger.info(`[kerberos] request=${requestId} stage=complete status=200 appUserId=${appUser.id}`)
    return { success: true, user, requestId }
  } catch (error: any) {
    const supplied = Number(error?.statusCode)
    const statusCode = [400, 401, 403, 503].includes(supplied) ? supplied : stage === 'directory' ? 503 : 500
    const code = `KERBEROS_${stage.toUpperCase()}_FAILED`
    // No tokens, cookies, password, LDAP bind credentials or raw exception in this diagnostic log.
    logger.warn(`[kerberos] request=${requestId} stage=${stage} status=${statusCode} code=${code}`)
    throw createError({ statusCode, statusMessage: code,
      data: { code, stage, requestId, message: 'Автоматический доменный вход не завершён.' } })
  }
})
