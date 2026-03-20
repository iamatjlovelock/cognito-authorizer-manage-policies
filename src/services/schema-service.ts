import { fetchApi } from './api-client';
import type { ParsedSchema, SchemaEntityType, SchemaAction, SchemaAttribute } from '../types/policy';

// Known principal entity types to exclude from resource types
const PRINCIPAL_TYPE_NAMES = ['User', 'CognitoGroup'];

let cachedSchema: ParsedSchema | null = null;

interface RawSchemaAttribute {
  type: string;
  required?: boolean;
  element?: { type: string };
  attributes?: Record<string, RawSchemaAttribute>;
}

interface RawEntityType {
  shape?: {
    type: string;
    attributes?: Record<string, RawSchemaAttribute>;
  };
  memberOfTypes?: string[];
}

interface RawAction {
  appliesTo?: {
    principalTypes?: string[];
    resourceTypes?: string[];
    context?: unknown;
  };
  memberOf?: Array<{ id: string }>;
}

interface RawSchema {
  [namespace: string]: {
    entityTypes?: Record<string, RawEntityType>;
    actions?: Record<string, RawAction>;
  };
}

function parseAttributes(rawAttributes: Record<string, RawSchemaAttribute> | undefined): SchemaAttribute[] {
  if (!rawAttributes) return [];

  return Object.entries(rawAttributes).map(([name, attr]) => ({
    name,
    type: attr.type,
    required: attr.required !== false,
  }));
}

function parseEntityTypes(
  rawEntityTypes: Record<string, RawEntityType> | undefined,
  filterPrincipalTypes: boolean
): SchemaEntityType[] {
  if (!rawEntityTypes) return [];

  return Object.entries(rawEntityTypes)
    .filter(([name]) => !filterPrincipalTypes || !PRINCIPAL_TYPE_NAMES.includes(name))
    .map(([name, entity]) => ({
      name,
      attributes: parseAttributes(entity.shape?.attributes),
      memberOfTypes: entity.memberOfTypes,
    }));
}

function parseActions(rawActions: Record<string, RawAction> | undefined): SchemaAction[] {
  if (!rawActions) return [];

  return Object.entries(rawActions).map(([name, action]) => ({
    name,
    principalTypes: action.appliesTo?.principalTypes || [],
    resourceTypes: action.appliesTo?.resourceTypes || [],
  }));
}

export async function fetchSchema(): Promise<ParsedSchema> {
  if (cachedSchema) {
    return cachedSchema;
  }

  const response = await fetchApi<{ schema: string }>('/schema');

  if (!response.schema) {
    throw new Error('No schema found in policy store');
  }

  const rawSchema: RawSchema = JSON.parse(response.schema);
  const namespace = Object.keys(rawSchema)[0];
  const schemaContent = rawSchema[namespace];

  cachedSchema = {
    namespace,
    principalTypes: parseEntityTypes(schemaContent.entityTypes, false)
      .filter(e => PRINCIPAL_TYPE_NAMES.includes(e.name) || e.memberOfTypes?.some(t => PRINCIPAL_TYPE_NAMES.includes(t))),
    resourceTypes: parseEntityTypes(schemaContent.entityTypes, true),
    actions: parseActions(schemaContent.actions),
  };

  return cachedSchema;
}

export function clearSchemaCache(): void {
  cachedSchema = null;
}

export function getActionsForResourceType(schema: ParsedSchema, resourceType: string): SchemaAction[] {
  return schema.actions.filter(action => action.resourceTypes.includes(resourceType));
}

export function getResourceAttributes(schema: ParsedSchema, resourceType: string): SchemaAttribute[] {
  const entity = schema.resourceTypes.find(e => e.name === resourceType);
  return entity?.attributes || [];
}

export function getUserAttributes(schema: ParsedSchema): SchemaAttribute[] {
  const user = schema.principalTypes.find(e => e.name === 'User');
  return user?.attributes || [];
}
