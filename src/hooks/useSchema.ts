import { useState, useEffect } from 'react';
import { fetchSchema, getActionsForResourceType, getUserAttributes, getResourceAttributes } from '../services/schema-service';
import type { ParsedSchema, SchemaAttribute } from '../types/policy';

interface UseSchemaResult {
  schema: ParsedSchema | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSchema(): UseSchemaResult {
  const [schema, setSchema] = useState<ParsedSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchema = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSchema();
      setSchema(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchema();
  }, []);

  return { schema, loading, error, refetch: loadSchema };
}

export function useResourceTypes(schema: ParsedSchema | null): string[] {
  if (!schema) return [];
  return schema.resourceTypes.map(r => r.name);
}

export function useActionsForResource(schema: ParsedSchema | null, resourceType: string | null): string[] {
  if (!schema || !resourceType) return [];
  return getActionsForResourceType(schema, resourceType).map(a => a.name);
}

export function useUserAttributes(schema: ParsedSchema | null): SchemaAttribute[] {
  if (!schema) return [];
  return getUserAttributes(schema);
}

export function useResourceAttributesForType(schema: ParsedSchema | null, resourceType: string | null): SchemaAttribute[] {
  if (!schema || !resourceType) return [];
  return getResourceAttributes(schema, resourceType);
}
