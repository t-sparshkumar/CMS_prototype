import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
  type GraphQLOutputType,
  type GraphQLInputType,
} from 'graphql';
import { getRelationKind } from '../core/relation.js';
import type { FieldMeta } from '../types/field.js';
import { GraphQLJSON } from './scalars.js';

/**
 * Map a CMS field to a GraphQL output type.
 */
export function mapOutputFieldType(
  field: FieldMeta,
  relatedType: GraphQLOutputType | null,
): GraphQLOutputType {
  const relationKind = getRelationKind(field.interface);
  if (relationKind === 'm2o' && relatedType) {
    return relatedType;
  }
  if ((relationKind === 'o2m' || relationKind === 'm2m') && relatedType) {
    return new GraphQLList(relatedType);
  }

  return mapScalarOutputType(field.type);
}

/**
 * Map a CMS field to a GraphQL input type for create/update payloads.
 */
export function mapInputFieldType(field: FieldMeta): GraphQLInputType | null {
  const relationKind = getRelationKind(field.interface);
  if (relationKind === 'm2o') {
    return GraphQLID;
  }
  if (relationKind === 'm2m') {
    return new GraphQLList(GraphQLID);
  }
  if (relationKind === 'o2m') {
    return null;
  }

  return mapScalarInputType(field.type);
}

function mapScalarOutputType(sqlType: string): GraphQLOutputType {
  switch (sqlType) {
    case 'integer':
    case 'bigInteger':
      return GraphQLInt;
    case 'float':
    case 'decimal':
      return GraphQLFloat;
    case 'boolean':
      return GraphQLBoolean;
    case 'json':
      return GraphQLJSON;
    default:
      return GraphQLString;
  }
}

function mapScalarInputType(sqlType: string): GraphQLInputType {
  return mapScalarOutputType(sqlType) as GraphQLInputType;
}

/**
 * Resolve the related collection name from a relation field.
 */
export function getRelatedCollectionName(field: FieldMeta): string | null {
  const related = field.options?.related_collection;
  return typeof related === 'string' && related.length > 0 ? related : null;
}
