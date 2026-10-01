// frontend/src/types/index.ts

export type UserRole = 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  authProvider: string;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  createdAt: string;
  itemCount?: number;
  children?: Location[];
}

export interface Photo {
  id: string;
  itemId: string;
  path: string;
  caption?: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface Appraisal {
  id: string;
  itemId: string;
  value: number;
  currency: string;
  appraisalDate?: string | null;
  appraiser?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface Sale {
  id: string;
  itemId: string;
  platform: string;
  amount: number;
  currency: string;
  soldAt?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface Item {
  id: string;
  inventoryNumber: string | null;
  name: string;
  category?: string | null;
  era?: string | null;
  origin?: string | null;
  material?: string | null;
  dimensions?: string | null;
  condition?: string | null;
  description?: string | null;
  context?: string | null;
  author?: string | null;
  publisher?: string | null;
  publicationYear?: string | null;
  edition?: string | null;
  language?: string | null;
  weight?: string | null;
  ebayTitle?: string | null;
  ebayCategory?: string | null;
  ebayCondition?: string | null;
  ebayConditionNote?: string | null;
  startPrice?: number | null;
  buyItNowPrice?: number | null;
  acquisitionDate?: string | null;
  acquisitionNote?: string | null;
  searchText?: string | null;
  locationId?: string | null;
  createdById?: string | null;
  location?: Location | null;
  createdBy?: User | null;
  photos?: Photo[];
  appraisals?: Appraisal[];
  sales?: Sale[];
  createdAt: string;
  updatedAt: string;
}

export interface ItemDetailsAnalysis {
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
}

export interface ItemFilterParams {
  q?: string;
  category?: string;
  condition?: string;
  era?: string;
  locationId?: string;
}

export interface AuthProvidersResponse {
  authentik: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string | null;
}

export interface Base64Image {
  base64: string;
  mimeType: string;
}

export interface LocationCreateData {
  name: string;
  description?: string | null;
  parentId?: string | null;
}

export interface LocationUpdateData {
  name?: string;
  description?: string | null;
  parentId?: string | null;
}

export interface AppraisalCreateData {
  value: number;
  currency?: string;
  appraisalDate?: string | null;
  appraiser?: string | null;
  note?: string | null;
}

export interface SaleCreateData {
  platform: string;
  amount: number;
  currency?: string;
  soldAt?: string | null;
  note?: string | null;
}

export type ItemCreateData = Partial<Item> & { name: string };
export type ItemUpdateData = Partial<Item>;

// Standard domain constants matching backend
export const CATEGORIES = [
  "Möbel",
  "Gemälde",
  "Skulptur",
  "Keramik",
  "Glas",
  "Münze",
  "Schmuck",
  "Textil",
  "Uhr",
  "Silber",
  "Buch",
  "Sonstiges",
] as const;

export const ERAS = [
  "Antike",
  "Ägypten",
  "Griechisch",
  "Römisch",
  "Mittelalter",
  "Renaissance",
  "Barock",
  "Rokoko",
  "Klassizismus",
  "Biedermeier",
  "Gründerzeit",
  "Jugendstil",
  "Art déco",
  "Moderne",
  "Sonstige",
] as const;

export const CONDITIONS = [
  "Sehr gut",
  "Gut",
  "Befriedigend",
  "Schlecht",
  "Restaurierungsbedürftig",
] as const;

export const EBAY_CONDITIONS = [
  "Neu",
  "Neu: Sonstige",
  "Gebraucht",
  "Sehr gut",
  "Gut",
  "Akzeptabel",
  "Als Ersatzteil / defekt",
] as const;

export const CURRENCIES = [
  "EUR",
  "USD",
  "CHF",
  "GBP",
] as const;
