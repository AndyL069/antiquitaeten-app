export type LocationNode = {
  id: string;
  name: string;
  parentId: string | null;
  description?: string | null;
};

export type LocationOption = { id: string; label: string; depth: number };

export function locationOptions(locations: LocationNode[]): LocationOption[] {
  const byParent = new Map<string | null, LocationNode[]>();
  for (const l of locations) {
    const arr = byParent.get(l.parentId) ?? [];
    arr.push(l);
    byParent.set(l.parentId, arr);
  }

  const result: LocationOption[] = [];
  const visited = new Set<string>();

  function walk(parentId: string | null, depth: number) {
    const children = (byParent.get(parentId) ?? []).sort((a, b) => a.name.localeCompare(b.name, "de"));
    for (const c of children) {
      if (visited.has(c.id)) continue;
      visited.add(c.id);
      result.push({ id: c.id, label: c.name, depth });
      walk(c.id, depth + 1);
    }
  }

  walk(null, 0);
  return result;
}
