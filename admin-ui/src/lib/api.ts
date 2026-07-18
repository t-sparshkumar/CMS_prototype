import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { API_BASE_URL, apiUrl } from './apiBase';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 60_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    const status = error.response?.status;

    if (status !== 401 || originalRequest._retry || originalRequest.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = axios
        .post<{ data: { access_token: string; expires: number } }>(apiUrl('/auth/refresh'), null, {
          withCredentials: true,
          baseURL: API_BASE_URL,
        })
        .then((res) => {
          const token = res.data.data.access_token;
          useAuthStore.getState().setAccessToken(token);
          return token;
        })
        .catch(() => {
          useAuthStore.getState().logout();
          return null;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const newToken = await refreshPromise;
    if (!newToken) {
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return api(originalRequest);
  },
);

export interface SchemaImportMeta {
  source?: string;
  warnings?: string[];
  stats?: Record<string, number>;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: SchemaImportMeta;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  admin_access: boolean;
  app_access: boolean;
  last_access: string | null;
}

export interface LoginResponse {
  access_token: string;
  expires: number;
}

export interface CollectionMeta {
  collection: string;
  display_name: string | null;
  icon: string | null;
  color: string | null;
  display_template: string | null;
  note: string | null;
  singleton: boolean;
  sort_field: string | null;
  archive_field: string | null;
  archive_value: string | null;
  unarchive_value: string | null;
  hidden: boolean;
  system: boolean;
  activity_tracking?: boolean;
  parent: string | null;
  is_group: boolean;
  sort: number;
  field_count: number;
  child_count: number;
}

export interface UpdateCollectionInput {
  display_name?: string | null;
  icon?: string | null;
  color?: string | null;
  display_template?: string | null;
  note?: string | null;
  singleton?: boolean;
  sort_field?: string | null;
  archive_field?: string | null;
  archive_value?: string | null;
  unarchive_value?: string | null;
  hidden?: boolean;
  activity_tracking?: boolean;
  parent?: string | null;
  is_group?: boolean;
  sort?: number;
}

export interface CreateCollectionInput {
  collection: string;
  display_name?: string | null;
  icon?: string | null;
  color?: string | null;
  display_template?: string | null;
  note?: string | null;
  singleton?: boolean;
  parent?: string | null;
  is_group?: boolean;
  sort?: number;
  primary_key_type?: 'uuid' | 'integer';
  optional_system_fields?: {
    status?: boolean;
    sort?: boolean;
    accountability?: boolean;
  };
}

export type SqlFieldType =
  | 'string'
  | 'text'
  | 'integer'
  | 'bigInteger'
  | 'float'
  | 'decimal'
  | 'boolean'
  | 'datetime'
  | 'date'
  | 'json'
  | 'uuid'
  | 'hash'
  | 'time'
  | 'csv'
  | 'binary';

export interface FieldMeta {
  id: number;
  collection: string;
  field: string;
  type: string;
  special: string | null;
  interface: string;
  options: Record<string, unknown> | null;
  display: string | null;
  display_options: Record<string, unknown> | null;
  readonly: boolean;
  hidden: boolean;
  sort: number;
  width: number;
  required: boolean;
  unique: boolean;
  nullable: boolean;
  is_indexed: boolean;
  searchable: boolean;
  group: string | null;
  conditions: Record<string, unknown> | null;
  validation: Record<string, unknown> | null;
  note: string | null;
  default_value: string | null;
  is_system: boolean;
  effective_hidden?: boolean;
  effective_readonly?: boolean;
  effective_required?: boolean;
}

export interface CreateFieldInput {
  field: string;
  type?: SqlFieldType | 'alias';
  interface?: string;
  options?: Record<string, unknown> | null;
  display?: string | null;
  display_options?: Record<string, unknown> | null;
  required?: boolean;
  unique?: boolean;
  nullable?: boolean;
  is_indexed?: boolean;
  searchable?: boolean;
  hidden?: boolean;
  readonly?: boolean;
  sort?: number;
  width?: number;
  group?: string | null;
  note?: string | null;
  default_value?: string | null;
  validation?: Record<string, unknown> | null;
  conditions?: Record<string, unknown> | null;
}

export interface UpdateFieldInput {
  type?: SqlFieldType | 'alias';
  interface?: string;
  options?: Record<string, unknown> | null;
  display?: string | null;
  display_options?: Record<string, unknown> | null;
  required?: boolean;
  unique?: boolean;
  nullable?: boolean;
  is_indexed?: boolean;
  searchable?: boolean;
  hidden?: boolean;
  readonly?: boolean;
  sort?: number;
  width?: number;
  group?: string | null;
  note?: string | null;
  default_value?: string | null;
  validation?: Record<string, unknown> | null;
  conditions?: Record<string, unknown> | null;
}

export interface RelationMeta {
  id: number;
  many_collection: string;
  many_field: string;
  one_collection: string;
  one_field: string;
  junction_collection: string | null;
  sort_field: string | null;
  schema_on_delete: string | null;
}

export interface ApiListMeta {
  total_count?: number;
  filter_count?: number;
}

export interface ApiListResponse<T> {
  data: T;
  meta?: ApiListMeta;
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<ApiSuccess<LoginResponse>>('/auth/login', { email, password });
  return res.data.data;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}

export async function refreshSession(): Promise<LoginResponse | null> {
  try {
    const res = await axios.post<ApiSuccess<LoginResponse>>(apiUrl('/auth/refresh'), null, {
      withCredentials: true,
      baseURL: API_BASE_URL,
    });
    return res.data.data;
  } catch {
    return null;
  }
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  const res = await api.get<ApiSuccess<UserProfile>>('/users/me');
  return res.data.data;
}

export async function fetchCollections(
  options: { includeHidden?: boolean; parent?: string | null } = {},
): Promise<CollectionMeta[]> {
  const params: Record<string, string> = {};
  if (options.includeHidden) params.include_hidden = 'true';
  if (options.parent !== undefined) {
    params.parent = options.parent ?? 'null';
  }
  const res = await api.get<ApiListResponse<CollectionMeta[]>>('/api/collections', {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return res.data.data;
}

export async function fetchCollection(name: string): Promise<CollectionMeta> {
  const res = await api.get<ApiSuccess<CollectionMeta>>(`/api/collections/${encodeURIComponent(name)}`);
  return res.data.data;
}

export async function updateCollection(name: string, input: UpdateCollectionInput): Promise<CollectionMeta> {
  const res = await api.patch<ApiSuccess<CollectionMeta>>(
    `/api/collections/${encodeURIComponent(name)}`,
    input,
  );
  return res.data.data;
}

export async function reorderCollections(
  items: Array<{ collection: string; sort: number }>,
): Promise<void> {
  await api.post('/api/collections/reorder', { items });
}

export async function createCollection(input: CreateCollectionInput): Promise<CollectionMeta> {
  const res = await api.post<ApiSuccess<CollectionMeta>>('/api/collections', input);
  return res.data.data;
}

export async function deleteCollection(name: string): Promise<void> {
  await api.delete(`/api/collections/${encodeURIComponent(name)}`);
}

export async function fetchFields(
  collection: string,
  formData?: Record<string, unknown>,
): Promise<FieldMeta[]> {
  const res = await api.get<ApiListResponse<FieldMeta[]>>(
    `/api/collections/${encodeURIComponent(collection)}/fields`,
    {
      params: formData ? { form_data: JSON.stringify(formData) } : undefined,
    },
  );
  return res.data.data;
}

export async function createField(collection: string, input: CreateFieldInput): Promise<FieldMeta> {
  const res = await api.post<ApiSuccess<FieldMeta>>(
    `/api/collections/${encodeURIComponent(collection)}/fields`,
    input,
  );
  return res.data.data;
}

export async function updateField(
  collection: string,
  field: string,
  input: UpdateFieldInput,
): Promise<{ field: FieldMeta; warning?: string }> {
  const res = await api.patch<{ data: FieldMeta; meta?: { warning?: string } }>(
    `/api/collections/${encodeURIComponent(collection)}/fields/${encodeURIComponent(field)}`,
    input,
  );
  return { field: res.data.data, warning: res.data.meta?.warning };
}

export async function deleteField(collection: string, field: string): Promise<void> {
  await api.delete(
    `/api/collections/${encodeURIComponent(collection)}/fields/${encodeURIComponent(field)}`,
  );
}

export type ItemRecord = Record<string, unknown>;

export interface ItemListParams {
  limit?: number;
  offset?: number;
  sort?: string;
  search?: string;
  include_archived?: boolean;
  filter?: Record<string, Record<string, unknown>>;
}

function serializeItemParams(params: ItemListParams = {}): Record<string, unknown> {
  const { filter, ...rest } = params;
  const serialized: Record<string, unknown> = { ...rest };

  if (filter) {
    for (const [field, operators] of Object.entries(filter)) {
      for (const [operator, value] of Object.entries(operators)) {
        serialized[`filter[${field}][${operator}]`] = value;
      }
    }
  }

  return serialized;
}

export async function fetchItems(
  collection: string,
  params: ItemListParams = {},
): Promise<{ items: ItemRecord[]; totalCount: number; filterCount: number }> {
  const res = await api.get<ApiListResponse<ItemRecord[]>>(
    `/api/items/${encodeURIComponent(collection)}`,
    { params: serializeItemParams(params) },
  );
  return {
    items: res.data.data,
    totalCount: res.data.meta?.total_count ?? res.data.data.length,
    filterCount: res.data.meta?.filter_count ?? res.data.data.length,
  };
}

export async function fetchItem(collection: string, id: string): Promise<ItemRecord> {
  const res = await api.get<ApiSuccess<ItemRecord>>(
    `/api/items/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
  );
  return res.data.data;
}

export async function createItem(
  collection: string,
  data: ItemRecord,
): Promise<ItemRecord> {
  const res = await api.post<ApiSuccess<ItemRecord>>(
    `/api/items/${encodeURIComponent(collection)}`,
    data,
  );
  return res.data.data;
}

export async function updateItem(
  collection: string,
  id: string,
  data: ItemRecord,
): Promise<ItemRecord> {
  const res = await api.patch<ApiSuccess<ItemRecord>>(
    `/api/items/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
    data,
  );
  return res.data.data;
}

export async function deleteItem(collection: string, id: string): Promise<void> {
  await api.delete(
    `/api/items/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
  );
}

export async function reorderItems(
  collection: string,
  items: Array<{ id: string; sort: number }>,
): Promise<void> {
  await api.post(`/api/items/${encodeURIComponent(collection)}/reorder`, { items });
}

export async function fetchRelations(collection?: string): Promise<RelationMeta[]> {
  const res = await api.get<ApiListResponse<RelationMeta[]>>('/api/relations', {
    params: collection ? { collection } : undefined,
  });
  return res.data.data;
}

export async function deleteRelation(id: number): Promise<void> {
  await api.delete(`/api/relations/${id}`);
}

export async function duplicateCollection(source: string, target: string): Promise<CollectionMeta> {
  const res = await api.post<ApiSuccess<CollectionMeta>>(
    `/api/collections/${encodeURIComponent(source)}/duplicate`,
    { target },
  );
  return res.data.data;
}

export async function renameCollection(oldName: string, newName: string): Promise<CollectionMeta> {
  const res = await api.post<ApiSuccess<CollectionMeta>>(
    `/api/collections/${encodeURIComponent(oldName)}/rename`,
    { new_name: newName },
  );
  return res.data.data;
}

export async function fetchField(collection: string, field: string): Promise<FieldMeta> {
  const res = await api.get<ApiSuccess<FieldMeta>>(
    `/api/collections/${encodeURIComponent(collection)}/fields/${encodeURIComponent(field)}`,
  );
  return res.data.data;
}

export async function reorderFields(
  collection: string,
  items: Array<{ field: string; sort: number; group?: string | null }>,
): Promise<void> {
  await api.post(`/api/collections/${encodeURIComponent(collection)}/fields/reorder`, { items });
}

export async function duplicateField(collection: string, field: string): Promise<FieldMeta> {
  const res = await api.post<ApiSuccess<FieldMeta>>(
    `/api/collections/${encodeURIComponent(collection)}/fields/${encodeURIComponent(field)}/duplicate`,
  );
  return res.data.data;
}

export async function renameField(
  collection: string,
  field: string,
  newField: string,
): Promise<FieldMeta> {
  const res = await api.post<ApiSuccess<FieldMeta>>(
    `/api/collections/${encodeURIComponent(collection)}/fields/${encodeURIComponent(field)}/rename`,
    { new_field: newField },
  );
  return res.data.data;
}

export async function updateRelation(
  id: number,
  input: Partial<Pick<RelationMeta, 'schema_on_delete' | 'sort_field'>>,
): Promise<RelationMeta> {
  const res = await api.patch<ApiSuccess<RelationMeta>>(`/api/relations/${id}`, input);
  return res.data.data;
}

export interface SchemaDiff {
  collections_to_create: string[];
  collections_to_delete: string[];
  fields_to_create: Array<{ collection: string; field: string }>;
  fields_to_delete: Array<{ collection: string; field: string }>;
  relations_to_create: RelationMeta[];
  relations_to_delete: number[];
}

export async function diffSchemaSnapshot(
  snapshot: Record<string, unknown>,
): Promise<{ diff: SchemaDiff; meta?: SchemaImportMeta }> {
  const res = await api.post<ApiSuccess<SchemaDiff>>('/api/schema/diff', snapshot);
  return { diff: res.data.data, meta: res.data.meta };
}

export interface TranslationsConfig {
  translations_field: string;
  languages_collection: string;
  languages_field: string;
  translation_collection: string;
  parent_fk_field: string;
  translatable_fields: string[];
  enabled_languages: string[];
}

export async function fetchTranslationsConfig(collection: string): Promise<TranslationsConfig | null> {
  const res = await api.get<ApiSuccess<TranslationsConfig | null>>(
    `/api/collections/${encodeURIComponent(collection)}/translations/config`,
  );
  return res.data.data;
}

export async function setupTranslations(
  collection: string,
  input: {
    languages_collection?: string;
    languages_field?: string;
    translations_field?: string;
    translatable_fields: string[];
    enabled_languages?: string[];
  },
): Promise<TranslationsConfig> {
  const res = await api.post<ApiSuccess<TranslationsConfig>>(
    `/api/collections/${encodeURIComponent(collection)}/translations/setup`,
    input,
  );
  return res.data.data;
}

export async function fetchSchemaSnapshot(): Promise<Record<string, unknown>> {
  const res = await api.get<ApiSuccess<Record<string, unknown>>>('/api/schema/snapshot');
  return res.data.data;
}

export async function applySchemaSnapshot(snapshot: Record<string, unknown>): Promise<void> {
  await api.post('/api/schema/apply', snapshot);
}

export interface RoleMeta {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  admin_access: boolean;
  app_access: boolean;
  user_count?: number;
  policy_count?: number;
  policy_ids?: string[];
}

export interface PolicyRule {
  collection: string;
  action: 'create' | 'read' | 'update' | 'delete';
  fields?: string[] | '*';
  permissions?: Record<string, unknown> | null;
}

export interface PolicyMeta {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  rules: PolicyRule[];
  is_system: boolean;
  role_count: number;
}

export interface PermissionMeta {
  id: number;
  role: string;
  collection: string;
  action: 'create' | 'read' | 'update' | 'delete';
  fields: string[] | '*';
  permissions: Record<string, unknown> | null;
  validation: Record<string, unknown> | null;
  presets: Record<string, unknown> | null;
  rowFilter: Record<string, unknown>;
}

export interface UpsertPermissionInput {
  role: string;
  collection: string;
  action: 'create' | 'read' | 'update' | 'delete';
  fields?: string[] | '*';
  permissions?: Record<string, unknown> | null;
}

export async function fetchRoles(): Promise<RoleMeta[]> {
  const res = await api.get<ApiListResponse<RoleMeta[]>>('/api/roles');
  return res.data.data;
}

export interface CreateRoleInput {
  name: string;
  description?: string | null;
  app_access?: boolean;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  app_access?: boolean;
}

export async function createRole(input: CreateRoleInput): Promise<RoleMeta> {
  const res = await api.post<ApiSuccess<RoleMeta>>('/api/roles', input);
  return res.data.data;
}

export async function updateRole(roleId: string, input: UpdateRoleInput): Promise<RoleMeta> {
  const res = await api.patch<ApiSuccess<RoleMeta>>(`/api/roles/${roleId}`, input);
  return res.data.data;
}

export async function deleteRole(roleId: string): Promise<void> {
  await api.delete(`/api/roles/${roleId}`);
}

export async function fetchPolicies(): Promise<PolicyMeta[]> {
  const res = await api.get<ApiListResponse<PolicyMeta[]>>('/api/policies');
  return res.data.data;
}

export interface CreatePolicyInput {
  name: string;
  description?: string | null;
  rules: PolicyRule[];
}

export interface UpdatePolicyInput {
  name?: string;
  description?: string | null;
  rules?: PolicyRule[];
}

export async function createPolicy(input: CreatePolicyInput): Promise<PolicyMeta> {
  const res = await api.post<ApiSuccess<PolicyMeta>>('/api/policies', input);
  return res.data.data;
}

export async function updatePolicy(policyId: string, input: UpdatePolicyInput): Promise<PolicyMeta> {
  const res = await api.patch<ApiSuccess<PolicyMeta>>(`/api/policies/${policyId}`, input);
  return res.data.data;
}

export async function deletePolicy(policyId: string): Promise<void> {
  await api.delete(`/api/policies/${policyId}`);
}

export async function setRolePolicies(roleId: string, policyIds: string[]): Promise<string[]> {
  const res = await api.put<ApiSuccess<string[]>>(`/api/policies/roles/${roleId}`, {
    policy_ids: policyIds,
  });
  return res.data.data;
}

export async function fetchPermissions(roleId: string): Promise<PermissionMeta[]> {
  const res = await api.get<ApiListResponse<PermissionMeta[]>>('/api/permissions', {
    params: { role: roleId },
  });
  return res.data.data;
}

export async function upsertPermission(input: UpsertPermissionInput): Promise<PermissionMeta> {
  const res = await api.post<ApiSuccess<PermissionMeta>>('/api/permissions', input);
  return res.data.data;
}

export async function deletePermission(permissionId: number): Promise<void> {
  await api.delete(`/api/permissions/${permissionId}`);
}

export interface FileMeta {
  id: string;
  storage: string;
  filename_disk: string;
  filename_download: string;
  title: string | null;
  description: string | null;
  type: string | null;
  folder: string | null;
  uploaded_by: string | null;
  uploaded_on: string;
  filesize: number;
  width: number | null;
  height: number | null;
}

export interface FolderMeta {
  id: string;
  name: string;
  parent: string | null;
  created_on: string;
}

export interface ListFilesResult {
  data: FileMeta[];
  total: number;
}

export async function fetchFiles(options?: {
  folder?: string | null;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ListFilesResult> {
  const params: Record<string, string | number> = {};
  if (options?.folder === null) {
    params.folder = 'root';
  } else if (options?.folder) {
    params.folder = options.folder;
  }
  if (options?.search) {
    params.search = options.search;
  }
  if (options?.limit !== undefined) {
    params.limit = options.limit;
  }
  if (options?.offset !== undefined) {
    params.offset = options.offset;
  }
  const res = await api.get<ApiSuccess<ListFilesResult>>('/files', { params });
  return res.data.data;
}

export async function fetchFolders(): Promise<FolderMeta[]> {
  const res = await api.get<ApiSuccess<FolderMeta[]>>('/files/folders');
  return res.data.data;
}

export async function createFolder(input: { name: string; parent?: string | null }): Promise<FolderMeta> {
  const res = await api.post<ApiSuccess<FolderMeta>>('/files/folders', input);
  return res.data.data;
}

export async function updateFolder(id: string, input: { name?: string; parent?: string | null }): Promise<FolderMeta> {
  const res = await api.patch<ApiSuccess<FolderMeta>>(`/files/folders/${id}`, input);
  return res.data.data;
}

export async function deleteFolder(id: string): Promise<void> {
  await api.delete(`/files/folders/${id}`);
}

export async function updateFile(
  id: string,
  input: { title?: string | null; description?: string | null; folder?: string | null },
): Promise<FileMeta> {
  const res = await api.patch<ApiSuccess<FileMeta>>(`/files/${id}`, input);
  return res.data.data;
}

export async function deleteFile(id: string): Promise<void> {
  await api.delete(`/files/${id}`);
}

export async function uploadFile(
  file: File,
  options?: { title?: string; description?: string; folder?: string | null },
): Promise<FileMeta> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.title) {
    formData.append('title', options.title);
  }
  if (options?.description) {
    formData.append('description', options.description);
  }
  if (options?.folder) {
    formData.append('folder', options.folder);
  }

  const res = await api.post<ApiSuccess<FileMeta>>('/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export function getAssetUrl(
  fileId: string,
  params?: { width?: number; height?: number; fit?: string; format?: string },
): string {
  const search = new URLSearchParams();
  if (params?.width) {
    search.set('width', String(params.width));
  }
  if (params?.height) {
    search.set('height', String(params.height));
  }
  if (params?.fit) {
    search.set('fit', params.fit);
  }
  if (params?.format) {
    search.set('format', params.format);
  }

  const query = search.toString();
  return apiUrl(`/assets/${encodeURIComponent(fileId)}${query ? `?${query}` : ''}`);
}

export interface ActivityEntry {
  id: number;
  action: string;
  user: string | null;
  user_name: string | null;
  user_email: string | null;
  timestamp: string;
  collection: string | null;
  item: string | null;
  comment: string | null;
}

export interface ListActivityResult {
  data: ActivityEntry[];
  total: number;
}

export async function fetchActivity(options?: {
  action?: string;
  collection?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ListActivityResult> {
  const res = await api.get<ApiSuccess<ListActivityResult>>('/api/activity', { params: options });
  return res.data.data;
}

export async function clearActivity(): Promise<{ deleted: number }> {
  const res = await api.delete<ApiSuccess<{ deleted: number }>>('/api/activity');
  return res.data.data;
}

export interface UserListEntry {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  role_name: string | null;
  status: string;
  last_access: string | null;
}

export interface CreateUserInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
  status?: string;
}

export async function fetchUsers(): Promise<UserListEntry[]> {
  const res = await api.get<ApiSuccess<UserListEntry[]>>('/users');
  return res.data.data;
}

export async function createUser(input: CreateUserInput): Promise<UserListEntry> {
  const res = await api.post<ApiSuccess<UserListEntry>>('/users', input);
  return res.data.data;
}

export async function updateUser(
  id: string,
  input: Partial<CreateUserInput>,
): Promise<UserListEntry> {
  const res = await api.patch<ApiSuccess<UserListEntry>>(`/users/${id}`, input);
  return res.data.data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

export interface DashboardStats {
  collections: number;
  components: number;
  users: number;
  drafts_pending: number;
  assets: number;
  pages: number;
  flows: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<ApiSuccess<DashboardStats>>('/api/dashboard/stats');
  return res.data.data;
}

export type FlowStatus = 'active' | 'inactive';
export type FlowTriggerType = 'event' | 'webhook' | 'schedule' | 'manual' | 'operation';

export type FlowOperationType =
  | 'condition'
  | 'item-read'
  | 'item-create'
  | 'item-update'
  | 'item-delete'
  | 'request'
  | 'exec'
  | 'mail'
  | 'trigger'
  | 'log';

export interface FlowSummary {
  id: string;
  name: string;
  status: FlowStatus;
  trigger_type: FlowTriggerType;
  trigger_options: Record<string, unknown> | null;
  accountability: string;
  operation: string | null;
  date_created: string;
  date_updated: string;
}

export interface FlowOperation {
  id: string;
  flow: string;
  name: string | null;
  key: string;
  type: FlowOperationType;
  options: Record<string, unknown> | null;
  resolve: string | null;
  reject: string | null;
  position_x: number;
  position_y: number;
}

export interface FlowOperationLogEntry {
  operation_id: string;
  operation_key: string;
  operation_type: FlowOperationType;
  status: 'success' | 'failed' | 'skipped';
  input: Record<string, unknown> | null;
  output: unknown;
  error?: string;
  duration_ms: number;
  branch?: 'resolve' | 'reject' | 'none';
}

export interface FlowLogEntry {
  id: string;
  flow: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  execution_time: number | null;
  trigger_log: Record<string, unknown> | null;
  operations_log: unknown[] | null;
}

export interface CreateFlowInput {
  name: string;
  status?: FlowStatus;
  trigger_type: FlowTriggerType;
  trigger_options?: Record<string, unknown> | null;
  accountability?: string;
  operations?: Array<{
    key: string;
    type: FlowOperationType;
    name?: string;
    options?: Record<string, unknown> | null;
    resolve?: string | null;
    reject?: string | null;
    position_x?: number;
    position_y?: number;
  }>;
}

export interface SaveFlowGraphInput {
  flow?: {
    name?: string;
    status?: FlowStatus;
    trigger_type?: FlowTriggerType;
    trigger_options?: Record<string, unknown> | null;
    accountability?: string;
    operation?: string | null;
  };
  operations: Array<{
    id?: string;
    key: string;
    name?: string | null;
    type: FlowOperationType;
    options?: Record<string, unknown> | null;
    resolve?: string | null;
    reject?: string | null;
    position_x: number;
    position_y: number;
  }>;
  entry_operation?: string | null;
}

export interface FlowLogDetail extends FlowLogEntry {
  operations_log: FlowOperationLogEntry[] | null;
}

export async function fetchFlows(): Promise<FlowSummary[]> {
  const res = await api.get<ApiSuccess<FlowSummary[]>>('/api/flows');
  return res.data.data;
}

export async function fetchFlow(id: string): Promise<{ flow: FlowSummary; operations: FlowOperation[] }> {
  const res = await api.get<ApiSuccess<{ flow: FlowSummary; operations: FlowOperation[] }>>(`/api/flows/${id}`);
  return res.data.data;
}

export async function createFlow(input: CreateFlowInput): Promise<{ flow: FlowSummary; operations: FlowOperation[] }> {
  const res = await api.post<ApiSuccess<{ flow: FlowSummary; operations: FlowOperation[] }>>('/api/flows', input);
  return res.data.data;
}

export async function updateFlow(id: string, input: Partial<CreateFlowInput>): Promise<FlowSummary> {
  const res = await api.patch<ApiSuccess<FlowSummary>>(`/api/flows/${id}`, input);
  return res.data.data;
}

export async function deleteFlow(id: string): Promise<void> {
  await api.delete(`/api/flows/${id}`);
}

export async function fetchFlowLogs(id: string): Promise<FlowLogEntry[]> {
  const res = await api.get<ApiSuccess<FlowLogEntry[]>>(`/api/flows/${id}/logs`);
  return res.data.data;
}

export async function triggerFlow(id: string, payload: Record<string, unknown> = {}): Promise<unknown> {
  const res = await api.post<ApiSuccess<unknown>>(`/api/flows/${id}/trigger`, payload);
  return res.data.data;
}

export async function saveFlowGraph(
  id: string,
  input: SaveFlowGraphInput,
): Promise<{ flow: FlowSummary; operations: FlowOperation[] }> {
  const res = await api.put<ApiSuccess<{ flow: FlowSummary; operations: FlowOperation[] }>>(
    `/api/flows/${id}/graph`,
    input,
  );
  return res.data.data;
}

export async function fetchFlowLogDetail(flowId: string, logId: string): Promise<FlowLogDetail> {
  const res = await api.get<ApiSuccess<FlowLogDetail>>(`/api/flows/${flowId}/logs/${logId}`);
  return res.data.data;
}

export default api;
