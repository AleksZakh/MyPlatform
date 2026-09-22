# Access control — DepartmentPermission v1

Заменить:
server/services/access-control.service.ts

Новая логика:
SYSTEM_ADMIN
OR UserPermission
OR DepartmentPermission

Условия наследования DepartmentPermission:
- User.status = ACTIVE;
- User.departmentId задан;
- Department.isActive = true;
- AccessResource.isActive = true;
- action совпадает.

DENY пока не реализован: права аддитивные.

requirePermission() теперь возвращает source:
- SYSTEM_ADMIN
- USER
- DEPARTMENT

и departmentId для source=DEPARTMENT.

Проверка:

npx nuxi typecheck > /tmp/access-control-department-v1.log 2>&1
status=$?

grep -E 'server/services/access-control\.service\.ts' /tmp/access-control-department-v1.log

printf 'Full typecheck exit code: %s\n' "$status"

Безопасный тест:
1. Не удалять существующие UserPermission.
2. Взять тестового пользователя с departmentId.
3. На тестовом ресурсе убрать его персональный UPDATE.
4. Выдать UPDATE его Department через AdminCenter.
5. Повторить операцию — должна пройти.
6. Отозвать DepartmentPermission — снова должен быть 403, если UserPermission нет.

Важно для Реестра лаборатории:
lab.sampling-tests:UPDATE даёт право изменять данные,
но не отменяет 10-минутный edit lock.
Для обхода lock нужен отдельный:
lab.incoming-control.edit-lock-override:UPDATE.
