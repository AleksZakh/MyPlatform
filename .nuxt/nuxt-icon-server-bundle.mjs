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
  'gravity-ui': () => import('@iconify-json/gravity-ui/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'heroicons': () => import('@iconify-json/heroicons/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'line-md': () => import('@iconify-json/line-md/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'lucide': () => import('@iconify-json/lucide/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'marketeq': () => import('@iconify-json/marketeq/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'material-symbols': () => import('@iconify-json/material-symbols/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'ph': () => import('@iconify-json/ph/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'simple-icons': () => import('@iconify-json/simple-icons/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'solar': () => import('@iconify-json/solar/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'streamline-cyber-color': () => import('@iconify-json/streamline-cyber-color/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'streamline-flex-color': () => import('@iconify-json/streamline-flex-color/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'streamline-freehand-color': () => import('@iconify-json/streamline-freehand-color/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'streamline-ultimate': () => import('@iconify-json/streamline-ultimate/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'streamline-ultimate-color': () => import('@iconify-json/streamline-ultimate-color/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'system-uicons': () => import('@iconify-json/system-uicons/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'tabler': () => import('@iconify-json/tabler/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'teenyicons': () => import('@iconify-json/teenyicons/icons.json', { with: { type: 'json' } }).then(m => m.default),
  'vscode-icons': () => import('@iconify-json/vscode-icons/icons.json', { with: { type: 'json' } }).then(m => m.default),
}