import type {PlansPeriod} from '../../../shared/utils/diagnostic-plans-period';

// Source rows can contain assignments for different people in plan and fact.
// Final filtering must still run on the projected employee row.
export function workSourcePeriod(period: PlansPeriod) {
  if (period.mode === 'all') return {};
  const from = new Date(period.from + 'T00:00:00Z');
  const to = new Date(period.to + 'T00:00:00Z');
  const within = {gte: from, lte: to};
  const fact = [
    {factStart: {lte: to}, factFinish: {gte: from}},
    {factStart: within, factFinish: null},
    {factStart: null, factFinish: within},
  ];
  if (period.mode === 'period') {
    return {OR: [
      {planStart: {lte: to}, planFinish: {gte: from}},
      {planStart: within, planFinish: null},
      {planStart: null, planFinish: within},
      ...fact,
    ]};
  }
  // Only discard old rows with the canonical closed status here. Other legacy
  // spellings pass through to diagnosticWorkStatus and matchesPlansPeriod.
  return {OR: [
    {status: {not: 'completed'}},
    {planFinish: {gte: from}},
    {planStart: {gte: from}, planFinish: null},
    ...fact,
  ]};
}

export function tripSourcePeriod(period: PlansPeriod) {
  if (period.mode === 'all') return {};
  const from = new Date(period.from + 'T00:00:00Z');
  if (period.mode === 'worklist') {
    return {OR: [{status: {not: 'COMPLETED' as const}}, {finish: {gte: from}}]};
  }
  return {start: {lte: new Date(period.to + 'T00:00:00Z')}, finish: {gte: from}};
}
