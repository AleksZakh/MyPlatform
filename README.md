# AdminCenter — DepartmentPermission matrix v1

Добавить/заменить:

- server/api/admin/departments/[id]/permissions.get.ts
- server/api/admin/departments/[id]/permissions.put.ts
- app/components/admin/UserDirectory.vue
- scripts/ensure-admin-department-permissions-resource.ts

Требуется ранее созданная Prisma-модель:
- DepartmentPermission

и рабочий mapping:
- DirectoryDepartmentMapping

## 1. Создать FEATURE-ресурс

npx tsx scripts/ensure-admin-department-permissions-resource.ts \
  --grant-login=zakharov_av

Ожидаем:

✅ FEATURE-ресурс готов: admin.department-permissions
✅ UPDATE выдан пользователю zakharov_av

## 2. Typecheck

npx nuxi typecheck > /tmp/admin-department-permissions-v1.log 2>&1
status=$?

grep -E \
'server/api/admin/departments/.*/permissions|components/admin/UserDirectory\.vue|ensure-admin-department-permissions-resource' \
/tmp/admin-department-permissions-v1.log

printf 'Full typecheck exit code: %s\n' "$status"

## 3. Проверка API

Для Space Department id=1:

/api/admin/departments/1/permissions

## 4. Проверка UI

/admin/users
→ Подразделения
→ выбрать AD-подразделение, которое сопоставлено со Space
→ Права подразделения

Каждая ячейка VIEW / CREATE / UPDATE / DELETE:
- создаёт DepartmentPermission при включении;
- удаляет DepartmentPermission при выключении;
- сохраняется отдельно;
- изменение пишет ADMIN-событие в AuditLog.

## ВАЖНО

Этим шагом DepartmentPermission УЖЕ хранится и редактируется,
но requirePermission() ЕЩЁ НЕ использует эти права.

То есть это пока административная настройка будущих наследуемых прав.

Следующий отдельный шаг:
обновить access-control.service так, чтобы effective permission было:

UserPermission OR DepartmentPermission

после того как проверим матрицу и реальные записи.
