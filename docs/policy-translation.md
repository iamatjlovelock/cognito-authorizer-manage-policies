# UX Policy to Cedar Policy Translation

This document describes how authorization policies defined in the Cognito User Group management UX translate to Cedar policies stored in Amazon Verified Permissions (AVP).

## Schema-Driven UX

The UX dynamically populates dropdown options by fetching the Cedar schema from Amazon Verified Permissions using the `GetSchema` API. This ensures the UX always reflects the actual policy store configuration.

### Fetching the Schema

```typescript
import { VerifiedPermissionsClient, GetSchemaCommand } from "@aws-sdk/client-verifiedpermissions";

const client = new VerifiedPermissionsClient({ region: "us-east-1" });
const response = await client.send(new GetSchemaCommand({
  policyStoreId: "your-policy-store-id"
}));

const schema = JSON.parse(response.schema);
```

### Schema Structure (JSON Format)

The AVP schema is returned in JSON format:

```json
{
  "MyNamespace": {
    "entityTypes": {
      "User": {
        "shape": {
          "type": "Record",
          "attributes": {
            "department": { "type": "String" },
            "role": { "type": "String" },
            "clearance_level": { "type": "String" }
          }
        },
        "memberOfTypes": ["CognitoGroup"]
      },
      "Contract": {
        "shape": {
          "type": "Record",
          "attributes": {
            "owner_department": { "type": "String" },
            "required_clearance": { "type": "String" }
          }
        }
      },
      "CognitoGroup": {}
    },
    "actions": {
      "Review": {
        "appliesTo": {
          "principalTypes": ["User"],
          "resourceTypes": ["Contract", "Document"]
        }
      },
      "Approve": {
        "appliesTo": {
          "principalTypes": ["User"],
          "resourceTypes": ["Contract"]
        }
      }
    }
  }
}
```

### Populating UX Dropdowns from Schema

| UX Dropdown | Schema Source |
|-------------|---------------|
| **Resource Type** | `entityTypes` keys (excluding principal types like `User`, `CognitoGroup`) |
| **Actions** | `actions` keys, filtered by selected resource type's `resourceTypes` |
| **User Attributes** | `entityTypes.User.shape.attributes` keys |
| **Resource Attributes** | `entityTypes[selectedResourceType].shape.attributes` keys |

### Example: Extracting Options from Schema

```typescript
interface SchemaNamespace {
  entityTypes: Record<string, EntityType>;
  actions: Record<string, ActionDef>;
}

function getResourceTypes(schema: SchemaNamespace): string[] {
  const principalTypes = new Set(['User', 'CognitoGroup']);
  return Object.keys(schema.entityTypes)
    .filter(type => !principalTypes.has(type));
}

function getActionsForResource(schema: SchemaNamespace, resourceType: string): string[] {
  return Object.entries(schema.actions)
    .filter(([_, action]) => action.appliesTo?.resourceTypes?.includes(resourceType))
    .map(([name]) => name);
}

function getUserAttributes(schema: SchemaNamespace): string[] {
  return Object.keys(schema.entityTypes.User?.shape?.attributes || {});
}

function getResourceAttributes(schema: SchemaNamespace, resourceType: string): string[] {
  return Object.keys(schema.entityTypes[resourceType]?.shape?.attributes || {});
}
```

## UX Policy Model

In the UX, an authorization policy consists of:

| Field | Description | Populated From | Stored In AVP As |
|-------|-------------|----------------|------------------|
| **Policy Name** | Unique identifier for the policy | User input | `@id` annotation on Cedar policy |
| **Description** | Human-readable explanation of the policy's purpose | User input | Policy `description` field in AVP |
| **Resource Type** | The type of resource the policy applies to | Schema `entityTypes` | Cedar `resource is` clause |
| **Actions** | Permitted actions on the resource | Schema `actions` (filtered by resource) | Cedar `action` clause |
| **Attribute Conditions** | Optional conditions comparing user and resource attributes | Schema attributes | Cedar `when` clause |

### Attribute Conditions

Each condition compares a left side attribute against a right side (attribute or static value):

- **Left Side**: Always an attribute from `principal.*` (User attributes) or `resource.*` (Resource attributes)
- **Right Side**: Can be either:
  - An **attribute** from `principal.*` or `resource.*`
  - A **static value** (string literal)
- **Operators**: `=` (equals), `!=` (not equals)

The combined attribute dropdown shows:
- `principal.department`, `principal.role`, etc. (from `entityTypes.User.shape.attributes`)
- `resource.owner_department`, `resource.status`, etc. (from `entityTypes[resourceType].shape.attributes`)

## Cedar Policy Structure

A Cedar policy has this structure:

```cedar
@id("policy-identifier")
permit (
    principal in GroupType::"group-name",
    action in [Action::"action1", Action::"action2"],
    resource is ResourceType
)
when {
    // attribute conditions
};
```

## Translation Rules

### 1. Policy Name and Description

The UX policy name and description are stored separately:

- **Policy Name** → Stored as a Cedar `@id` annotation within the policy statement
- **Description** → Stored in the AVP policy's `description` field (passed to `CreatePolicy` API)

```cedar
@id("read-contracts")
permit (
    ...
);
```

The `@id` annotation allows the policy name to be embedded in the Cedar policy itself, making it retrievable when parsing policies. The description is metadata stored by AVP alongside the policy.

### 2. Principal Clause

The Cognito user group is a group that a principal can be a member of.

| UX | Cedar |
|----|-------|
| Group: `team-project-rosie` | `principal in CognitoGroup::"team-project-rosie"` |

### 3. Action Clause

UX actions map to Cedar actions. Multiple actions use array syntax.

| UX Actions | Cedar |
|------------|-------|
| Single action | `action == Action::"Review"` |
| Multiple actions | `action in [Action::"Review", Action::"Approve"]` |

### 4. Resource Clause

The UX resource type (from schema) maps directly to a Cedar entity type:

```cedar
resource is Contract
resource is Document
```

### 5. Attribute Conditions (when clause)

Each UX condition translates to a Cedar comparison in the `when` clause. Multiple conditions are combined with `&&` (AND).

**Condition Types:**

| Left Side (Attribute) | Operator | Right Side Type | Right Side Value | Cedar Output |
|-----------------------|----------|-----------------|------------------|--------------|
| `principal.department` | = | Attribute | `resource.owner_department` | `principal.department == resource.owner_department` |
| `resource.status` | = | Static Value | `"approved"` | `resource.status == "approved"` |

**Examples:**

| UX Condition | Cedar |
|--------------|-------|
| `principal.department` = (Attribute) `resource.owner_department` | `principal.department == resource.owner_department` |
| `resource.status` = (Static) `"approved"` | `resource.status == "approved"` |
| `principal.clearance` = (Attribute) `resource.required_clearance` | `principal.clearance == resource.required_clearance` |

**Operator Mapping:**

| UX Operator | Cedar Operator |
|-------------|----------------|
| = (equals) | `==` |
| != (not equals) | `!=` |

## Complete Translation Examples

### Example 1: Simple Policy (No Conditions)

**UX Input:**
- Policy Name: `read-users`
- Resource Type: User
- Actions: Review
- Conditions: (none)

**Cedar Output:**
```cedar
@id("read-users")
permit (
    principal in CognitoGroup::"team-project-rosie",
    action == Action::"Review",
    resource is User
);
```

### Example 2: Policy with Multiple Actions

**UX Input:**
- Policy Name: `read-contracts`
- Resource Type: Contract
- Actions: Review, Approve
- Conditions: (none)

**Cedar Output:**
```cedar
@id("read-contracts")
permit (
    principal in CognitoGroup::"team-project-rosie",
    action in [Action::"Review", Action::"Approve"],
    resource is Contract
);
```

### Example 3: Policy with Attribute-to-Attribute Conditions

**UX Input:**
- Policy Name: `secure-contracts`
- Resource Type: Contract
- Actions: Review, Approve
- Conditions:
  - Left: `principal.department` (Attribute), Operator: `=`, Right: `resource.owner_department`
  - Left: `principal.clearance_level` (Attribute), Operator: `=`, Right: `resource.required_clearance`

**Cedar Output:**
```cedar
@id("secure-contracts")
permit (
    principal in CognitoGroup::"team-project-rosie",
    action in [Action::"Review", Action::"Approve"],
    resource is Contract
)
when {
    principal.department == resource.owner_department &&
    principal.clearance_level == resource.required_clearance
};
```

### Example 4: Policy with Static Value Condition

**UX Input:**
- Policy Name: `approved-contracts-only`
- Resource Type: Contract
- Actions: Review
- Conditions:
  - Left: `resource.status` (Attribute), Operator: `=`, Right: `"approved"` (Static value)

**Cedar Output:**
```cedar
@id("approved-contracts-only")
permit (
    principal in CognitoGroup::"team-project-rosie",
    action == Action::"Review",
    resource is Contract
)
when {
    resource.status == "approved"
};
```

### Example 5: Policy with Inequality Condition

**UX Input:**
- Policy Name: `cross-team-documents`
- Resource Type: Document
- Actions: Review, Share
- Conditions:
  - Left: `principal.team` (Attribute), Operator: `!=`, Right: `resource.owning_team`

**Cedar Output:**
```cedar
@id("cross-team-documents")
permit (
    principal in CognitoGroup::"team-project-rosie",
    action in [Action::"Review", Action::"Share"],
    resource is Document
)
when {
    principal.team != resource.owning_team
};
```

## Translation Function

```typescript
interface PolicyCondition {
  leftAttribute: string;    // e.g., "principal.department" or "resource.owner_department"
  operator: 'eq' | 'neq';
  rightType: 'attribute' | 'value';
  rightAttribute?: string;  // e.g., "principal.department" or "resource.owner_department"
  rightValue?: string;      // Static value when rightType is 'value'
}

interface UXPolicy {
  policyName: string;      // Stored as @id annotation in Cedar policy
  description: string;     // Stored as policy description in AVP
  resourceType: string;
  actions: string[];
  conditions: PolicyCondition[];
}

function translateToCedar(policy: UXPolicy, groupName: string, namespace: string): string {
  const lines: string[] = [];

  // Annotation
  lines.push(`@id("${policy.policyName}")`);

  // Effect and scope
  lines.push('permit (');
  lines.push(`    principal in ${namespace}::CognitoGroup::"${groupName}",`);

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

  // Conditions
  if (policy.conditions.length > 0) {
    lines.push('when {');
    const conditionStrs = policy.conditions.map(c => {
      const op = c.operator === 'eq' ? '==' : '!=';
      const rightSide = c.rightType === 'value' ? `"${c.rightValue}"` : c.rightAttribute;
      return `    ${c.leftAttribute} ${op} ${rightSide}`;
    });
    lines.push(conditionStrs.join(' &&\n'));
    lines.push('};');
  } else {
    // Replace last ')' with ');'
    lines[lines.length - 1] = ');';
  }

  return lines.join('\n');
}
```

## AVP API Integration

### Creating a Policy

The UX policy name is embedded as an `@id` annotation in the Cedar statement, while the UX description is passed to the AVP `description` field:

```typescript
import { CreatePolicyCommand } from "@aws-sdk/client-verifiedpermissions";

const cedarPolicy = translateToCedar(uxPolicy, groupName, namespace);
// cedarPolicy includes: @id("policy-name") as first line

await client.send(new CreatePolicyCommand({
  policyStoreId: "your-policy-store-id",
  definition: {
    static: {
      statement: cedarPolicy,           // Contains @id("policy-name") annotation
      description: uxPolicy.description // UX description field
    }
  }
}));
```

### Updating a Policy

Cedar policies are immutable in AVP. To "edit" a policy:

```typescript
import { DeletePolicyCommand, CreatePolicyCommand } from "@aws-sdk/client-verifiedpermissions";

// 1. Delete existing policy
await client.send(new DeletePolicyCommand({
  policyStoreId: "your-policy-store-id",
  policyId: existingPolicyId
}));

// 2. Create new policy with updated content
await client.send(new CreatePolicyCommand({
  policyStoreId: "your-policy-store-id",
  definition: {
    static: {
      statement: updatedCedarPolicy,
      description: uxPolicy.policyName
    }
  }
}));
```

### Listing Policies for a Group

```typescript
import { ListPoliciesCommand, GetPolicyCommand } from "@aws-sdk/client-verifiedpermissions";

const response = await client.send(new ListPoliciesCommand({
  policyStoreId: "your-policy-store-id",
  filter: {
    principal: {
      identifier: {
        entityType: `${namespace}::CognitoGroup`,
        entityId: groupName
      }
    }
  }
}));
```

### Extracting Policy Name from Cedar Statement

When reading policies back from AVP, extract the policy name from the `@id` annotation:

```typescript
function extractPolicyName(cedarStatement: string): string | null {
  const match = cedarStatement.match(/@id\("([^"]+)"\)/);
  return match ? match[1] : null;
}

// Usage when fetching a policy
const policyResponse = await client.send(new GetPolicyCommand({
  policyStoreId: "your-policy-store-id",
  policyId: "avp-generated-policy-id"
}));

const policyName = extractPolicyName(policyResponse.definition.static.statement);
const description = policyResponse.definition.static.description;
```

## Implementation Notes

### Namespace Handling

The Cedar schema uses a namespace (e.g., `MyNamespace`). All entity type and action references in policies must include this namespace:

- `MyNamespace::Contract` (not just `Contract`)
- `MyNamespace::Action::"Review"` (not just `Action::"Review"`)

Extract the namespace from the schema response (it's the top-level key).

### Display Names for Attributes

The schema contains attribute identifiers (e.g., `owner_department`). For better UX, consider:

1. Converting to title case: `owner_department` → `Owner department`
2. Maintaining a display name mapping in the application
3. Using Cedar schema annotations if available

### Attribute Type Handling

The schema includes attribute types. For conditions:

- **String attributes**: Use `==` and `!=` operators
- **Long (number) attributes**: Could support `<`, `>`, `<=`, `>=` operators
- **Boolean attributes**: Could support simple true/false conditions

The current UX supports string equality only. Extend based on schema attribute types if needed.

### Error Handling

When the schema fetch fails or is empty, the UX should:

1. Display an error message to the user
2. Disable the Add/Edit policy forms
3. Provide a retry option
