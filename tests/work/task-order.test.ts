import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { compareWorkTasks } from '../../shared/utils/work-order';
import { orderedTaskIds } from '../../server/services/work/task-order';

const task = (id: number, startDate: string | null, dueDate: string | null, plannedDate: string | null = null) =>
  ({ id, startDate, dueDate, plannedDate });
test('Timeline follows work dates rather than reverse creation order', () => {
  const rows = [task(1, '2026-10-20', '2026-10-21'), task(3, '2026-10-22', '2026-10-23'), task(2, '2026-10-21', '2026-10-22')];
  assert.deepEqual([...rows].sort((a,b)=>compareWorkTasks(a,b,'timeline')).map(t=>t.id), [1,2,3]);
  const missing = [task(8,null,null), task(4,null,'2026-10-19'), task(9,'2026-10-20','2026-10-21'), task(7,'2026-10-20','2026-10-21')];
  assert.deepEqual(missing.sort((a,b)=>compareWorkTasks(a,b,'timeline')).map(t=>t.id), [4,7,9,8]);
  assert.ok(compareWorkTasks(task(1,'2026-12-31',null),task(2,'2027-01-01',null)) < 0);
  assert.ok(compareWorkTasks(task(1,'2026-11-01',null,'2026-10-18'),task(2,'2026-10-20',null)) < 0);
});

test('Global chronology across pages, fallback dates and access filters', async () => {
  const url=process.env.WORK_TEST_DATABASE_URL || '';
  if(!url || !new URL(url).pathname.endsWith('_work_test')) throw new Error('Disposable *_work_test database required');
  const db=new PrismaClient({datasources:{db:{url}}});
  const login='task-order-'+randomUUID();
  let userId: number | undefined;
  try {
    const user=await db.user.create({data:{login,authType:'DOMAIN',status:'ACTIVE'}}); userId=user.id;
    const sample=[];
    // Reverse creation order; mix the three fallback streams.
    for(let n=220;n>=1;n--) {
      const day=new Date(Date.UTC(2026,0,n));
      const row=await db.workTask.create({data:{clientKey:randomUUID(),title:'Order '+n,creatorId:user.id,
        plannedDate:n%3===0?day:null,startDate:n%3===1?day:null,dueDate:n%3===2?day:null}});
      sample.unshift(row.id);
    }
    const undated=await db.workTask.create({data:{clientKey:randomUUID(),title:'No date',creatorId:user.id}});
    const deleted=await db.workTask.create({data:{clientKey:randomUUID(),title:'Hidden',creatorId:user.id,startDate:new Date('2000-01-01'),deletedAt:new Date()}});
    sample.push(undated.id);
    const where={creatorId:user.id,deletedAt:null};
    for(const mode of ['schedule','timeline'] as const) {
      const actual=[];
      for(let page=1;page<=3;page++) actual.push(...await orderedTaskIds(db,where,mode,page));
      assert.deepEqual(actual,sample); assert.ok(!actual.includes(deleted.id));
      assert.deepEqual(await orderedTaskIds(db,{creatorId:-1},mode,1),[]);
    }
  } finally {
    if(userId) { await db.workTask.deleteMany({where:{creatorId:userId}}); await db.user.delete({where:{id:userId}}); }
    await db.$disconnect();
  }
});
