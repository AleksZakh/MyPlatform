INSERT INTO access_resources (key,name,description,type,"isActive","sortOrder","createdAt","updatedAt") VALUES
('lab.access-admin','Лабораторный контроль — управление доступом','Управление правами только на ресурсы lab.*. Не даёт системных полномочий.','FEATURE',true,699,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('diagnostic.access-admin','Диагностика — управление доступом','Управление правами только на ресурсы diagnostic.*. Не даёт системных полномочий.','FEATURE',true,699,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;
