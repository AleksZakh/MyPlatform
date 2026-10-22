
import type {Prisma} from '@prisma/client';
export const auditModules:Record<string,Prisma.AuditLogWhereInput>={
 diagnostic:{OR:[{resourceKey:{startsWith:'diagnostic.'}},{entityType:{startsWith:'Diagnostic'}}]},
 lab:{OR:[{resourceKey:{startsWith:'lab.'}},{entityType:{in:['SamplingTest','ReceiptMaterial','TestProtocol','TestObject','TestLocation','Manufacturer','Material']}}]},
 library:{OR:[{resourceKey:{startsWith:'library.'}},{entityType:{startsWith:'Library'}}]},
 projects:{OR:[{resourceKey:{startsWith:'projects.'}},{entityType:{startsWith:'Work'}}]},
 chat:{OR:[{resourceKey:{startsWith:'chat.'}},{entityType:{startsWith:'Chat'}}]}
};
