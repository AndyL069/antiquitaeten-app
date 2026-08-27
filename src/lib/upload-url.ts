export function uploadUrl(rel: string | null | undefined): string | null {
  if (!rel) return null;
  return `/api/uploads/${rel.replace(/\\/g, "/")}`;
}
