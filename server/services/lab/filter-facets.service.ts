import type { Prisma, PrismaClient } from '@prisma/client'
import { buildRegistryFilter } from '../../utils/incoming-control-filter'
import { normalizeLabFilters, type LabFacetKey } from '../../../shared/utils/lab-filter-values'

/** Each facet excludes its own predicate so a second material can still be selected. */
export async function getLabFilterFacets(db: Prisma.TransactionClient | PrismaClient, input: unknown) {
  const filters = normalizeLabFilters(input)
  const whereFor = (key?: LabFacetKey): Prisma.SamplingTestWhereInput =>
    buildRegistryFilter({ ...filters, ...(key ? { [key]: null } : {}) })
  const names = { select: { name: true }, orderBy: { name: 'asc' as const } }
  const [plp, objects, places, inspectors, materials, manufacturers, total] = await Promise.all([
    db.plp.findMany({ ...names, where: { deletedAt: null, samplingTests: { some: whereFor('plp') } } }),
    db.testObject.findMany({ ...names, where: { deletedAt: null, locations: { some: {
      deletedAt: null, samplingTests: { some: whereFor('objName') },
    } } } }),
    db.testLocation.findMany({ ...names, where: { deletedAt: null, testObject: { deletedAt: null }, samplingTests: { some: whereFor('sPlace') } } }),
    db.inspector.findMany({ ...names, where: { deletedAt: null, samplingTests: { some: whereFor('sProvaider') } } }),
    db.material.findMany({ ...names, where: { deletedAt: null, receipts: { some: {
      deletedAt: null, samplingTest: { is: whereFor('materialName') },
    } } } }),
    db.manufacturer.findMany({ ...names, where: { deletedAt: null, receipts: { some: {
      deletedAt: null, samplingTest: { is: whereFor('manufacturer') },
    } } } }),
    db.samplingTest.count({ where: whereFor() }),
  ])
  const uniqueNames = (rows: { name: string }[]) => [...new Set(rows.map(row => row.name))]
  return { total, options: {
    plp: uniqueNames(plp), objName: uniqueNames(objects), sPlace: uniqueNames(places),
    sProvaider: uniqueNames(inspectors), materialName: uniqueNames(materials), manufacturer: uniqueNames(manufacturers),
  } }
}
