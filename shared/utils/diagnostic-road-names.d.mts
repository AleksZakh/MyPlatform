export function cleanRoadName(raw: string): string;
export function roadKey(raw: string): string;
export function canonicalRoads(names: {name: string; count: number; referenceCount: number}[]): Map<string, string>;
