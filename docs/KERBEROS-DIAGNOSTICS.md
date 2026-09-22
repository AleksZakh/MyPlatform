# Как найти причину постоянного запроса пароля

В вашем проекте цепочка такая: браузер → nginx/SPNEGO → `POST /api/auth/kerberos` → чтение AD → локальная учётная запись → cookie Nuxt → `GET /api/_auth/session`.

Предыдущий пакет прав не менял login.vue, kerberos.post.ts и nginx. Это не исключает косвенного эффекта старой сессии без числового app_users.id, который теперь требуется при проверке прав. Один повторный вход обновляет такую сессию; постоянный ввод пароля требует проверки цепочки ниже.

## 1. Определите, какое окно просит пароль

- **Системное окно браузера** поверх страницы: проверьте nginx challenge, browser policies и билет Kerberos. SPNEGO-модуль nginx может предложить Basic, если переговоры не состоялись.
- **Форма Space на странице /login**: автоматический запрос не завершился либо не был запущен. Это может быть и nginx, и AD, и локальная запись, и cookie.
- **Повторный вход после каждого перезапуска или случайно между запросами**: проверьте постоянство секрета сессии и одинаковую конфигурацию экземпляров.

Это диагностические направления, а не установленная причина. [SPNEGO-модуль nginx](https://github.com/stnoonan/spnego-http-auth-nginx-module), [Nuxt Auth Utils](https://github.com/atinux/nuxt-auth-utils).

## 2. Первый полезный результат — один запрос браузера

Откройте обычное окно браузера, DevTools → Network → Preserve log. Откройте `/login` **без `logout=1`**. После явного выхода этот параметр намеренно отключает автоматический вход, чтобы не войти обратно сразу. В обновлённой форме есть «Повторить доменный вход».

Найдите **POST**, не GET, `/api/auth/kerberos`. Первоначальный 401 с Negotiate может быть нормальной частью обмена; оценивайте финальный ответ и дальнейшую сессию.

| Результат | Где искать причину |
|---|---|
| Запроса нет | Страница не дошла до автоматической попытки; параметр logout, ошибка JavaScript или начальной проверки сессии. Нажмите повторный вход. |
| Финальный 401, нет `X-Space-Auth-Stage` | Запрос, вероятно, остановлен nginx/промежуточным proxy. Проверьте `WWW-Authenticate`, билеты, имя сайта и browser policy. Отсутствие заголовка также возможно при старой версии endpoint или удалении заголовков proxy. |
| 401, этап `proxy` | Nitro вызван, но не получил ни одного доверенного заголовка с именем. Проверьте точный location и `proxy_set_header X-Remote-User $remote_user`. |
| 503, этап `directory` | nginx передал имя; сбой чтения AD: доступность LDAP, bind-учётная запись, её пароль, baseDN, таймаут. Это отдельный шаг от Kerberos. |
| 403, этап `directory` | Подтверждённый пользователь не найден в настроенной области поиска AD. |
| 403, этап `account` | Локальная учётная запись Space или AD запрещает вход. Проверьте ACTIVE/BLOCKED/DISABLED и accountDisabled. |
| 500, этап `account` | Ошибка синхронизации локальной записи, конфликт идентичности или БД. Диагностический этап не раскрывает персональные данные клиенту. Проверяйте локальную запись и сервер. |
| 500, этап `session` | Не удалось создать/запечатать cookie. Проверьте runtime session config и секрет. |
| 200, этап `complete`, затем форма сообщает `session-check` | Сервер обработал вход, но сессия не подтвердилась. Проверьте Set-Cookie, следующий `/api/_auth/session`, домен/путь/Secure cookie, proxy caching и секреты экземпляров. |
| Обе проверки успешны, но конкретный API отдаёт 403 | Это уже запрет операции/статус пользователя. Новый ввод пароля прав не добавляет. |

В интерфейсе отображаются этап, HTTP-код и request ID. Сервер пишет `[kerberos] request=... stage=... status=...`. Идентификатор связывает одну попытку с логом. Пароли, токены и cookie в эти записи не добавляются.

## 3. Если отказ до приложения — nginx

Посмотрите действующую конфигурацию локально (`sudo nginx -T`), не отправляя целиком её вывод: там могут быть внутренние адреса или секреты. Для точного `location = /api/auth/kerberos` нужны `auth_gss on`, верный keytab и сервисный principal, а после успешной проверки — доверенное имя пользователя в upstream. В пакете есть `config/nginx-kerberos.example.conf`: это пример для сверки, не готовая замена вашего server block.

Если появляется системное окно ввода пароля и ответ содержит Basic, `auth_gss_allow_basic_fallback off;` отключает этот fallback. **Эта настройка убирает fallback, но сама не исправляет Kerberos.** Ручная форма Space продолжит работать через отдельный `/api/auth/login`. После изменения проверьте `nginx -t` и применяйте конфигурацию по вашей процедуре. [Описание модуля](https://github.com/stnoonan/spnego-http-auth-nginx-module#basic-authentication-fallback).

Проверьте, что nginx читает keytab от имени своего worker-пользователя, что его principal соответствует фактическому HTTP SPN, а часы nginx, клиента и KDC синхронизированы. Не регенерируйте keytab и не меняйте SPN наугад.

Nuxt endpoint доверяет заголовкам proxy. Порт Nitro должен быть недоступен клиентам напрямую, а proxy обязан перезаписывать/очищать X-Remote-User, Remote-User, X-Forwarded-User. Присланный браузером заголовок не подтверждает личность.

## 4. Билет, SPN, hostname и браузер

Используйте тот же DNS-адрес сайта, для которого настроена инфраструктура, и проверьте, не стали ли открывать Space по IP, другому алиасу или через новый proxy. При CNAME учитывайте фактический principal, который запрашивает клиент; не исправляйте его только по внешнему написанию URL. [Диагностика Microsoft](https://learn.microsoft.com/en-us/troubleshoot/developer/webapps/iis/www-authentication-authorization/troubleshoot-kerberos-failures-ie), [настройки principal nginx-модуля](https://github.com/stnoonan/spnego-http-auth-nginx-module#configuration-reference).

На Windows в контексте пользователя:

```powershell
klist
klist get HTTP/space.corp.example.ru
```

Администратор AD может проверить регистрацию и дубли без изменения данных:

```powershell
setspn -Q HTTP/space.corp.example.ru
setspn -X
```

Подставьте реальное имя сайта/запрашиваемый SPN. Ошибка `klist get` направляет проверку к KDC, SPN, DNS или довериям. Успех подтверждает получение билета, но не доказывает, что nginx может его расшифровать. [klist](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/klist), [setspn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/setspn).

На Linux/macOS проверьте `klist`, наличие пользовательского TGT и доступ к KDC. Если сборка curl поддерживает SPNEGO, можно отдельно проверить протокол (без печати билетов/тела ответа):

```bash
curl --negotiate -u : -sS -o /dev/null -w 'HTTP %{http_code}\n' -X POST https://space.corp.example.ru/api/auth/kerberos
```

В Chrome/Edge проверьте фактически применённые политики (`chrome://policy`, `edge://policy`), особенно разрешённые серверы интегрированной аутентификации. Не разрешайте автоматически все интернет-хосты. Для данного приложения делегирование пользовательских credentials на следующий сервер не требуется: AD читается сервисной учётной записью. [Политика Edge AuthServerAllowlist](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/authserverallowlist).

## 5. Если вход успешен, но cookie теряется

Проверьте в браузере Application → Cookies и Network:

1. Есть ли Set-Cookie у финального успешного POST и не указан ли браузером отказ принять cookie?
2. Отправляется ли cookie в следующий GET `/api/_auth/session`?
3. Возвращает ли этот GET пользователя с числовым `id`, соответствующим app_users.id?
4. Совпадают ли hostname, HTTPS и путь между запросами? Не кэшируются ли auth endpoint/session на proxy?
5. Один ли и тот же `NUXT_SESSION_PASSWORD` установлен в runtime всех процессов/контейнеров и сохраняется ли он после рестарта? Не полагайтесь на чтение `.env` собранным Node-процессом, если запуск не загружает его явно.

В присланном config параметры стояли в неподдерживаемом блоке `auth`. Их исправление делает настройки действующими, но не доказывает причину конкретного сбоя. [Код конфигурации версии 0.5.29](https://github.com/atinux/nuxt-auth-utils/blob/v0.5.29/src/module.ts), [код session utils](https://github.com/atinux/nuxt-auth-utils/blob/v0.5.29/src/runtime/server/utils/session.ts).

## Что прислать для следующего шага

Достаточно указать: форма Space или системное окно; адрес сайта без параметров; браузер/ОС; финальный HTTP-код POST; этап и request ID; есть ли `Negotiate`/`Basic` (только названия схем); успешен ли `/api/_auth/session`. Можно приложить очищенный location nginx и строку `[kerberos]` по request ID.

Не присылайте Authorization, Cookie/Set-Cookie с их значениями, keytab, LDAP-пароль, секрет сессии или полный HAR. Содержимого билетов для этой диагностики не нужно.
