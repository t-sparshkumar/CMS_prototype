import assert from 'node:assert/strict';
import {
  convertDirectusSnapshot,
  isDirectusSnapshot,
  normalizeIdentifier,
} from './directus-snapshot.adapter.js';

const fixture = {
  data: {
    version: 1,
    directus: '12.0.2',
    collections: [
      {
        collection: 'Content',
        meta: { icon: 'menu_book', color: '#2ECDA7', group: null, sort: 1, hidden: false, singleton: false },
      },
      {
        collection: 'Care_Plan_Catalog',
        meta: {
          icon: null,
          color: '#6644FF',
          group: 'eCare_',
          sort: 4,
          hidden: false,
          singleton: false,
          archive_field: 'status',
          archive_value: 'archived',
          unarchive_value: 'draft',
          sort_field: 'manual_sort',
        },
        schema: { name: 'Care_Plan_Catalog' },
      },
      {
        collection: 'eCare_',
        meta: { icon: 'folder', group: null, sort: 2, hidden: false, singleton: false },
      },
    ],
    fields: [
      {
        collection: 'Care_Plan_Catalog',
        field: 'id',
        type: 'integer',
        meta: { interface: 'input', hidden: true, readonly: true, sort: 1, width: 'full' },
        schema: { is_nullable: false, is_unique: true },
      },
      {
        collection: 'Care_Plan_Catalog',
        field: 'hasMultiplier',
        type: 'boolean',
        meta: { interface: 'boolean', hidden: false, sort: 3, width: 'half' },
        schema: { is_nullable: true },
      },
      {
        collection: 'Care_Plan_Catalog',
        field: 'image',
        type: 'uuid',
        meta: { interface: 'file-image', special: 'file', sort: 4, width: 'full' },
        schema: { is_nullable: true, foreign_key_table: 'directus_files', foreign_key_column: 'id' },
      },
      {
        collection: 'Care_Plan_Catalog',
        field: 'user_updated',
        type: 'uuid',
        meta: { interface: 'select-dropdown-m2o', special: 'user-updated', sort: 99, width: 'full' },
        schema: { foreign_key_table: 'directus_users', foreign_key_column: 'id' },
      },
    ],
    relations: [
      {
        collection: 'Care_Plan_Catalog',
        field: 'image',
        related_collection: 'directus_files',
        meta: {
          many_collection: 'Care_Plan_Catalog',
          many_field: 'image',
          one_collection: 'directus_files',
          one_field: null,
        },
        schema: { on_delete: 'SET NULL' },
      },
    ],
  },
};

assert.equal(normalizeIdentifier('hasMultiplier'), 'has_multiplier');
assert.equal(normalizeIdentifier('Care_Plan_Catalog'), 'care_plan_catalog');
assert.ok(isDirectusSnapshot(fixture));

const converted = convertDirectusSnapshot(fixture);

assert.equal(converted.source, 'directus');
assert.ok(converted.collections.some((collection) => collection.collection === 'content' && collection.is_group));
assert.ok(
  converted.collections.some(
    (collection) => collection.collection === 'care_plan_catalog' && collection.parent === 'e_care',
  ),
);

const hasMultiplier = converted.fields.find(
  (field) => field.collection === 'care_plan_catalog' && field.field === 'has_multiplier',
);
assert.ok(hasMultiplier);
assert.equal(hasMultiplier?.interface, 'toggle');

const imageField = converted.fields.find(
  (field) => field.collection === 'care_plan_catalog' && field.field === 'image',
);
assert.ok(imageField);
assert.equal(imageField?.interface, 'file-image');

assert.equal(converted.relations.length, 0, 'm2o/file relations are created via fields');

console.log('directus-snapshot.adapter tests passed');
