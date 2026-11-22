import test from 'node:test';
import assert from 'node:assert/strict';
import {workSourcePeriod,tripSourcePeriod} from '../server/services/diagnostic/plans-source-period.ts';

const from='2026-11-09',to='2026-11-15';
const dates=[null,'2026-11-08',from,'2026-11-12',to,'2026-11-16'];
function accepts(row,where){
  if(where.OR)return where.OR.some(branch=>accepts(row,branch));
  return Object.entries(where).every(([field,rule])=>{
    const value=row[field];
    if(rule===null)return value===null;
    if('not' in rule)return value!==rule.not;
    if(!value)return false;
    const date=new Date(value+'T00:00:00Z');
    return (!rule.lte||date<=rule.lte)&&(!rule.gte||date>=rule.gte);
  });
}
const interval=(a,b)=>[a??b,b??a];
const overlaps=([a,b])=>!!a&&a<=to&&b>=from;
test('Отбор работ, включая неполные даты и разные назначения в плане и факте',()=>{
  for(const mode of ['all','period','worklist']){
    const query=workSourcePeriod({from,to,mode});
    for(const a of dates)for(const b of dates)for(const c of dates)for(const d of dates){
      if((a&&b&&a>b)||(c&&d&&c>d))continue;
      for(const status of ['scheduled','completed','overdue','']){
        const source={status,planStart:a,planFinish:b,factStart:c,factFinish:d};
        for(const [plan,fact] of [[true,true],[true,false],[false,true]]){
          const p=plan?interval(a,b):[null,null],f=fact?interval(c,d):[null,null];
          const expected=mode==='all'||(mode==='period'?overlaps(p)||overlaps(f):status!=='completed'||p[1]>=from||overlaps(f));
          if(expected)assert.ok(accepts(source,query));
          if(plan&&fact)assert.equal(accepts(source,query),expected);
        }
      }
    }
  }
});
test('Завершённые и открытые поездки до, в течение и после недели',()=>{
  for(const mode of ['all','period','worklist']){
    const where=tripSourcePeriod({from,to,mode});
    for(const start of dates.slice(1))for(const finish of dates.slice(1)){
      if(finish<start)continue;
      for(const status of ['COMPLETED','PLANNED']){
        const expected=mode==='all'||(mode==='period'?overlaps([start,finish]):status!=='COMPLETED'||finish>=from);
        assert.equal(accepts({start,finish,status},where),expected);
      }
    }
  }
});
