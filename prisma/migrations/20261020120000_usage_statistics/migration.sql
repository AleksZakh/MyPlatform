CREATE TABLE usage_events (
 id VARCHAR(150) PRIMARY KEY,
 "actorId" INTEGER NOT NULL,
 "recipientId" INTEGER,
 kind VARCHAR(40) NOT NULL,
 target VARCHAR(200) NOT NULL,
 source VARCHAR(10) NOT NULL,
 "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT usage_source_check CHECK (source IN ('CLIENT','SERVER'))
);
CREATE INDEX "usage_events_occurredAt_idx" ON usage_events("occurredAt");
CREATE INDEX "usage_events_actorId_occurredAt_idx" ON usage_events("actorId","occurredAt");
CREATE INDEX "usage_events_kind_occurredAt_idx" ON usage_events(kind,"occurredAt");
INSERT INTO access_resources (key,name,description,type,"isActive","sortOrder","createdAt","updatedAt")
VALUES ('system.usage-statistics','Статистика использования Space','Просмотр статистики и персональной истории действий сотрудников. Не даёт доступа к содержимому документов и переписки.','FEATURE',true,530,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;
