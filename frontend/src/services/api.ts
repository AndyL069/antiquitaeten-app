// frontend/src/services/api.ts
import type {
  User,
  UserRole,
  Location,
  Photo,
  Appraisal,
  Sale,
  Item,
  ItemDetailsAnalysis,
  ItemFilterParams,
  AuthProvidersResponse,
  LoginCredentials,
  RegisterData,
  Base64Image,
  LocationCreateData,
  LocationUpdateData,
  AppraisalCreateData,
  SaleCreateData,
} from '../types';

/**
 * Core HTTP helper sending credentials: "include" on every call
 * and extracting FastAPI error details on failure.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : endpoint;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!isFormData && options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Fehler ${response.status}: ${response.statusText}`;
    try {
      const data = await response.json();
      if (typeof data?.detail === 'string') {
        errorDetail = data.detail;
      } else if (Array.isArray(data?.detail)) {
        errorDetail = data.detail
          .map((item: { msg?: string }) => item.msg || JSON.stringify(item))
          .join(', ');
      } else if (data?.message) {
        errorDetail = data.message;
      }
    } catch {
      // response wasn't JSON
    }
    throw new Error(errorDetail);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return {} as T;
}

// ==========================================
// Authentication APIs
// ==========================================

export async function login(
  emailOrData: string | LoginCredentials,
  password?: string
): Promise<User> {
  const payload: LoginCredentials =
    typeof emailOrData === 'string'
      ? { email: emailOrData, password: password || '' }
      : emailOrData;

  return await request<User>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function register(
  emailOrData: string | RegisterData,
  nameOrPassword?: string,
  password?: string
): Promise<User> {
  let payload: RegisterData;
  if (typeof emailOrData === 'string') {
    if (password !== undefined) {
      payload = { email: emailOrData, name: nameOrPassword || null, password };
    } else {
      payload = { email: emailOrData, password: nameOrPassword || '' };
    }
  } else {
    payload = emailOrData;
  }

  return await request<User>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logout(): Promise<{ ok: boolean; message?: string }> {
  return await request<{ ok: boolean; message?: string }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getMe(): Promise<User> {
  return await request<User>('/api/auth/me');
}

export async function getAuthProviders(): Promise<AuthProvidersResponse> {
  return await request<AuthProvidersResponse>('/api/auth/providers');
}

// ==========================================
// Items APIs
// ==========================================

export async function getItems(params?: ItemFilterParams): Promise<Item[]> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.category) query.set('category', params.category);
  if (params?.condition) query.set('condition', params.condition);
  if (params?.era) query.set('era', params.era);
  if (params?.locationId) query.set('locationId', params.locationId);

  const qs = query.toString();
  const endpoint = qs ? `/api/items?${qs}` : '/api/items';
  return await request<Item[]>(endpoint);
}

export async function getItem(id: string): Promise<Item> {
  return await request<Item>(`/api/items/${encodeURIComponent(id)}`);
}

export async function createItem(data: Partial<Item>): Promise<Item> {
  return await request<Item>('/api/items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateItem(id: string, data: Partial<Item>): Promise<Item> {
  return await request<Item>(`/api/items/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteItem(id: string): Promise<{ ok: boolean }> {
  return await request<{ ok: boolean }>(`/api/items/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// Multimodal AI Image Analysis
export async function analyzeImages(files: File[]): Promise<ItemDetailsAnalysis> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  return await request<ItemDetailsAnalysis>('/api/items/analyze', {
    method: 'POST',
    body: formData,
  });
}

export const analyzePhotos = analyzeImages;

export async function analyzeBase64Images(
  images: Base64Image[]
): Promise<ItemDetailsAnalysis> {
  return await request<ItemDetailsAnalysis>('/api/items/analyze', {
    method: 'POST',
    body: JSON.stringify({ images }),
  });
}

// ==========================================
// Photos APIs
// ==========================================

export async function uploadPhoto(
  itemId: string,
  file: File,
  isPrimary?: boolean
): Promise<Photo> {
  const formData = new FormData();
  formData.append('file', file);

  const photo = await request<Photo>(`/api/items/${encodeURIComponent(itemId)}/photos`, {
    method: 'POST',
    body: formData,
  });

  if (isPrimary && !photo.isPrimary) {
    return await setPrimaryPhoto(photo.id);
  }

  return photo;
}

export const uploadItemPhoto = uploadPhoto;

export async function deletePhoto(photoId: string): Promise<{ ok: boolean }> {
  return await request<{ ok: boolean }>(`/api/photos/${encodeURIComponent(photoId)}`, {
    method: 'DELETE',
  });
}

export async function setPrimaryPhoto(photoId: string): Promise<Photo> {
  return await request<Photo>(`/api/photos/${encodeURIComponent(photoId)}/primary`, {
    method: 'PUT',
  });
}

// ==========================================
// Locations APIs
// ==========================================

export async function getLocations(flat: boolean = false): Promise<Location[]> {
  const endpoint = flat ? '/api/locations?flat=true' : '/api/locations';
  return await request<Location[]>(endpoint);
}

export async function getLocation(id: string): Promise<Location> {
  return await request<Location>(`/api/locations/${encodeURIComponent(id)}`);
}

export async function createLocation(data: LocationCreateData): Promise<Location> {
  return await request<Location>('/api/locations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateLocation(
  id: string,
  data: LocationUpdateData
): Promise<Location> {
  return await request<Location>(`/api/locations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteLocation(id: string): Promise<{ ok: boolean }> {
  return await request<{ ok: boolean }>(`/api/locations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ==========================================
// Appraisals & Sales APIs
// ==========================================

export async function addAppraisal(
  itemId: string,
  data: AppraisalCreateData
): Promise<Appraisal> {
  return await request<Appraisal>(`/api/items/${encodeURIComponent(itemId)}/appraisals`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAppraisal(id: string): Promise<{ ok: boolean }> {
  return await request<{ ok: boolean }>(`/api/appraisals/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function addSale(
  itemId: string,
  data: SaleCreateData
): Promise<Sale> {
  return await request<Sale>(`/api/items/${encodeURIComponent(itemId)}/sales`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteSale(id: string): Promise<{ ok: boolean }> {
  return await request<{ ok: boolean }>(`/api/sales/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ==========================================
// Users APIs (Admin Only)
// ==========================================

export async function getUsers(): Promise<User[]> {
  return await request<User[]>('/api/users');
}

export async function updateUserRole(
  id: string,
  role: UserRole
): Promise<User> {
  return await request<User>(`/api/users/${encodeURIComponent(id)}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function deleteUser(id: string): Promise<{ ok: boolean }> {
  return await request<{ ok: boolean }>(`/api/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ==========================================
// Unified API Client Export
// ==========================================

export const api = {
  // Auth
  login,
  register,
  logout,
  getMe,
  getAuthProviders,

  // Items
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  analyzeImages,
  analyzePhotos,
  analyzeBase64Images,

  // Photos
  uploadPhoto,
  uploadItemPhoto,
  deletePhoto,
  setPrimaryPhoto,

  // Locations
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,

  // Appraisals & Sales
  addAppraisal,
  deleteAppraisal,
  addSale,
  deleteSale,

  // Users
  getUsers,
  updateUserRole,
  deleteUser,
};

export default api;
