import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
function createRemoteCollection(fetchEndpoint) {
  let _cache
  return async () => {
    if (_cache)
      return _cache
    const res = await fetch(fetchEndpoint).then(r => r.json())
    _cache = res
    return res
  }
}

export const collections = {
  'gravity-ui': () => require('@iconify-json/gravity-ui/icons.json'),
  'heroicons': () => require('@iconify-json/heroicons/icons.json'),
  'line-md': () => require('@iconify-json/line-md/icons.json'),
  'lucide': () => require('@iconify-json/lucide/icons.json'),
  'marketeq': () => require('@iconify-json/marketeq/icons.json'),
  'material-symbols': () => require('@iconify-json/material-symbols/icons.json'),
  'ph': () => require('@iconify-json/ph/icons.json'),
  'simple-icons': () => require('@iconify-json/simple-icons/icons.json'),
  'solar': () => require('@iconify-json/solar/icons.json'),
  'streamline-cyber-color': () => require('@iconify-json/streamline-cyber-color/icons.json'),
  'streamline-flex-color': () => require('@iconify-json/streamline-flex-color/icons.json'),
  'streamline-freehand-color': () => require('@iconify-json/streamline-freehand-color/icons.json'),
  'streamline-ultimate-color': () => require('@iconify-json/streamline-ultimate-color/icons.json'),
  'system-uicons': () => require('@iconify-json/system-uicons/icons.json'),
  'teenyicons': () => require('@iconify-json/teenyicons/icons.json'),
  'vscode-icons': () => require('@iconify-json/vscode-icons/icons.json'),
}