import { refreshAdCache } from '../../services/ad-cache-refresh.service'
export default defineTask({
  meta: { name: 'ad:refresh-ad-cache', description: 'Автоматическое обновление кэша AD' },
  async run(): Promise<{ result: { status: string; userCount?: number; message?: string } }> {
    try {
      const users = await refreshAdCache('scheduled')
      return { result: { status: 'success', userCount: users.length } }
    } catch {
      return { result: { status: 'error', message: 'AD недоступен или кэш не сохранён. Подробности в журнале сервера.' } }
    }
  },
})
