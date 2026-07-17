export interface CmsCollectionRow {
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
  activity_tracking: boolean;
  parent: string | null;
  is_group: boolean;
  sort: number;
}

export interface CollectionMeta extends CmsCollectionRow {
  field_count: number;
  child_count: number;
}

export interface CreateCollectionInput {
  collection: string;
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
  system?: boolean;
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

export interface SystemFieldDefinition {
  field: string;
  type: string;
  special: string;
  interface: string;
  readonly: boolean;
  hidden: boolean;
  required: boolean;
  sort: number;
  width: number;
}
