CREATE TABLE "registration_request_groups" (
  "registrationRequestId" INTEGER NOT NULL,
  "groupId" INTEGER NOT NULL,
  "approved" BOOLEAN,
  CONSTRAINT "registration_request_groups_pkey" PRIMARY KEY ("registrationRequestId", "groupId"),
  CONSTRAINT "registration_request_groups_registrationRequestId_fkey" FOREIGN KEY ("registrationRequestId") REFERENCES "registration_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "registration_request_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "space_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "registration_request_groups_groupId_idx" ON "registration_request_groups"("groupId");
