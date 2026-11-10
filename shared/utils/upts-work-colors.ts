import { workKindName } from './upts-work-kinds';
import type { UptsWorkMeta } from '../types/upts-object';

/** Readable foregrounds on the customer-requested colour backgrounds, in both themes. */
const colours = {
  LAND_FORMATION: ['#fff3b0', '#40350b'],
  LAND_USE: ['#d9efc2', '#213b17'],
  LAND_DIVISION: ['#f7c9dc', '#522239'],
  LAND_TECH_ERROR: ['#e5e7eb', '#303640'],
  LAND_CHANGE: ['#7952a8', '#ffffff'],
  LAND_RIGHT: ['#c4e5f9', '#183a50'],
  LAND_REGISTER_ERROR: ['#525b66', '#ffffff'],
  OKS_DIVISION: ['#f7c9dc', '#522239'],
  OKS_TECH_ERROR: ['#e5e7eb', '#303640'],
  OKS_CHANGE: ['#7952a8', '#ffffff'],
  OKS_RIGHT: ['#c4e5f9', '#183a50'],
  OKS_REGISTER_ERROR: ['#525b66', '#ffffff'],
} as const;
export function uptsWorkColours(meta?: Pick<UptsWorkMeta, 'workKindKey' | 'workKindKeys'> | null) {
  const keys = [...new Set([...(meta?.workKindKeys || []), ...(meta?.workKindKey ? [meta.workKindKey] : [])])];
  return keys.flatMap(key => {
    const pair = colours[key as keyof typeof colours];
    return pair ? [{key, name: workKindName(key), background: pair[0], foreground: pair[1]}] : [];
  });
}
