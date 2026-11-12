import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateWorkResult,workResultInstructions} from '../../shared/utils/upts-work-results';
test('Expected result requires matching saved fields and document types',()=>{
 const expectedResult='№ КУВД + выписка',kuvdEntries=[{number:'КУВД-1',date:'2026-11-12'}];
 assert.equal(evaluateWorkResult({expectedResult,resultText:'произвольный текст'},['Отчёт','Чертёж']).complete,false);
 assert.equal(evaluateWorkResult({expectedResult,kuvdEntries},[]).complete,false);
 assert.equal(evaluateWorkResult({expectedResult},['Выписка из ЕГРН']).complete,false);
 assert.equal(evaluateWorkResult({expectedResult,kuvdEntries},['Выписка из ЕГРН']).complete,true);
 for(const [expected,type] of [['схема на КПТ','Схема'],['МП','Межевой план'],['акт обследования','Акт обследования'],['сформированный отчет','Отчёт'],['Подписанный ЭЦП комплект','Подписанный комплект'],['Подписанная XML-схема','XML-схема'],['Подписанный акт выполненных работ','Акт выполненных работ']]){
  assert.equal(evaluateWorkResult({expectedResult:expected,resultText:'примечание'},['Приостановка/отказ Росреестра','Иное']).complete,false,expected);
  assert.equal(evaluateWorkResult({expectedResult:expected},[type!]).complete,true,expected);
 }
 assert.equal(evaluateWorkResult({expectedResult:'№ распоряжения',resultText:'42-р'},[]).complete,true);
 assert.equal(evaluateWorkResult({expectedResult:'новое специальное условие'},['Схема']).complete,false);
 assert.equal(evaluateWorkResult({expectedResult:'результат измерений'},['Результаты измерений']).complete,true);
});

test('Completion instructions distinguish mandatory conditions from alternatives',()=>{
 assert.match(workResultInstructions('МП'),/прикрепите документ типа «Межевой план»/);
 assert(!workResultInstructions('МП').includes('укажите номер'));
 assert.match(workResultInstructions('схема на КПТ'),/«Схема» или «Чертёж»/);
 assert.match(workResultInstructions('№ КУВД + выписка'),/номер и дату КУВД и прикрепите документ типа «Выписка из ЕГРН»/);
 assert.match(workResultInstructions('№ распоряжения'),/укажите номер распоряжения/);
 assert.match(workResultInstructions('результат измерений'),/текстовое поле или прикрепите документ типа «Результаты измерений»/);
});
