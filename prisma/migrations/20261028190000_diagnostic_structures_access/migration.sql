-- Register a separate resource without granting or changing existing permissions.
INSERT INTO access_resources (key,name,description,type,"isActive","sortOrder","createdAt","updatedAt")
VALUES ('diagnostic.structures','Диагностика — сооружения','Просмотр справочника сооружений и сведений, перенесённых из старой базы.','TABLE',true,620,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;
