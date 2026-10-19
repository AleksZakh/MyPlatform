-- CreateTable
CREATE TABLE "work_projects" (
    "id" SERIAL NOT NULL,
    "clientKey" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" VARCHAR(7) NOT NULL DEFAULT '#2563eb',
    "scope" VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
    "ownerId" INTEGER NOT NULL,
    "departmentId" INTEGER,
    "startDate" DATE,
    "dueDate" DATE,
    "archivedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_project_members" (
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_project_members_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "work_tasks" (
    "id" SERIAL NOT NULL,
    "clientKey" UUID NOT NULL,
    "title" VARCHAR(250) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" VARCHAR(20) NOT NULL DEFAULT 'TASK',
    "status" VARCHAR(20) NOT NULL DEFAULT 'TODO',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
    "creatorId" INTEGER NOT NULL,
    "assigneeId" INTEGER,
    "departmentId" INTEGER,
    "projectId" INTEGER,
    "plannedDate" DATE,
    "startDate" DATE,
    "dueDate" DATE,
    "blockedReason" VARCHAR(1000) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_task_participants" (
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "work_task_participants_pkey" PRIMARY KEY ("taskId","userId")
);

-- CreateTable
CREATE TABLE "work_task_comments" (
    "id" SERIAL NOT NULL,
    "clientKey" UUID NOT NULL,
    "taskId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" VARCHAR(5000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_projects_clientKey_key" ON "work_projects"("clientKey");

-- CreateIndex
CREATE INDEX "work_projects_departmentId_archivedAt_idx" ON "work_projects"("departmentId", "archivedAt");

-- CreateIndex
CREATE INDEX "work_projects_ownerId_idx" ON "work_projects"("ownerId");

-- CreateIndex
CREATE INDEX "work_project_members_userId_idx" ON "work_project_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "work_tasks_clientKey_key" ON "work_tasks"("clientKey");

-- CreateIndex
CREATE INDEX "work_tasks_assigneeId_deletedAt_plannedDate_idx" ON "work_tasks"("assigneeId", "deletedAt", "plannedDate");

-- CreateIndex
CREATE INDEX "work_tasks_creatorId_deletedAt_idx" ON "work_tasks"("creatorId", "deletedAt");

-- CreateIndex
CREATE INDEX "work_tasks_projectId_deletedAt_status_idx" ON "work_tasks"("projectId", "deletedAt", "status");

-- CreateIndex
CREATE INDEX "work_tasks_departmentId_visibility_deletedAt_idx" ON "work_tasks"("departmentId", "visibility", "deletedAt");

-- CreateIndex
CREATE INDEX "work_task_participants_userId_idx" ON "work_task_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "work_task_comments_clientKey_key" ON "work_task_comments"("clientKey");

-- CreateIndex
CREATE INDEX "work_task_comments_taskId_id_idx" ON "work_task_comments"("taskId", "id");

-- AddForeignKey
ALTER TABLE "work_projects" ADD CONSTRAINT "work_projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_projects" ADD CONSTRAINT "work_projects_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_project_members" ADD CONSTRAINT "work_project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "work_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_project_members" ADD CONSTRAINT "work_project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_tasks" ADD CONSTRAINT "work_tasks_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_tasks" ADD CONSTRAINT "work_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_tasks" ADD CONSTRAINT "work_tasks_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_tasks" ADD CONSTRAINT "work_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "work_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_task_participants" ADD CONSTRAINT "work_task_participants_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "work_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_task_participants" ADD CONSTRAINT "work_task_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_task_comments" ADD CONSTRAINT "work_task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "work_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_task_comments" ADD CONSTRAINT "work_task_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE work_projects ADD CONSTRAINT work_project_scope CHECK (scope IN ('PRIVATE','TEAM','DEPARTMENT'));
ALTER TABLE work_projects ADD CONSTRAINT work_project_dates CHECK ("startDate" IS NULL OR "dueDate" IS NULL OR "startDate" <= "dueDate");
ALTER TABLE work_projects ADD CONSTRAINT work_project_department CHECK ((scope <> 'PRIVATE' OR "departmentId" IS NULL) AND (scope <> 'DEPARTMENT' OR "departmentId" IS NOT NULL));
ALTER TABLE work_project_members ADD CONSTRAINT work_member_role CHECK (role IN ('MANAGER','CURATOR','MEMBER','OBSERVER'));
ALTER TABLE work_tasks ADD CONSTRAINT work_task_status CHECK (status IN ('TODO','IN_PROGRESS','REVIEW','DONE'));
ALTER TABLE work_tasks ADD CONSTRAINT work_task_kind CHECK (kind IN ('TASK','BUG','IMPROVEMENT','RESEARCH','MILESTONE'));
ALTER TABLE work_tasks ADD CONSTRAINT work_task_priority CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT'));
ALTER TABLE work_tasks ADD CONSTRAINT work_task_visibility CHECK (visibility IN ('PRIVATE','PARTICIPANTS','DEPARTMENT','PROJECT'));
ALTER TABLE work_tasks ADD CONSTRAINT work_task_project CHECK (("projectId" IS NOT NULL) = (visibility = 'PROJECT'));
ALTER TABLE work_tasks ADD CONSTRAINT work_task_department CHECK ((visibility = 'DEPARTMENT') = ("departmentId" IS NOT NULL));
ALTER TABLE work_tasks ADD CONSTRAINT work_task_dates CHECK ("startDate" IS NULL OR "dueDate" IS NULL OR "startDate" <= "dueDate");
INSERT INTO access_resources (key,name,description,type,"isActive","sortOrder","createdAt","updatedAt")
VALUES ('projects.shared','Задачи и проекты — совместная работа','CREATE: общие проекты своего отдела. UPDATE: самостоятельные совместные задачи и поручения сотрудникам. Личные задачи доступны всем активным пользователям. Доступ к содержимому проектов определяется участием и видимостью.','FEATURE',true,510,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;
