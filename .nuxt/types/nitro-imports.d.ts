declare global {
  const H3Error: typeof import('../../node_modules/h3/dist/index').H3Error
  const H3Event: typeof import('../../node_modules/h3/dist/index').H3Event
  const __buildAssetsURL: typeof import('../../node_modules/@nuxt/nitro-server/dist/runtime/utils/paths').buildAssetsURL
  const __publicAssetsURL: typeof import('../../node_modules/@nuxt/nitro-server/dist/runtime/utils/paths').publicAssetsURL
  const adCache: typeof import('../../server/utils/adCache').adCache
  const appendCorsHeaders: typeof import('../../node_modules/h3/dist/index').appendCorsHeaders
  const appendCorsPreflightHeaders: typeof import('../../node_modules/h3/dist/index').appendCorsPreflightHeaders
  const appendHeader: typeof import('../../node_modules/h3/dist/index').appendHeader
  const appendHeaders: typeof import('../../node_modules/h3/dist/index').appendHeaders
  const appendResponseHeader: typeof import('../../node_modules/h3/dist/index').appendResponseHeader
  const appendResponseHeaders: typeof import('../../node_modules/h3/dist/index').appendResponseHeaders
  const assertMethod: typeof import('../../node_modules/h3/dist/index').assertMethod
  const cachedEventHandler: typeof import('../../node_modules/nitropack/dist/runtime/internal/cache').cachedEventHandler
  const cachedFunction: typeof import('../../node_modules/nitropack/dist/runtime/internal/cache').cachedFunction
  const callNodeListener: typeof import('../../node_modules/h3/dist/index').callNodeListener
  const cleanOldFilesFromDisk: typeof import('../../server/utils/fileUploadHandler').cleanOldFilesFromDisk
  const clearResponseHeaders: typeof import('../../node_modules/h3/dist/index').clearResponseHeaders
  const clearSession: typeof import('../../node_modules/h3/dist/index').clearSession
  const clearUserSession: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session').clearUserSession
  const computeChangedFields: typeof import('../../server/utils/auditLog').computeChangedFields
  const containsPathTraversal: typeof import('../../node_modules/nuxt-file-storage/dist/runtime/server/utils/path-safety').containsPathTraversal
  const createApp: typeof import('../../node_modules/h3/dist/index').createApp
  const createAppEventHandler: typeof import('../../node_modules/h3/dist/index').createAppEventHandler
  const createError: typeof import('../../node_modules/h3/dist/index').createError
  const createEvent: typeof import('../../node_modules/h3/dist/index').createEvent
  const createEventStream: typeof import('../../node_modules/h3/dist/index').createEventStream
  const createRouter: typeof import('../../node_modules/h3/dist/index').createRouter
  const defaultContentType: typeof import('../../node_modules/h3/dist/index').defaultContentType
  const defineAppConfig: typeof import('../../node_modules/@nuxt/nitro-server/dist/runtime/utils/config').defineAppConfig
  const defineCachedEventHandler: typeof import('../../node_modules/nitropack/dist/runtime/internal/cache').defineCachedEventHandler
  const defineCachedFunction: typeof import('../../node_modules/nitropack/dist/runtime/internal/cache').defineCachedFunction
  const defineEventHandler: typeof import('../../node_modules/h3/dist/index').defineEventHandler
  const defineLazyEventHandler: typeof import('../../node_modules/h3/dist/index').defineLazyEventHandler
  const defineNitroErrorHandler: typeof import('../../node_modules/nitropack/dist/runtime/internal/error/utils').defineNitroErrorHandler
  const defineNitroPlugin: typeof import('../../node_modules/nitropack/dist/runtime/internal/plugin').defineNitroPlugin
  const defineNodeListener: typeof import('../../node_modules/h3/dist/index').defineNodeListener
  const defineNodeMiddleware: typeof import('../../node_modules/h3/dist/index').defineNodeMiddleware
  const defineOAuthAppleEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/apple').defineOAuthAppleEventHandler
  const defineOAuthAtlassianEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/atlassian').defineOAuthAtlassianEventHandler
  const defineOAuthAuth0EventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/auth0').defineOAuthAuth0EventHandler
  const defineOAuthAuthentikEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/authentik').defineOAuthAuthentikEventHandler
  const defineOAuthAzureB2CEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/azureb2c').defineOAuthAzureB2CEventHandler
  const defineOAuthBattledotnetEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/battledotnet').defineOAuthBattledotnetEventHandler
  const defineOAuthBoxEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/box').defineOAuthBoxEventHandler
  const defineOAuthCognitoEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/cognito').defineOAuthCognitoEventHandler
  const defineOAuthDiscordEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/discord').defineOAuthDiscordEventHandler
  const defineOAuthDropboxEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/dropbox').defineOAuthDropboxEventHandler
  const defineOAuthFacebookEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/facebook').defineOAuthFacebookEventHandler
  const defineOAuthGitHubEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/github').defineOAuthGitHubEventHandler
  const defineOAuthGitLabEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitlab').defineOAuthGitLabEventHandler
  const defineOAuthGiteaEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitea').defineOAuthGiteaEventHandler
  const defineOAuthGoogleEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/google').defineOAuthGoogleEventHandler
  const defineOAuthHerokuEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/heroku').defineOAuthHerokuEventHandler
  const defineOAuthHubspotEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/hubspot').defineOAuthHubspotEventHandler
  const defineOAuthInstagramEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/instagram').defineOAuthInstagramEventHandler
  const defineOAuthKeycloakEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/keycloak').defineOAuthKeycloakEventHandler
  const defineOAuthKickEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/kick').defineOAuthKickEventHandler
  const defineOAuthLineEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/line').defineOAuthLineEventHandler
  const defineOAuthLinearEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linear').defineOAuthLinearEventHandler
  const defineOAuthLinkedInEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linkedin').defineOAuthLinkedInEventHandler
  const defineOAuthLiveChatEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/livechat').defineOAuthLiveChatEventHandler
  const defineOAuthMicrosoftEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/microsoft').defineOAuthMicrosoftEventHandler
  const defineOAuthOidcEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/oidc').defineOAuthOidcEventHandler
  const defineOAuthOktaEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/okta').defineOAuthOktaEventHandler
  const defineOAuthOryEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/ory').defineOAuthOryEventHandler
  const defineOAuthOsuEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/osu').defineOAuthOsuEventHandler
  const defineOAuthPaypalEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/paypal').defineOAuthPaypalEventHandler
  const defineOAuthPolarEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/polar').defineOAuthPolarEventHandler
  const defineOAuthRiotGamesEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/riotgames').defineOAuthRiotGamesEventHandler
  const defineOAuthRobloxEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/roblox').defineOAuthRobloxEventHandler
  const defineOAuthSalesforceEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/salesforce').defineOAuthSalesforceEventHandler
  const defineOAuthSeznamEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/seznam').defineOAuthSeznamEventHandler
  const defineOAuthShopifyCustomerEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/shopifyCustomer').defineOAuthShopifyCustomerEventHandler
  const defineOAuthSlackEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/slack').defineOAuthSlackEventHandler
  const defineOAuthSpotifyEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/spotify').defineOAuthSpotifyEventHandler
  const defineOAuthSteamEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/steam').defineOAuthSteamEventHandler
  const defineOAuthStravaEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/strava').defineOAuthStravaEventHandler
  const defineOAuthTikTokEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/tiktok').defineOAuthTikTokEventHandler
  const defineOAuthTwitchEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/twitch').defineOAuthTwitchEventHandler
  const defineOAuthVKEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/vk').defineOAuthVKEventHandler
  const defineOAuthWorkOSEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/workos').defineOAuthWorkOSEventHandler
  const defineOAuthXEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/x').defineOAuthXEventHandler
  const defineOAuthXSUAAEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/xsuaa').defineOAuthXSUAAEventHandler
  const defineOAuthYandexEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/yandex').defineOAuthYandexEventHandler
  const defineOAuthZitadelEventHandler: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/zitadel').defineOAuthZitadelEventHandler
  const defineRenderHandler: typeof import('../../node_modules/nitropack/dist/runtime/internal/renderer').defineRenderHandler
  const defineRequestMiddleware: typeof import('../../node_modules/h3/dist/index').defineRequestMiddleware
  const defineResponseMiddleware: typeof import('../../node_modules/h3/dist/index').defineResponseMiddleware
  const defineRouteMeta: typeof import('../../node_modules/nitropack/dist/runtime/internal/meta').defineRouteMeta
  const defineTask: typeof import('../../node_modules/nitropack/dist/runtime/internal/task').defineTask
  const defineWebSocket: typeof import('../../node_modules/h3/dist/index').defineWebSocket
  const defineWebSocketHandler: typeof import('../../node_modules/h3/dist/index').defineWebSocketHandler
  const deleteCookie: typeof import('../../node_modules/h3/dist/index').deleteCookie
  const deleteFile: typeof import('../../node_modules/nuxt-file-storage/dist/runtime/server/utils/storage').deleteFile
  const deleteUploadedFile: typeof import('../../server/utils/fileUtils').deleteUploadedFile
  const dynamicEventHandler: typeof import('../../node_modules/h3/dist/index').dynamicEventHandler
  const ensureSafeBasename: typeof import('../../node_modules/nuxt-file-storage/dist/runtime/server/utils/path-safety').ensureSafeBasename
  const eventHandler: typeof import('../../node_modules/h3/dist/index').eventHandler
  const fetchWithEvent: typeof import('../../node_modules/h3/dist/index').fetchWithEvent
  const fileExists: typeof import('../../server/utils/fileUtils').fileExists
  const folderNameGenerator: typeof import('../../server/utils/folderNameGenerator').folderNameGenerator
  const fromNodeMiddleware: typeof import('../../node_modules/h3/dist/index').fromNodeMiddleware
  const fromPlainHandler: typeof import('../../node_modules/h3/dist/index').fromPlainHandler
  const fromWebHandler: typeof import('../../node_modules/h3/dist/index').fromWebHandler
  const getActorEmail: typeof import('../../server/utils/auditLog').getActorEmail
  const getAtprotoClientMetadata: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/atproto').getAtprotoClientMetadata
  const getCookie: typeof import('../../node_modules/h3/dist/index').getCookie
  const getFileInfo: typeof import('../../server/utils/fileUtils').getFileInfo
  const getFileLocally: typeof import('../../node_modules/nuxt-file-storage/dist/runtime/server/utils/storage').getFileLocally
  const getFilesLocally: typeof import('../../node_modules/nuxt-file-storage/dist/runtime/server/utils/storage').getFilesLocally
  const getFullFilePath: typeof import('../../server/utils/fileUtils').getFullFilePath
  const getHeader: typeof import('../../node_modules/h3/dist/index').getHeader
  const getHeaders: typeof import('../../node_modules/h3/dist/index').getHeaders
  const getMethod: typeof import('../../node_modules/h3/dist/index').getMethod
  const getProxyRequestHeaders: typeof import('../../node_modules/h3/dist/index').getProxyRequestHeaders
  const getQuery: typeof import('../../node_modules/h3/dist/index').getQuery
  const getRequestFingerprint: typeof import('../../node_modules/h3/dist/index').getRequestFingerprint
  const getRequestHeader: typeof import('../../node_modules/h3/dist/index').getRequestHeader
  const getRequestHeaders: typeof import('../../node_modules/h3/dist/index').getRequestHeaders
  const getRequestHost: typeof import('../../node_modules/h3/dist/index').getRequestHost
  const getRequestIP: typeof import('../../node_modules/h3/dist/index').getRequestIP
  const getRequestMeta: typeof import('../../server/utils/auditLog').getRequestMeta
  const getRequestPath: typeof import('../../node_modules/h3/dist/index').getRequestPath
  const getRequestProtocol: typeof import('../../node_modules/h3/dist/index').getRequestProtocol
  const getRequestURL: typeof import('../../node_modules/h3/dist/index').getRequestURL
  const getRequestWebStream: typeof import('../../node_modules/h3/dist/index').getRequestWebStream
  const getResponseHeader: typeof import('../../node_modules/h3/dist/index').getResponseHeader
  const getResponseHeaders: typeof import('../../node_modules/h3/dist/index').getResponseHeaders
  const getResponseStatus: typeof import('../../node_modules/h3/dist/index').getResponseStatus
  const getResponseStatusText: typeof import('../../node_modules/h3/dist/index').getResponseStatusText
  const getRouteRules: typeof import('../../node_modules/nitropack/dist/runtime/internal/route-rules').getRouteRules
  const getRouterParam: typeof import('../../node_modules/h3/dist/index').getRouterParam
  const getRouterParams: typeof import('../../node_modules/h3/dist/index').getRouterParams
  const getSession: typeof import('../../node_modules/h3/dist/index').getSession
  const getUserGroups: typeof import('../../server/utils/ad').getUserGroups
  const getUserSession: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session').getUserSession
  const getValidatedQuery: typeof import('../../node_modules/h3/dist/index').getValidatedQuery
  const getValidatedRouterParams: typeof import('../../node_modules/h3/dist/index').getValidatedRouterParams
  const handleCacheHeaders: typeof import('../../node_modules/h3/dist/index').handleCacheHeaders
  const handleCors: typeof import('../../node_modules/h3/dist/index').handleCors
  const handleFileUpload: typeof import('../../server/utils/fileUploadHandler').handleFileUpload
  const hashPassword: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/password').hashPassword
  const isCorsOriginAllowed: typeof import('../../node_modules/h3/dist/index').isCorsOriginAllowed
  const isError: typeof import('../../node_modules/h3/dist/index').isError
  const isEvent: typeof import('../../node_modules/h3/dist/index').isEvent
  const isEventHandler: typeof import('../../node_modules/h3/dist/index').isEventHandler
  const isMethod: typeof import('../../node_modules/h3/dist/index').isMethod
  const isPreflightRequest: typeof import('../../node_modules/h3/dist/index').isPreflightRequest
  const isSafeBasename: typeof import('../../node_modules/nuxt-file-storage/dist/runtime/server/utils/path-safety').isSafeBasename
  const isStream: typeof import('../../node_modules/h3/dist/index').isStream
  const isWebResponse: typeof import('../../node_modules/h3/dist/index').isWebResponse
  const lazyEventHandler: typeof import('../../node_modules/h3/dist/index').lazyEventHandler
  const logAudit: typeof import('../../server/utils/auditLog').logAudit
  const logger: typeof import('../../server/utils/logger').logger
  const nitroPlugin: typeof import('../../node_modules/nitropack/dist/runtime/internal/plugin').nitroPlugin
  const normalizeRelative: typeof import('../../node_modules/nuxt-file-storage/dist/runtime/server/utils/path-safety').normalizeRelative
  const parseCookies: typeof import('../../node_modules/h3/dist/index').parseCookies
  const parseDataUrl: typeof import('../../node_modules/nuxt-file-storage/dist/runtime/server/utils/storage').parseDataUrl
  const parseDate: typeof import('../../server/utils/fileUploadHandler').parseDate
  const passwordNeedsReHash: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/password').passwordNeedsReHash
  const promisifyNodeListener: typeof import('../../node_modules/h3/dist/index').promisifyNodeListener
  const proxyRequest: typeof import('../../node_modules/h3/dist/index').proxyRequest
  const readBody: typeof import('../../node_modules/h3/dist/index').readBody
  const readFormData: typeof import('../../node_modules/h3/dist/index').readFormData
  const readMultipartFormData: typeof import('../../node_modules/h3/dist/index').readMultipartFormData
  const readRawBody: typeof import('../../node_modules/h3/dist/index').readRawBody
  const readValidatedBody: typeof import('../../node_modules/h3/dist/index').readValidatedBody
  const removeResponseHeader: typeof import('../../node_modules/h3/dist/index').removeResponseHeader
  const replaceUserSession: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session').replaceUserSession
  const requireUserSession: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session').requireUserSession
  const resolveAndEnsureInside: typeof import('../../node_modules/nuxt-file-storage/dist/runtime/server/utils/path-safety').resolveAndEnsureInside
  const retrieveFileLocally: typeof import('../../node_modules/nuxt-file-storage/dist/runtime/server/utils/storage').retrieveFileLocally
  const runTask: typeof import('../../node_modules/nitropack/dist/runtime/internal/task').runTask
  const sanitizeStatusCode: typeof import('../../node_modules/h3/dist/index').sanitizeStatusCode
  const sanitizeStatusMessage: typeof import('../../node_modules/h3/dist/index').sanitizeStatusMessage
  const sealSession: typeof import('../../node_modules/h3/dist/index').sealSession
  const send: typeof import('../../node_modules/h3/dist/index').send
  const sendError: typeof import('../../node_modules/h3/dist/index').sendError
  const sendIterable: typeof import('../../node_modules/h3/dist/index').sendIterable
  const sendNoContent: typeof import('../../node_modules/h3/dist/index').sendNoContent
  const sendProxy: typeof import('../../node_modules/h3/dist/index').sendProxy
  const sendRedirect: typeof import('../../node_modules/h3/dist/index').sendRedirect
  const sendStream: typeof import('../../node_modules/h3/dist/index').sendStream
  const sendWebResponse: typeof import('../../node_modules/h3/dist/index').sendWebResponse
  const serveStatic: typeof import('../../node_modules/h3/dist/index').serveStatic
  const sessionHooks: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session').sessionHooks
  const setCookie: typeof import('../../node_modules/h3/dist/index').setCookie
  const setHeader: typeof import('../../node_modules/h3/dist/index').setHeader
  const setHeaders: typeof import('../../node_modules/h3/dist/index').setHeaders
  const setResponseHeader: typeof import('../../node_modules/h3/dist/index').setResponseHeader
  const setResponseHeaders: typeof import('../../node_modules/h3/dist/index').setResponseHeaders
  const setResponseStatus: typeof import('../../node_modules/h3/dist/index').setResponseStatus
  const setUserSession: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session').setUserSession
  const softDelete: typeof import('../../server/utils/auditLog').softDelete
  const splitCookiesString: typeof import('../../node_modules/h3/dist/index').splitCookiesString
  const storeFileLocally: typeof import('../../node_modules/nuxt-file-storage/dist/runtime/server/utils/storage').storeFileLocally
  const toEventHandler: typeof import('../../node_modules/h3/dist/index').toEventHandler
  const toNodeListener: typeof import('../../node_modules/h3/dist/index').toNodeListener
  const toPlainHandler: typeof import('../../node_modules/h3/dist/index').toPlainHandler
  const toWebHandler: typeof import('../../node_modules/h3/dist/index').toWebHandler
  const toWebRequest: typeof import('../../node_modules/h3/dist/index').toWebRequest
  const unsealSession: typeof import('../../node_modules/h3/dist/index').unsealSession
  const updateFilePathsInData: typeof import('../../server/utils/fileUploadHandler').updateFilePathsInData
  const updateSession: typeof import('../../node_modules/h3/dist/index').updateSession
  const useAppConfig: typeof import('../../node_modules/nitropack/dist/runtime/internal/config').useAppConfig
  const useBase: typeof import('../../node_modules/h3/dist/index').useBase
  const useEvent: typeof import('../../node_modules/nitropack/dist/runtime/internal/context').useEvent
  const useImage: typeof import('../../node_modules/@nuxt/image/dist/runtime/server/utils/image').useImage
  const useNitroApp: typeof import('../../node_modules/nitropack/dist/runtime/internal/app').useNitroApp
  const useRuntimeConfig: typeof import('../../node_modules/nitropack/dist/runtime/internal/config').useRuntimeConfig
  const useSession: typeof import('../../node_modules/h3/dist/index').useSession
  const useStorage: typeof import('../../node_modules/nitropack/dist/runtime/internal/storage').useStorage
  const verifyPassword: typeof import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/password').verifyPassword
  const writeEarlyHints: typeof import('../../node_modules/h3/dist/index').writeEarlyHints
}
// for type re-export
declare global {
  // @ts-ignore
  export type { EventHandler, EventHandlerRequest, EventHandlerResponse, EventHandlerObject, H3EventContext } from '../../node_modules/h3/dist/index'
  import('../../node_modules/h3/dist/index')
  // @ts-ignore
  export type { OAuthAppleConfig, OAuthAppleTokens, OAuthAppleUser } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/apple.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/apple.d')
  // @ts-ignore
  export type { OAuthAtlassianConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/atlassian.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/atlassian.d')
  // @ts-ignore
  export type { OAuthAuth0Config } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/auth0.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/auth0.d')
  // @ts-ignore
  export type { OAuthAuthentikConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/authentik.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/authentik.d')
  // @ts-ignore
  export type { OAuthAzureB2CConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/azureb2c.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/azureb2c.d')
  // @ts-ignore
  export type { OAuthBattledotnetConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/battledotnet.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/battledotnet.d')
  // @ts-ignore
  export type { OAuthBoxConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/box.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/box.d')
  // @ts-ignore
  export type { OAuthCognitoConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/cognito.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/cognito.d')
  // @ts-ignore
  export type { OAuthDiscordConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/discord.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/discord.d')
  // @ts-ignore
  export type { OAuthDropboxConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/dropbox.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/dropbox.d')
  // @ts-ignore
  export type { OAuthFacebookConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/facebook.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/facebook.d')
  // @ts-ignore
  export type { OAuthGiteaConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitea.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitea.d')
  // @ts-ignore
  export type { OAuthGitHubConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/github.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/github.d')
  // @ts-ignore
  export type { OAuthGitLabConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitlab.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitlab.d')
  // @ts-ignore
  export type { OAuthGoogleConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/google.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/google.d')
  // @ts-ignore
  export type { OAuthHerokuConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/heroku.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/heroku.d')
  // @ts-ignore
  export type { OAuthHubspotConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/hubspot.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/hubspot.d')
  // @ts-ignore
  export type { OAuthInstagramConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/instagram.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/instagram.d')
  // @ts-ignore
  export type { OAuthKeycloakConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/keycloak.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/keycloak.d')
  // @ts-ignore
  export type { OAuthKickConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/kick.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/kick.d')
  // @ts-ignore
  export type { OAuthLineConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/line.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/line.d')
  // @ts-ignore
  export type { OAuthLinearConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linear.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linear.d')
  // @ts-ignore
  export type { OAuthLinkedInConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linkedin.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linkedin.d')
  // @ts-ignore
  export type { LiveChatTokens, LiveChatUser, LiveChatConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/livechat.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/livechat.d')
  // @ts-ignore
  export type { OAuthMicrosoftConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/microsoft.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/microsoft.d')
  // @ts-ignore
  export type { OAuthOidcConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/oidc.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/oidc.d')
  // @ts-ignore
  export type { OpenIdConfig, OAuthConfigExt, OAuthOktaConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/okta.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/okta.d')
  // @ts-ignore
  export type { OAuthOryConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/ory.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/ory.d')
  // @ts-ignore
  export type { OAuthOsuConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/osu.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/osu.d')
  // @ts-ignore
  export type { OAuthPaypalConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/paypal.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/paypal.d')
  // @ts-ignore
  export type { OAuthPolarConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/polar.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/polar.d')
  // @ts-ignore
  export type { OAuthRiotGamesConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/riotgames.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/riotgames.d')
  // @ts-ignore
  export type { OAuthRobloxConfig, OAuthRobloxUser } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/roblox.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/roblox.d')
  // @ts-ignore
  export type { OAuthSalesforceConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/salesforce.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/salesforce.d')
  // @ts-ignore
  export type { OAuthSeznamConfig, OAuthSeznamUser } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/seznam.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/seznam.d')
  // @ts-ignore
  export type { OAuthShopifyCustomerConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/shopifyCustomer.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/shopifyCustomer.d')
  // @ts-ignore
  export type { OAuthSlackConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/slack.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/slack.d')
  // @ts-ignore
  export type { OAuthSpotifyConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/spotify.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/spotify.d')
  // @ts-ignore
  export type { OAuthSteamConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/steam.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/steam.d')
  // @ts-ignore
  export type { OAuthStravaConfig, OAuthStravaUser, OAuthStravaTokens } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/strava.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/strava.d')
  // @ts-ignore
  export type { OAuthTikTokConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/tiktok.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/tiktok.d')
  // @ts-ignore
  export type { OAuthTwitchConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/twitch.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/twitch.d')
  // @ts-ignore
  export type { OAuthVKConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/vk.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/vk.d')
  // @ts-ignore
  export type { OAuthWorkOSConfig, OAuthWorkOSUser, OAuthWorkOSAuthenticationMethod, OAuthWorkOSAuthenticateResponse, OAuthWorkOSTokens } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/workos.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/workos.d')
  // @ts-ignore
  export type { OAuthXConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/x.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/x.d')
  // @ts-ignore
  export type { OAuthXSUAAConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/xsuaa.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/xsuaa.d')
  // @ts-ignore
  export type { OAuthYandexConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/yandex.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/yandex.d')
  // @ts-ignore
  export type { OAuthZitadelConfig } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/zitadel.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/zitadel.d')
  // @ts-ignore
  export type { SessionHooks } from '../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session.d'
  import('../../node_modules/nuxt-auth-utils/dist/runtime/server/utils/session.d')
  // @ts-ignore
  export type { AuditAction, AuditEntityType } from '../../server/utils/auditLog'
  import('../../server/utils/auditLog')
  // @ts-ignore
  export type { FileUploadResult, FileProcessingOptions } from '../../server/utils/fileUploadHandler'
  import('../../server/utils/fileUploadHandler')
}
export { H3Event, H3Error, appendCorsHeaders, appendCorsPreflightHeaders, appendHeader, appendHeaders, appendResponseHeader, appendResponseHeaders, assertMethod, callNodeListener, clearResponseHeaders, clearSession, createApp, createAppEventHandler, createError, createEvent, createEventStream, createRouter, defaultContentType, defineEventHandler, defineLazyEventHandler, defineNodeListener, defineNodeMiddleware, defineRequestMiddleware, defineResponseMiddleware, defineWebSocket, defineWebSocketHandler, deleteCookie, dynamicEventHandler, eventHandler, fetchWithEvent, fromNodeMiddleware, fromPlainHandler, fromWebHandler, getCookie, getHeader, getHeaders, getMethod, getProxyRequestHeaders, getQuery, getRequestFingerprint, getRequestHeader, getRequestHeaders, getRequestHost, getRequestIP, getRequestPath, getRequestProtocol, getRequestURL, getRequestWebStream, getResponseHeader, getResponseHeaders, getResponseStatus, getResponseStatusText, getRouterParam, getRouterParams, getSession, getValidatedQuery, getValidatedRouterParams, handleCacheHeaders, handleCors, isCorsOriginAllowed, isError, isEvent, isEventHandler, isMethod, isPreflightRequest, isStream, isWebResponse, lazyEventHandler, parseCookies, promisifyNodeListener, proxyRequest, readBody, readFormData, readMultipartFormData, readRawBody, readValidatedBody, removeResponseHeader, sanitizeStatusCode, sanitizeStatusMessage, sealSession, send, sendError, sendIterable, sendNoContent, sendProxy, sendRedirect, sendStream, sendWebResponse, serveStatic, setCookie, setHeader, setHeaders, setResponseHeader, setResponseHeaders, setResponseStatus, splitCookiesString, toEventHandler, toNodeListener, toPlainHandler, toWebHandler, toWebRequest, unsealSession, updateSession, useBase, useSession, writeEarlyHints } from 'h3';
export { useNitroApp } from 'nitropack/runtime/internal/app';
export { useRuntimeConfig, useAppConfig } from 'nitropack/runtime/internal/config';
export { defineNitroPlugin, nitroPlugin } from 'nitropack/runtime/internal/plugin';
export { defineCachedFunction, defineCachedEventHandler, cachedFunction, cachedEventHandler } from 'nitropack/runtime/internal/cache';
export { useStorage } from 'nitropack/runtime/internal/storage';
export { defineRenderHandler } from 'nitropack/runtime/internal/renderer';
export { defineRouteMeta } from 'nitropack/runtime/internal/meta';
export { getRouteRules } from 'nitropack/runtime/internal/route-rules';
export { useEvent } from 'nitropack/runtime/internal/context';
export { defineTask, runTask } from 'nitropack/runtime/internal/task';
export { defineNitroErrorHandler } from 'nitropack/runtime/internal/error/utils';
export { buildAssetsURL as __buildAssetsURL, publicAssetsURL as __publicAssetsURL } from '/home/local_adm/Projects/MyPlatform/node_modules/@nuxt/nitro-server/dist/runtime/utils/paths';
export { defineAppConfig } from '/home/local_adm/Projects/MyPlatform/node_modules/@nuxt/nitro-server/dist/runtime/utils/config';
export { useImage } from '/home/local_adm/Projects/MyPlatform/node_modules/@nuxt/image/dist/runtime/server/utils/image';
export { defineOAuthAppleEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/apple';
export { defineOAuthAtlassianEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/atlassian';
export { defineOAuthAuth0EventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/auth0';
export { defineOAuthAuthentikEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/authentik';
export { defineOAuthAzureB2CEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/azureb2c';
export { defineOAuthBattledotnetEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/battledotnet';
export { defineOAuthBoxEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/box';
export { defineOAuthCognitoEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/cognito';
export { defineOAuthDiscordEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/discord';
export { defineOAuthDropboxEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/dropbox';
export { defineOAuthFacebookEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/facebook';
export { defineOAuthGiteaEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitea';
export { defineOAuthGitHubEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/github';
export { defineOAuthGitLabEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/gitlab';
export { defineOAuthGoogleEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/google';
export { defineOAuthHerokuEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/heroku';
export { defineOAuthHubspotEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/hubspot';
export { defineOAuthInstagramEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/instagram';
export { defineOAuthKeycloakEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/keycloak';
export { defineOAuthKickEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/kick';
export { defineOAuthLineEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/line';
export { defineOAuthLinearEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linear';
export { defineOAuthLinkedInEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/linkedin';
export { defineOAuthLiveChatEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/livechat';
export { defineOAuthMicrosoftEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/microsoft';
export { defineOAuthOidcEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/oidc';
export { defineOAuthOktaEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/okta';
export { defineOAuthOryEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/ory';
export { defineOAuthOsuEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/osu';
export { defineOAuthPaypalEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/paypal';
export { defineOAuthPolarEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/polar';
export { defineOAuthRiotGamesEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/riotgames';
export { defineOAuthRobloxEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/roblox';
export { defineOAuthSalesforceEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/salesforce';
export { defineOAuthSeznamEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/seznam';
export { defineOAuthShopifyCustomerEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/shopifyCustomer';
export { defineOAuthSlackEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/slack';
export { defineOAuthSpotifyEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/spotify';
export { defineOAuthSteamEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/steam';
export { defineOAuthStravaEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/strava';
export { defineOAuthTikTokEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/tiktok';
export { defineOAuthTwitchEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/twitch';
export { defineOAuthVKEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/vk';
export { defineOAuthWorkOSEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/workos';
export { defineOAuthXEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/x';
export { defineOAuthXSUAAEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/xsuaa';
export { defineOAuthYandexEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/yandex';
export { defineOAuthZitadelEventHandler } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/lib/oauth/zitadel';
export { getAtprotoClientMetadata } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/utils/atproto';
export { hashPassword, verifyPassword, passwordNeedsReHash } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/utils/password';
export { sessionHooks, getUserSession, setUserSession, replaceUserSession, clearUserSession, requireUserSession } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-auth-utils/dist/runtime/server/utils/session';
export { getUserGroups } from '/home/local_adm/Projects/MyPlatform/server/utils/ad';
export { adCache } from '/home/local_adm/Projects/MyPlatform/server/utils/adCache';
export { logAudit, computeChangedFields, getActorEmail, getRequestMeta, softDelete } from '/home/local_adm/Projects/MyPlatform/server/utils/auditLog';
export { handleFileUpload, cleanOldFilesFromDisk, parseDate, updateFilePathsInData } from '/home/local_adm/Projects/MyPlatform/server/utils/fileUploadHandler';
export { getFullFilePath, fileExists, getFileInfo, deleteUploadedFile } from '/home/local_adm/Projects/MyPlatform/server/utils/fileUtils';
export { folderNameGenerator } from '/home/local_adm/Projects/MyPlatform/server/utils/folderNameGenerator';
export { logger } from '/home/local_adm/Projects/MyPlatform/server/utils/logger';
export { normalizeRelative, isSafeBasename, ensureSafeBasename, containsPathTraversal, resolveAndEnsureInside } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-file-storage/dist/runtime/server/utils/path-safety';
export { storeFileLocally, getFileLocally, getFilesLocally, deleteFile, parseDataUrl, retrieveFileLocally } from '/home/local_adm/Projects/MyPlatform/node_modules/nuxt-file-storage/dist/runtime/server/utils/storage';