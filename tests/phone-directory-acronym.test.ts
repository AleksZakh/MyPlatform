import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAcronym, departmentAcronym } from '../shared/utils/phone-directory-acronym';

test('createAcronym follows the exact per-word initials rule supplied by the user', () => {
  const cases: Array<[string, string]> = [
    ['Московский государственный университет', 'МГУ'],
    ['  донской   государственный технический университет ', 'ДГТУ'],
    ['Учебный центр', 'УЦ'],
    ['отдел образовательных программ', 'ООП'],
    ['отдел образовательных проектов', 'ООП'],
    ['отдел по работе с персоналом', 'ОПРСП'],
    ['отдел развития и сопровождения', 'ОРиС'],
    ['Отдел кадров и делопроизводства', 'ОКиД'],
    ['Отдел охраны труда и промышленной безопасности', 'ООТиПБ'],
    ['  учебный\tцентр\nотдел\u00a0образовательных   программ ', 'УЦООП'],
    ['Бухгалтерия', 'Б'],
    ['бухгалтерия', 'Б'],
    ['АХО', 'А'],
    ['Административно-хозяйственный отдел', 'АО'],
    ['Отдел информационно-технического обеспечения', 'ОИО'],
    ['', ''],
    [' \t\n\u00a0 ', ''],
  ];
  for (const [phrase, expected] of cases) {
    assert.equal(createAcronym(phrase), expected, JSON.stringify(phrase));
  }
});

test('comma-separated department parts form separate acronyms joined by exactly one space', () => {
  const cases: Array<[string, string]> = [
    ['Учебный центр, отдел образовательных программ', 'УЦ ООП'],
    ['Учебный центр, отдел образовательных проектов', 'УЦ ООП'],
    ['учебный центр, отдел образовательных проектов', 'УЦ ООП'],
    ['  Учебный   центр ,\t отдел\u00a0образовательных программ  ', 'УЦ ООП'],
    [',,Учебный центр,,,отдел образовательных программ,,', 'УЦ ООП'],
    ['Управление обеспечения, Административно хозяйственный отдел, отдел кадров', 'УО АХО ОК'],
    ['Отдел по работе с персоналом, управление обеспечения', 'ОПРСП УО'],
    ['Бухгалтерия, отдел кадров', 'Б ОК'],
    ['Административно-хозяйственный отдел, управление обеспечения', 'АО УО'],
    ['Учебный центр; отдел образовательных программ', 'УЦООП'],
  ];
  for (const [phrase, expected] of cases) {
    assert.equal(departmentAcronym(phrase), expected, JSON.stringify(phrase));
  }
});

test('missing and whitespace-only departments display an em dash', () => {
  for (const phrase of [undefined, null, '', '   ', '\t\n\u00a0', ', ,,, ']) {
    assert.equal(departmentAcronym(phrase), '—');
  }
});

test('eight significant words still become an acronym, conjunction и is lowercase and not counted', () => {
  assert.equal(departmentAcronym('один два три четыре пять шесть семь восемь'), 'ОДТЧПШСВ');
  assert.equal(departmentAcronym('один два три и четыре пять шесть семь восемь'), 'ОДТиЧПШСВ');
  assert.equal(departmentAcronym('отдел кадров, и управление обеспечения'), 'ОК иУО');
});

test('more than eight significant words show first four, preserving internal и', () => {
  assert.equal(
    departmentAcronym('один два три четыре пять шесть семь восемь девять'),
    'один два три четыре',
  );
  assert.equal(
    departmentAcronym('Отдел развития и поддержки управления контроля качества проектов компании региона'),
    'Отдел развития и поддержки управления',
  );
  assert.equal(
    departmentAcronym('Учебный центр, отдел образовательных программ регионального и профессионального развития компании'),
    'Учебный центр, отдел образовательных',
  );
  assert.equal(
    departmentAcronym('Один два И три четыре пять шесть семь восемь девять'),
    'Один два и три четыре',
  );
});

// Static source wiring checks, not a browser/render test.
test('phone-directory table applies the helper to every contact and retains the full sidebar value', () => {
  const source = readFileSync(new URL('../app/pages/ad/browser.vue', import.meta.url), 'utf8');
  assert.match(source, /import\s*\{[^}]*departmentAcronym[^}]*\}\s*from\s*['"][^'"]*phone-directory-acronym['"]/);
  assert.match(source, /v-for="\(contact, i\) in pageRows"/);
  assert.match(source, /\{\{\s*departmentAcronym\(contact\.department\)\s*\}\}/);
  assert.match(source, /class="department-full">\{\{\s*selected\.department\s*\|\|/);
  assert.doesNotMatch(source, /departmentAliases|function shortDepartment/);
});
