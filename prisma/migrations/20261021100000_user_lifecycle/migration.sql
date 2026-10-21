ALTER TABLE app_users ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE app_users ADD CONSTRAINT deleted_account_disabled CHECK ("deletedAt" IS NULL OR (status = 'DISABLED' AND login IS NULL AND email IS NULL AND "directoryObjectId" IS NULL AND "passwordHash" IS NULL));
INSERT INTO access_resources (key,name,description,type,"isActive","sortOrder","createdAt","updatedAt") VALUES
('admin.users.lifecycle','Внешние пользователи — управление аккаунтами','VIEW: просмотр последствий; UPDATE: блокировка, отключение и восстановление; DELETE: необратимое удаление аккаунта с обезличиванием.','FEATURE',true,115,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;
