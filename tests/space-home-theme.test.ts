import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse, compileStyle } from '@vue/compiler-sfc';
import postcss from 'postcss';

function load(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('portal top bar uses variant B, with a darker dark-mode header and isolated high contrast', () => {
  const nav = load('app/components/navigate/topnav.vue');
  const dark = load('app/assets/css/portal-dark.css');
  assert.match(nav, /<nav class="space-topnav"/);
  assert.match(nav, /\.space-topnav\{[^}]*background:#c5dceb/);
  assert.match(nav, /html\.dark:not\(\[data-space-contrast="high"\]\).*background:#4d6880/);
  assert.match(dark, /nav\.space-topnav\s*\{\s*background-color:\s*#1f3245\s*!important/);
  assert.match(nav, /html\[data-space-contrast="high"\] \.space-topnav/);
  assert.doesNotMatch(dark, /\.layout-wrapper\s*>\s*footer\.space-topnav/);
});

test('department cards have distinct colored slots, icon tile and raised shadow in both themes', () => {
  const card = load('app/components/DepartmentCard.vue');
  const dark = load('app/assets/css/portal-dark.css');
  for (const slot of ['header', 'body', 'footer']) {
    assert.match(card, new RegExp(`department-card__${slot}`));
  }
  assert.match(card, /--department-card-header:\s*#e5edf5/);
  assert.match(card, /--department-card-footer:\s*#e9f0f7/);
  assert.match(card, /--department-card-icon:\s*#c9d7e4/);
  assert.match(card, /--department-card-shadow:/);
  assert.match(dark, /--department-card-header:\s*#293f53/);
  assert.match(dark, /--department-card-footer:\s*#2d455a/);
  assert.match(dark, /--department-card-icon:\s*#516c82/);
  assert.match(card, /data-space-contrast="high"/);
  assert.doesNotMatch(card, /hover:bg-zinc-50|dark:bg-gray-950/);
});

test('new Vue component styles and dark palette parse as CSS', () => {
  for (const path of ['app/components/navigate/topnav.vue', 'app/components/DepartmentCard.vue']) {
    const source = load(path);
    const { descriptor, errors } = parse(source, { filename: path });
    assert.deepEqual(errors, [], path);
    for (const block of descriptor.styles) {
      const result = compileStyle({ source: block.content, filename: path, id: 'test', scoped: !!block.scoped });
      assert.deepEqual(result.errors, [], path);
      if (path.endsWith('DepartmentCard.vue')) {
        assert.match(result.code, /html\[data-space-contrast="high"\] \.department-card\s*\{/);
        assert.doesNotMatch(result.code, /html\[data-space-contrast="high"\]\s*\{/);
      }
    }
  }
  assert.doesNotThrow(() => postcss.parse(load('app/assets/css/portal-dark.css')));
});
