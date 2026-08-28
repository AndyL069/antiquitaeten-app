export type ItemDetails = {
  name: string;
  category: string;
  era: string;
  origin: string;
  material: string;
  dimensions: string;
  condition: string;
  description: string;
  context: string;
  author: string;
  publisher: string;
  publicationYear: string;
  edition: string;
  language: string;
  weight: string;
  ebayTitle: string;
  ebayCategory: string;
  ebayCondition: string;
  ebayConditionNote: string;
  startPrice: number;
  buyItNowPrice: number;
  estimatedValue: number;
  valueNote: string;
};

export type ItemInput = {
  inventoryNumber: string;
  name: string;
  category: string;
  era: string;
  origin: string;
  material: string;
  dimensions: string;
  condition: string;
  description: string;
  context: string;
  author: string;
  publisher: string;
  publicationYear: string;
  edition: string;
  language: string;
  weight: string;
  ebayTitle: string;
  ebayCategory: string;
  ebayCondition: string;
  ebayConditionNote: string;
  startPrice: string;
  buyItNowPrice: string;
  estimatedValue: string;
  valueNote: string;
  acquisitionDate: string;
  locationId: string;
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseItemInput(body: unknown): ItemInput | { error: string } {
  const b = body as Record<string, unknown>;
  if (!b || typeof b !== "object") return { error: "Ungültiger Body" };

  const name = str(b.name);
  if (!name) return { error: "Name fehlt" };

  return {
    inventoryNumber: str(b.inventoryNumber),
    name,
    category: str(b.category),
    era: str(b.era),
    origin: str(b.origin),
    material: str(b.material),
    dimensions: str(b.dimensions),
    condition: str(b.condition),
    description: str(b.description),
    context: str(b.context),
    author: str(b.author),
    publisher: str(b.publisher),
    publicationYear: str(b.publicationYear),
    edition: str(b.edition),
    language: str(b.language),
    weight: str(b.weight),
    ebayTitle: str(b.ebayTitle),
    ebayCategory: str(b.ebayCategory),
    ebayCondition: str(b.ebayCondition),
    ebayConditionNote: str(b.ebayConditionNote),
    startPrice: str(b.startPrice),
    buyItNowPrice: str(b.buyItNowPrice),
    estimatedValue: str(b.estimatedValue),
    valueNote: str(b.valueNote),
    acquisitionDate: str(b.acquisitionDate),
    locationId: str(b.locationId),
  };
}

export function buildSearchText(data: ItemInput): string {
  return [
    data.inventoryNumber,
    data.name,
    data.category,
    data.era,
    data.origin,
    data.material,
    data.description,
    data.context,
    data.author,
    data.publisher,
    data.publicationYear,
    data.ebayTitle,
  ]
    .filter(Boolean)
    .join(" \u0001 ");
}

export function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}
