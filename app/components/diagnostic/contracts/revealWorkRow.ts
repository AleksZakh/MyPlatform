import type { ObjectDirective } from 'vue';

// The row mounts after its table's async load. Scope the reveal to this row,
// including when two open dialogs contain the same assignment ID.
export const vRevealWorkRow: ObjectDirective<HTMLElement, 'focus'|'scroll'|false> = {
  mounted(el, {value}) {
    if (!value) return;
    if (value==='focus') el.focus({preventScroll:true});
    el.scrollIntoView({block:'nearest',inline:'nearest'});
  },
};
