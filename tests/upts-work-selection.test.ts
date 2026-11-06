import test from 'node:test';
import assert from 'node:assert/strict';
import {uptsWorkCandidates} from '../shared/utils/upts-work-selection';
import type {UptsLibrary} from '../shared/types/upts-library';

test('work-kind union keeps shared identity, ordering and every selected source',()=>{
  const work=(id:number,active=true,contractType='LAND')=>({id,name:'Работа '+id,active,contractType});
  const template=(key:string,ids:number[],active=true)=>({active,contractType:'LAND',workKindKey:key,items:ids.map(id=>({workId:id,work:work(id)}))});
  const library={works:[],templates:[template('LAND_DIVISION',[1,2]),template('LAND_CHANGE',[1,3]),template('LAND_CHANGE',[4],false)]} as unknown as UptsLibrary;
  const rows=uptsWorkCandidates(library,'LAND',['LAND_CHANGE','LAND_DIVISION']);
  assert.deepEqual(rows.map(r=>r.work.id),[1,2,3]);
  assert.deepEqual(rows[0]!.kindKeys,['LAND_DIVISION','LAND_CHANGE']);
  assert.deepEqual(uptsWorkCandidates(library,'LAND',['LAND_CHANGE']).map(r=>r.work.id),[1,3]);
  assert.deepEqual(uptsWorkCandidates(library,'OKS',['LAND_DIVISION']),[]);
  assert.deepEqual(uptsWorkCandidates(null,'LAND',['LAND_DIVISION']),[]);
  library.templates[0]!.items[0]!.work.active=false;
  library.templates[0]!.items[1]!.work.contractType='OKS';
  assert.deepEqual(uptsWorkCandidates(library,'LAND',['LAND_DIVISION']),[]);
});
