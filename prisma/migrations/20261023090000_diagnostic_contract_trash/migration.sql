
INSERT INTO access_resources (key,name,description,type,"isActive","sortOrder","createdAt","updatedAt")
VALUES ('diagnostic.contracts.trash','Диагностика — администрирование корзины','Просмотр корзины договоров только для участников ОДИС. Для восстановления дополнительно требуется DELETE на договоры.','FEATURE',true,601,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;
