import { fetchApi } from './api-client';
import { fetchSchema, getUserAttributes, getResourceAttributes } from './schema-service';
import type { UXPolicy, PolicyCondition, ParsedSchema, SchemaAttribute } from '../types/policy';

interface PolicyItem {
  policyId: string;
  policyType: string;
  principal?: { identifier?: { entityType: string; entityId: string } };
  resource?: { identifier?: { entityType: string; entityId: string } };
  definition?: { static?: { statement?: string; description?: string } };
}

interface GetPolicyResponse {
  policyId: string;
  definition?: { static?: { statement: string; description?: string } };
}

// Extract policy name from @id annotation in Cedar statement
function extractPolicyName(cedarStatement: string): string | null {
  const match = cedarStatement.match(/@id\("([^"]+)"\)/);
  return match ? match[1] : null;
}

// Extract resource type from Cedar statement
function extractResourceType(cedarStatement: string, namespace: string): string | null {
  const pattern = new RegExp(`resource\\s+is\\s+${namespace}::(\\w+)`);
  const match = cedarStatement.match(pattern);
  if (match) return match[1];

  // Fallback without namespace
  const fallbackMatch = cedarStatement.match(/resource\s+is\s+(\w+):?:?(\w+)?/);
  return fallbackMatch ? (fallbackMatch[2] || fallbackMatch[1]) : null;
}

// Extract actions from Cedar statement
function extractActions(cedarStatement: string): string[] {
  // Single action: action == Namespace::Action::"ActionName"
  const singleMatch = cedarStatement.match(/action\s*==\s*\w+::Action::"(\w+)"/);
  if (singleMatch) {
    return [singleMatch[1]];
  }

  // Multiple actions: action in [Namespace::Action::"A1", Namespace::Action::"A2"]
  const multiMatch = cedarStatement.match(/action\s+in\s+\[([^\]]+)\]/);
  if (multiMatch) {
    const actionMatches = multiMatch[1].matchAll(/Action::"(\w+)"/g);
    return Array.from(actionMatches).map(m => m[1]);
  }

  return [];
}

// Extract conditions from when clause
function extractConditions(cedarStatement: string): PolicyCondition[] {
  const whenMatch = cedarStatement.match(/when\s*\{([^}]+)\}/);
  if (!whenMatch) return [];

  const conditions: PolicyCondition[] = [];
  const conditionText = whenMatch[1];

  // Match attribute == attribute patterns (principal.x or resource.x on both sides)
  const attrAttrRegex = /(principal|resource)\.(\w+)\s*(==|!=)\s*(principal|resource)\.(\w+)/g;
  let match;

  while ((match = attrAttrRegex.exec(conditionText)) !== null) {
    conditions.push({
      leftAttribute: `${match[1]}.${match[2]}`,
      operator: match[3] === '==' ? 'eq' : 'neq',
      rightType: 'attribute',
      rightAttribute: `${match[4]}.${match[5]}`,
    });
  }

  // Match attribute == "value" patterns
  const attrValueRegex = /(principal|resource)\.(\w+)\s*(==|!=)\s*"([^"]+)"/g;
  while ((match = attrValueRegex.exec(conditionText)) !== null) {
    conditions.push({
      leftAttribute: `${match[1]}.${match[2]}`,
      operator: match[3] === '==' ? 'eq' : 'neq',
      rightType: 'value',
      rightValue: match[4],
    });
  }

  // Match "value" == attribute patterns (convert to attribute on left for consistency)
  const valueAttrRegex = /"([^"]+)"\s*(==|!=)\s*(principal|resource)\.(\w+)/g;
  while ((match = valueAttrRegex.exec(conditionText)) !== null) {
    conditions.push({
      leftAttribute: `${match[3]}.${match[4]}`,
      operator: match[2] === '==' ? 'eq' : 'neq',
      rightType: 'value',
      rightValue: match[1],
    });
  }

  return conditions;
}

// Parse Cedar statement into UXPolicy
function parseCedarToUXPolicy(policyId: string, cedarStatement: string, description: string, namespace: string): UXPolicy | null {
  const policyName = extractPolicyName(cedarStatement);
  if (!policyName) return null;

  const resourceType = extractResourceType(cedarStatement, namespace);
  if (!resourceType) return null;

  return {
    policyId,
    policyName,
    description: description || '',
    resourceType,
    actions: extractActions(cedarStatement),
    conditions: extractConditions(cedarStatement),
  };
}

// Check if an attribute is optional in the schema
function isAttributeOptional(
  schema: ParsedSchema,
  entityRef: string,
  attributeName: string,
  resourceTypeName?: string
): boolean {
  // entityRef is like "principal" or "resource"
  let attributes: SchemaAttribute[] = [];

  if (entityRef === 'principal') {
    attributes = getUserAttributes(schema);
  } else if (entityRef === 'resource' && resourceTypeName) {
    attributes = getResourceAttributes(schema, resourceTypeName);
  }

  const attr = attributes.find(a => a.name === attributeName);
  // If attribute not found or required is explicitly false, it's optional
  return attr ? attr.required === false : false;
}

// Build has-checks needed for a condition with optional attributes
function buildHasChecks(
  schema: ParsedSchema,
  condition: PolicyCondition,
  resourceTypeName: string
): string[] {
  const hasChecks: string[] = [];

  // Parse left attribute (e.g., "principal.Region" -> entity="principal", attr="Region")
  const leftParts = condition.leftAttribute.split('.');
  if (leftParts.length === 2) {
    const [leftEntity, leftAttr] = leftParts;
    if (isAttributeOptional(schema, leftEntity, leftAttr, resourceTypeName)) {
      hasChecks.push(`${leftEntity} has ${leftAttr}`);
    }
  }

  // Parse right attribute if it's an attribute comparison
  if (condition.rightType === 'attribute' && condition.rightAttribute) {
    const rightParts = condition.rightAttribute.split('.');
    if (rightParts.length === 2) {
      const [rightEntity, rightAttr] = rightParts;
      if (isAttributeOptional(schema, rightEntity, rightAttr, resourceTypeName)) {
        hasChecks.push(`${rightEntity} has ${rightAttr}`);
      }
    }
  }

  return hasChecks;
}

// Convert UXPolicy to Cedar statement for a group principal
export function translateToCedar(policy: UXPolicy, groupName: string, namespace: string, schema?: ParsedSchema): string {
  return translateToCedarWithPrincipal(
    policy,
    `${namespace}::CognitoGroup::"${groupName}"`,
    'in',
    namespace,
    schema
  );
}

// Convert UXPolicy to Cedar statement for a user principal
export function translateToCedarForUser(policy: UXPolicy, userId: string, namespace: string, schema?: ParsedSchema): string {
  return translateToCedarWithPrincipal(
    policy,
    `${namespace}::User::"${userId}"`,
    '==',
    namespace,
    schema
  );
}

// Internal function to build Cedar statement with configurable principal
function translateToCedarWithPrincipal(
  policy: UXPolicy,
  principalRef: string,
  principalOp: string,
  namespace: string,
  schema?: ParsedSchema
): string {
  const lines: string[] = [];

  // Annotation with policy name
  lines.push(`@id("${policy.policyName}")`);

  // Permit statement
  lines.push('permit (');
  lines.push(`    principal ${principalOp} ${principalRef},`);

  // Actions
  if (policy.actions.length === 1) {
    lines.push(`    action == ${namespace}::Action::"${policy.actions[0]}",`);
  } else {
    const actionList = policy.actions.map(a => `${namespace}::Action::"${a}"`).join(', ');
    lines.push(`    action in [${actionList}],`);
  }

  // Resource
  lines.push(`    resource is ${namespace}::${policy.resourceType}`);
  lines.push(')');

  // Conditions - filter out incomplete conditions
  const validConditions = policy.conditions.filter(c => {
    if (!c.leftAttribute) return false;
    if (c.rightType === 'value' && !c.rightValue) return false;
    if (c.rightType === 'attribute' && !c.rightAttribute) return false;
    return true;
  });

  if (validConditions.length > 0) {
    lines.push('when {');
    const conditionStrs = validConditions.map(c => {
      const op = c.operator === 'eq' ? '==' : '!=';
      const rightSide = c.rightType === 'value' ? `"${c.rightValue}"` : c.rightAttribute;
      const comparison = `${c.leftAttribute} ${op} ${rightSide}`;

      // Add has-checks for optional attributes if schema is provided
      if (schema) {
        const hasChecks = buildHasChecks(schema, c, policy.resourceType);
        if (hasChecks.length > 0) {
          return `    ${hasChecks.join(' && ')} && ${comparison}`;
        }
      }

      return `    ${comparison}`;
    });
    lines.push(conditionStrs.join(' &&\n'));
    lines.push('};');
  } else {
    lines[lines.length - 1] = ');';
  }

  return lines.join('\n');
}

// List policies for a specific Cognito group
export async function listPoliciesForGroup(groupName: string): Promise<UXPolicy[]> {
  const schema = await fetchSchema();

  const response = await fetchApi<{ policies: PolicyItem[] }>(
    `/policies?groupName=${encodeURIComponent(groupName)}&namespace=${encodeURIComponent(schema.namespace)}`
  );

  const policies: UXPolicy[] = [];

  for (const policyItem of response.policies || []) {
    if (policyItem.policyId) {
      // Fetch full policy to get the Cedar statement
      const fullPolicy = await fetchApi<GetPolicyResponse>(`/policies/${policyItem.policyId}`);

      if (fullPolicy.definition?.static?.statement) {
        const uxPolicy = parseCedarToUXPolicy(
          policyItem.policyId,
          fullPolicy.definition.static.statement,
          fullPolicy.definition.static.description || '',
          schema.namespace
        );
        if (uxPolicy) {
          policies.push(uxPolicy);
        }
      }
    }
  }

  return policies;
}

// Get a single policy by ID
export async function getPolicy(policyId: string): Promise<UXPolicy | null> {
  const schema = await fetchSchema();
  const response = await fetchApi<GetPolicyResponse>(`/policies/${policyId}`);

  if (!response.definition?.static?.statement) {
    return null;
  }

  return parseCedarToUXPolicy(
    policyId,
    response.definition.static.statement,
    response.definition.static.description || '',
    schema.namespace
  );
}

// Create a new policy
export async function createPolicy(policy: UXPolicy, groupName: string): Promise<string> {
  const schema = await fetchSchema();
  const cedarStatement = translateToCedar(policy, groupName, schema.namespace, schema);

  const response = await fetchApi<{ policyId: string }>('/policies', {
    method: 'POST',
    body: JSON.stringify({
      statement: cedarStatement,
      description: policy.description,
    }),
  });

  if (!response.policyId) {
    throw new Error('Failed to create policy - no policy ID returned');
  }

  return response.policyId;
}

// Update a policy (delete and recreate since Cedar policies are immutable)
export async function updatePolicy(policy: UXPolicy, groupName: string): Promise<string> {
  if (!policy.policyId) {
    throw new Error('Cannot update policy without policyId');
  }

  // Delete existing policy
  await fetchApi(`/policies/${policy.policyId}`, { method: 'DELETE' });

  // Create new policy with updated content
  return createPolicy(policy, groupName);
}

// Delete a policy
export async function deletePolicy(policyId: string): Promise<void> {
  await fetchApi(`/policies/${policyId}`, { method: 'DELETE' });
}

// List policies for a specific user (by their sub/userId)
export async function listPoliciesForUser(userId: string): Promise<UXPolicy[]> {
  const schema = await fetchSchema();

  const response = await fetchApi<{ policies: PolicyItem[] }>(
    `/policies?userId=${encodeURIComponent(userId)}&namespace=${encodeURIComponent(schema.namespace)}`
  );

  const policies: UXPolicy[] = [];

  for (const policyItem of response.policies || []) {
    if (policyItem.policyId) {
      // Fetch full policy to get the Cedar statement
      const fullPolicy = await fetchApi<GetPolicyResponse>(`/policies/${policyItem.policyId}`);

      if (fullPolicy.definition?.static?.statement) {
        const uxPolicy = parseCedarToUXPolicy(
          policyItem.policyId,
          fullPolicy.definition.static.statement,
          fullPolicy.definition.static.description || '',
          schema.namespace
        );
        if (uxPolicy) {
          policies.push(uxPolicy);
        }
      }
    }
  }

  return policies;
}

// Create a new policy for a user
export async function createPolicyForUser(policy: UXPolicy, userId: string): Promise<string> {
  const schema = await fetchSchema();
  const cedarStatement = translateToCedarForUser(policy, userId, schema.namespace, schema);

  const response = await fetchApi<{ policyId: string }>('/policies', {
    method: 'POST',
    body: JSON.stringify({
      statement: cedarStatement,
      description: policy.description,
    }),
  });

  if (!response.policyId) {
    throw new Error('Failed to create policy - no policy ID returned');
  }

  return response.policyId;
}

// Update a policy for a user (delete and recreate since Cedar policies are immutable)
export async function updatePolicyForUser(policy: UXPolicy, userId: string): Promise<string> {
  if (!policy.policyId) {
    throw new Error('Cannot update policy without policyId');
  }

  // Delete existing policy
  await fetchApi(`/policies/${policy.policyId}`, { method: 'DELETE' });

  // Create new policy with updated content
  return createPolicyForUser(policy, userId);
}
