import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  type GraphQLFieldConfig,
  type GraphQLInputFieldConfigMap,
} from 'graphql';
import type { Knex } from 'knex';
import { parseGraphqlFilter, parseGraphqlSort } from './filter-args.js';
import type { GraphQLContext } from './context.js';
import {
  toByIdFieldName,
  toCreateMutationName,
  toDeleteMutationName,
  toListFieldName,
  toTypeName,
  toUpdateMutationName,
} from './naming.js';
import { getRequestedFields, getTopLevelFields } from './selection.js';
import { GraphQLJSON } from './scalars.js';
import { getRelatedCollectionName, mapInputFieldType, mapOutputFieldType } from './type-mapper.js';
import { listCollections } from '../services/collections.service.js';
import { listFields } from '../services/fields.service.js';
import {
  createItem,
  deleteItem,
  getItem,
  listItems,
  updateItem,
} from '../services/items.service.js';
import { assertAccess, resolveAccess } from '../services/permissions.service.js';
import type { CollectionMeta } from '../types/collection.js';
import type { FieldMeta } from '../types/field.js';
import type { CreateItemInput, UpdateItemInput } from '../types/item.js';

const DeleteResultType = new GraphQLObjectType({
  name: 'DeleteResult',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
});

/**
 * Build a GraphQL schema from the current collections and fields metadata.
 */
export async function buildGraphqlSchema(db: Knex): Promise<GraphQLSchema> {
  const collections = await listCollections(db);
  const fieldsByCollection = new Map<string, FieldMeta[]>();

  for (const collection of collections) {
    fieldsByCollection.set(collection.collection, await listFields(db, collection.collection));
  }

  const typeMap = new Map<string, GraphQLObjectType>();
  const createInputMap = new Map<string, GraphQLInputObjectType>();
  const updateInputMap = new Map<string, GraphQLInputObjectType>();

  for (const collection of collections) {
    const fields = fieldsByCollection.get(collection.collection) ?? [];
    const typeName = toTypeName(collection.collection);

    typeMap.set(
      collection.collection,
      new GraphQLObjectType({
        name: typeName,
        fields: () => buildOutputFields(collection.collection, fields, typeMap),
      }),
    );

    createInputMap.set(collection.collection, buildCreateInputType(typeName, fields));
    updateInputMap.set(collection.collection, buildUpdateInputType(typeName, fields));
  }

  const queryFields: Record<string, GraphQLFieldConfig<unknown, GraphQLContext>> = {};
  const mutationFields: Record<string, GraphQLFieldConfig<unknown, GraphQLContext>> = {};

  if (collections.length === 0) {
    queryFields._empty = {
      type: GraphQLString,
      description: 'Placeholder field when no collections exist',
      resolve: () => null,
    };
  }

  for (const collection of collections) {
    const outputType = typeMap.get(collection.collection);
    if (!outputType) {
      continue;
    }

    queryFields[toListFieldName(collection.collection)] = buildListQueryField(collection, outputType);
    queryFields[toByIdFieldName(collection.collection)] = buildByIdQueryField(collection, outputType);
    mutationFields[toCreateMutationName(collection.collection)] = buildCreateMutationField(
      collection,
      outputType,
      createInputMap.get(collection.collection)!,
    );
    mutationFields[toUpdateMutationName(collection.collection)] = buildUpdateMutationField(
      collection,
      outputType,
      updateInputMap.get(collection.collection)!,
    );
    mutationFields[toDeleteMutationName(collection.collection)] = buildDeleteMutationField(collection);
  }

  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: queryFields,
    }),
    mutation: new GraphQLObjectType({
      name: 'Mutation',
      fields: mutationFields,
    }),
    types: [DeleteResultType, GraphQLJSON],
  });
}

function buildOutputFields(
  collectionName: string,
  fields: FieldMeta[],
  typeMap: Map<string, GraphQLObjectType>,
): Record<string, GraphQLFieldConfig<unknown, GraphQLContext>> {
  const outputFields: Record<string, GraphQLFieldConfig<unknown, GraphQLContext>> = {};

  for (const field of fields) {
    const relatedCollection = getRelatedCollectionName(field);
    const relatedType = relatedCollection ? (typeMap.get(relatedCollection) ?? GraphQLJSON) : null;

    outputFields[field.field] = {
      type: mapOutputFieldType(field, relatedType),
      resolve: (parent) => {
        const record = parent as Record<string, unknown>;
        return record[field.field] ?? null;
      },
    };
  }

  return outputFields;
}

function buildCreateInputType(typeName: string, fields: FieldMeta[]): GraphQLInputObjectType {
  const inputFields: GraphQLInputFieldConfigMap = {};

  for (const field of fields) {
    if (field.interface === 'one-to-many') {
      continue;
    }
    if (field.is_system && field.field !== 'id') {
      continue;
    }

    const inputType = mapInputFieldType(field);
    if (!inputType) {
      continue;
    }

    inputFields[field.field] = {
      type: field.required && !field.is_system ? new GraphQLNonNull(inputType) : inputType,
    };
  }

  return new GraphQLInputObjectType({
    name: `Create${typeName}Input`,
    fields: inputFields,
  });
}

function buildUpdateInputType(typeName: string, fields: FieldMeta[]): GraphQLInputObjectType {
  const inputFields: GraphQLInputFieldConfigMap = {};

  for (const field of fields) {
    if (field.interface === 'one-to-many') {
      continue;
    }
    if (field.is_system) {
      continue;
    }

    const inputType = mapInputFieldType(field);
    if (!inputType) {
      continue;
    }

    inputFields[field.field] = { type: inputType };
  }

  return new GraphQLInputObjectType({
    name: `Update${typeName}Input`,
    fields: inputFields,
  });
}

function buildListQueryField(
  collection: CollectionMeta,
  outputType: GraphQLObjectType,
): GraphQLFieldConfig<unknown, GraphQLContext> {
  return {
    type: new GraphQLList(outputType),
    args: {
      filter: { type: GraphQLJSON },
      sort: { type: new GraphQLList(GraphQLString) },
      limit: { type: GraphQLInt },
      offset: { type: GraphQLInt },
      search: { type: GraphQLString },
    },
    resolve: async (_parent, args, ctx, info) => {
      const access = await resolveAccess(ctx.db, ctx.user, collection.collection, 'read');
      assertAccess(access);

      const fieldsRaw = getRequestedFields(info);
      const result = await listItems(
        ctx.db,
        collection.collection,
        {
          filter: parseGraphqlFilter(args.filter),
          sort: parseGraphqlSort(args.sort),
          limit: typeof args.limit === 'number' ? args.limit : 25,
          offset: typeof args.offset === 'number' ? args.offset : 0,
          search: typeof args.search === 'string' ? args.search : undefined,
          fields: getTopLevelFields(fieldsRaw),
          fieldsRaw,
          includeArchived: false,
        },
        access,
      );

      return result.items;
    },
  };
}

function buildByIdQueryField(
  collection: CollectionMeta,
  outputType: GraphQLObjectType,
): GraphQLFieldConfig<unknown, GraphQLContext> {
  return {
    type: outputType,
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve: async (_parent, args, ctx, info) => {
      const access = await resolveAccess(ctx.db, ctx.user, collection.collection, 'read');
      assertAccess(access);

      const fieldsRaw = getRequestedFields(info);
      return getItem(
        ctx.db,
        collection.collection,
        String(args.id),
        getTopLevelFields(fieldsRaw),
        fieldsRaw,
        access,
      );
    },
  };
}

function buildCreateMutationField(
  collection: CollectionMeta,
  outputType: GraphQLObjectType,
  inputType: GraphQLInputObjectType,
): GraphQLFieldConfig<unknown, GraphQLContext> {
  return {
    type: outputType,
    args: {
      data: { type: new GraphQLNonNull(inputType) },
    },
    resolve: async (_parent, args, ctx) => {
      const access = await resolveAccess(ctx.db, ctx.user, collection.collection, 'create');
      assertAccess(access);

      return createItem(
        ctx.db,
        collection.collection,
        args.data as CreateItemInput,
        ctx.user?.id ?? null,
        access,
      );
    },
  };
}

function buildUpdateMutationField(
  collection: CollectionMeta,
  outputType: GraphQLObjectType,
  inputType: GraphQLInputObjectType,
): GraphQLFieldConfig<unknown, GraphQLContext> {
  return {
    type: outputType,
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      data: { type: new GraphQLNonNull(inputType) },
    },
    resolve: async (_parent, args, ctx) => {
      const access = await resolveAccess(ctx.db, ctx.user, collection.collection, 'update');
      assertAccess(access);

      return updateItem(
        ctx.db,
        collection.collection,
        String(args.id),
        args.data as UpdateItemInput,
        ctx.user?.id ?? null,
        access,
      );
    },
  };
}

function buildDeleteMutationField(
  collection: CollectionMeta,
): GraphQLFieldConfig<unknown, GraphQLContext> {
  return {
    type: DeleteResultType,
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve: async (_parent, args, ctx) => {
      const access = await resolveAccess(ctx.db, ctx.user, collection.collection, 'delete');
      assertAccess(access);

      const id = String(args.id);
      await deleteItem(ctx.db, collection.collection, id, ctx.user?.id ?? null, access);
      return { id };
    },
  };
}
