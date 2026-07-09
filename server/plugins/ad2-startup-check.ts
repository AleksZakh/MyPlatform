// server/plugins/ad2-startup-check.ts
import ActiveDirectory from 'activedirectory2';

export default defineNitroPlugin(async () => {
  console.log('\n🏁 ПРОВЕРКА ПОДКЛЮЧЕНИЯ К ACTIVE DIRECTORY');
  console.log('===========================================\n');

  const config = useRuntimeConfig();

  const adConfig = {
    url: config.ad.url,
    baseDN: config.ad.baseDN,
    username: config.ad.username,
    password: config.ad.password,
    timeout: config.ad.timeout,
  };

  const ad = new ActiveDirectory(adConfig);

  setTimeout(() => {
    ad.authenticate(
      adConfig.username,
      adConfig.password,
      (err, isAuthenticated) => {
        if (err) {
          console.error(
            '❌ ❌ ❌ ПРЕДУПРЕЖДЕНИЕ: НЕТ ПОДКЛЮЧЕНИЯ К ДОМЕНУ ❌ ❌ ❌'
          );

          // ✅ Приводим err к типу any для обхода проверок TypeScript
          const error = err as any;
          console.error(`📛 Ошибка: ${error.message || error}`);

          if (error.code === 'ENOTFOUND') {
            console.error('💡 Контроллер домена не найден. Проверьте AD_URL');
          } else if (error.code === 'ECONNREFUSED') {
            console.error(
              '💡 Подключение отклонено. Проверьте порт и firewall'
            );
          } else if (error.code === 'LDAP_INVALID_CREDENTIALS') {
            console.error(
              '💡 Неверные учетные данные. Проверьте AD_USERNAME и AD_PASSWORD'
            );
          } else if (error.code) {
            console.error(`💡 Код ошибки: ${error.code}`);
          }

          console.error(
            '💡 Функции аутентификации и авторизации будут недоступны\n'
          );
        } else if (isAuthenticated) {
          console.log('✅ ✅ ✅ ПОДКЛЮЧЕНИЕ К ДОМЕНУ УСТАНОВЛЕНО ✅ ✅ ✅');
          console.log('🌐 Приложение подключено к AD и готово к работе\n');
        } else {
          console.error(
            '❌ Ошибка аутентификации: учетные данные не прошли проверку\n'
          );
        }
      }
    );
  }, 2000);
});
