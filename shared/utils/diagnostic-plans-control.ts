/** Two assignments visible in the legacy list for Комов С.Н. */
export function komovControls(name: string) {
  if (!/^комов\s+(?:сергей\s+николаевич|с\.?\s*н\.?)$/iu.test(name.trim())) return []
  return [['2026-11-16','2026-11-20'], ['2026-11-23','2026-11-27']].map(([start, finish]) => ({
    start: start!, finish: finish!, assigned: 0, searched: 0, accepted: 0
  }))
}
type Control = ReturnType<typeof komovControls>[number]
export function recordControl(controls: Control[], row: {
  contractNumber: string; name: string; planStart: string|null; planFinish: string|null; planHours: string|number|null
}, stage: 'assigned'|'searched'|'accepted') {
  if (!controls.length || row.contractNumber.trim() !== 'ДСиР-2025-478' ||
      row.name.trim().toLocaleLowerCase('ru') !== 'аис иссо-н. внесение данных' || Number(row.planHours) !== 2) return
  const control = controls.find(c => c.start === row.planStart && c.finish === row.planFinish)
  if (control) control[stage]++
}
