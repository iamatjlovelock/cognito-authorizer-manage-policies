export interface PolicyCondition {
  leftAttribute: string;    // e.g., "principal.department" or "resource.owner_department"
  operator: 'eq' | 'neq';
  rightType: 'attribute' | 'value';
  rightAttribute?: string;  // e.g., "principal.department" or "resource.owner_department"
  rightValue?: string;      // Static value when rightType is 'value'
}

export interface UXPolicy {
  policyId?: string;        // AVP-generated policy ID (undefined for new policies)
  policyName: string;       // Stored as @id annotation
  description: string;      // Stored as AVP policy description
  resourceType: string;
  actions: string[];
  conditions: PolicyCondition[];
}

export interface SchemaEntityType {
  name: string;
  attributes: SchemaAttribute[];
  memberOfTypes?: string[];
}

export interface SchemaAttribute {
  name: string;
  type: string;
  required?: boolean;
}

export interface SchemaAction {
  name: string;
  principalTypes: string[];
  resourceTypes: string[];
}

export interface ParsedSchema {
  namespace: string;
  principalTypes: SchemaEntityType[];
  resourceTypes: SchemaEntityType[];
  actions: SchemaAction[];
}
