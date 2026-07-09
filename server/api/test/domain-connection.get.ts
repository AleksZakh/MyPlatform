// server/api/test/domain-connection.get.ts
import ActiveDirectory from 'activedirectory2';

export default defineEventHandler(async (event) => {
  // Получаем конфигурацию из runtimeConfig
  const config = useRuntimeConfig(event);

  const adConfig = {
    url: config.ad.url,
    baseDN: config.ad.baseDN,
    username: config.ad.username,
    password: config.ad.password,
    timeout: config.ad.timeout,
  };

  const startTime = Date.now();
  const ad = new ActiveDirectory(adConfig);

  const result = {
    success: false,
    message: '',
    details: {},
    elapsedMs: 0,
    timestamp: new Date().toISOString(),
  };

  console.log('=== ТЕСТ ПОДКЛЮЧЕНИЯ К ДОМЕНУ (activedirectory2) ===');
  console.log(`📡 Адрес: ${adConfig.url}`);
  console.log(`📁 Base DN: ${adConfig.baseDN}`);
  console.log(`👤 Пользователь: ${adConfig.username}`);

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      result.message = '❌ Таймаут подключения к домену';
      result.details = { error: 'Connection timeout' };
      console.error(result.message);
      resolve(result);
    }, adConfig.timeout + 1000);

    // ✅ Используем authenticate для простой проверки подключения
    ad.authenticate(
      adConfig.username,
      adConfig.password,
      (err, isAuthenticated) => {
        clearTimeout(timeoutId);
        result.elapsedMs = Date.now() - startTime;

        // Приводим err к типу any для доступа к свойствам
        const error = err as any;

        if (err) {
          result.success = false;
          result.message = `❌ Ошибка подключения к домену: ${error.message || error}`;
          result.details = {
            error: error.message || error,
            code: error.code || 'UNKNOWN',
          };
          console.error(result.message);

          // Детальная диагностика ошибок
          if (error.code === 'ECONNREFUSED') {
            console.error(
              '💡 Контроллер домена недоступен или порт 389 закрыт'
            );
            console.error(
              '   Проверьте: доступность сервера, firewall, службу LDAP'
            );
          } else if (error.code === 'ENOTFOUND') {
            console.error('💡 DNS имя не разрешается');
            console.error(`   Проверьте: правильность URL "${adConfig.url}"`);
          } else if (error.code === 'LDAP_INVALID_CREDENTIALS') {
            console.error('💡 Неверные учетные данные');
            console.error(
              `   Проверьте: AD_USERNAME="${adConfig.username}" и пароль`
            );
          } else if (error.code === 'ETIMEOUT') {
            console.error('💡 Таймаут соединения');
            console.error(
              '   Проверьте: сетевую доступность и увеличьте AD_TIMEOUT'
            );
          }
        } else if (isAuthenticated) {
          result.success = true;
          result.message = '✅ ✅ ✅ УСПЕШНОЕ ПОДКЛЮЧЕНИЕ К ДОМЕНУ!';
          result.details = {
            authenticated: true,
            baseDN: adConfig.baseDN,
            user: adConfig.username,
          };
          console.log(`🎉 ${result.message}`);
          console.log(`⏱️ Время подключения: ${result.elapsedMs}ms`);
          console.log(`👤 Аутентификация пройдена для: ${adConfig.username}`);
        } else {
          result.success = false;
          result.message = '❌ Ошибка аутентификации: неверные учетные данные';
          result.details = {
            authenticated: false,
            error: 'Invalid credentials',
          };
          console.error(result.message);
        }

        console.log(`📝 Результат: ${result.message}\n`);
        resolve(result);
      }
    );
  });
});
