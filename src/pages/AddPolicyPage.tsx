import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Form from '@cloudscape-design/components/form';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Select, { SelectProps } from '@cloudscape-design/components/select';
import Multiselect, { MultiselectProps } from '@cloudscape-design/components/multiselect';
import AttributeEditor, { AttributeEditorProps } from '@cloudscape-design/components/attribute-editor';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import Alert from '@cloudscape-design/components/alert';
import Spinner from '@cloudscape-design/components/spinner';
import Box from '@cloudscape-design/components/box';
import {
  useSchema,
  useResourceTypes,
  useActionsForResource,
  useUserAttributes,
  useResourceAttributesForType,
} from '../hooks/useSchema';
import { usePolicyMutations } from '../hooks/usePolicies';
import type { UXPolicy } from '../types/policy';

interface ConditionItem {
  leftAttribute: string;
  operator: string;
  rightType: 'attribute' | 'value';
  rightAttribute: string;
  rightValue: string;
}

interface FormErrors {
  policyName?: string;
  resourceType?: string;
  actions?: string;
  conditions?: {
    [key: number]: {
      leftAttribute?: string;
      rightSide?: string;
    };
  };
}

function AddPolicyPage() {
  const navigate = useNavigate();
  const { groupName } = useParams<{ groupName: string }>();

  // Fetch schema from AVP
  const { schema, loading: schemaLoading, error: schemaError } = useSchema();
  const resourceTypes = useResourceTypes(schema);

  const [policyName, setPolicyName] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState<SelectProps.Option | null>(null);
  const [actions, setActions] = useState<MultiselectProps.Options>([]);
  const [conditions, setConditions] = useState<ConditionItem[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  const { createPolicy, creating, error: createError } = usePolicyMutations();

  // Get actions available for selected resource type
  const availableActions = useActionsForResource(schema, resourceType?.value || null);
  const userAttributes = useUserAttributes(schema);
  const resourceAttributes = useResourceAttributesForType(schema, resourceType?.value || null);

  // Build dropdown options from schema
  const resourceTypeOptions: SelectProps.Options = useMemo(() =>
    resourceTypes.map(name => ({ label: name, value: name })),
    [resourceTypes]
  );

  const actionsOptions: MultiselectProps.Options = useMemo(() =>
    availableActions.map(name => ({ label: name, value: name })),
    [availableActions]
  );

  // Combined attribute options: User attributes (principal.*) and Resource attributes (resource.*)
  const combinedAttributeOptions: SelectProps.Options = useMemo(() => {
    const userOpts = userAttributes.map(attr => ({
      label: `principal.${attr.name}`,
      value: `principal.${attr.name}`,
      description: 'User attribute',
    }));
    const resourceOpts = resourceAttributes.map(attr => ({
      label: `resource.${attr.name}`,
      value: `resource.${attr.name}`,
      description: 'Resource attribute',
    }));
    return [...userOpts, ...resourceOpts];
  }, [userAttributes, resourceAttributes]);

  const operatorOptions: SelectProps.Options = [
    { label: '= (equals)', value: 'eq' },
    { label: '!= (not equals)', value: 'neq' },
  ];

  // Clear actions when resource type changes
  const handleResourceTypeChange = (option: SelectProps.Option) => {
    setResourceType(option);
    setActions([]); // Reset actions since they depend on resource type
    if (errors.resourceType) {
      setErrors({ ...errors, resourceType: undefined });
    }
  };

  const validatePolicyName = (name: string): string | undefined => {
    if (!name || name.trim() === '') {
      return 'Policy name is required.';
    }
    if (name.length < 1 || name.length > 128) {
      return 'Policy name must be 1-128 characters.';
    }
    const validPattern = /^[a-zA-Z0-9-]+$/;
    if (!validPattern.test(name)) {
      return 'Policy name can only contain a-z, A-Z, 0-9, and hyphens (-).';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    const policyNameError = validatePolicyName(policyName);
    if (policyNameError) {
      newErrors.policyName = policyNameError;
      isValid = false;
    }

    if (!resourceType) {
      newErrors.resourceType = 'Resource type is required.';
      isValid = false;
    }

    if (actions.length === 0) {
      newErrors.actions = 'At least one action must be selected.';
      isValid = false;
    }

    if (conditions.length > 0) {
      const conditionErrors: FormErrors['conditions'] = {};
      conditions.forEach((condition, index) => {
        const conditionError: { leftAttribute?: string; rightSide?: string } = {};
        if (!condition.leftAttribute) {
          conditionError.leftAttribute = 'Attribute is required.';
          isValid = false;
        }
        if (condition.rightType === 'attribute' && !condition.rightAttribute) {
          conditionError.rightSide = 'Attribute is required.';
          isValid = false;
        }
        if (condition.rightType === 'value' && !condition.rightValue) {
          conditionError.rightSide = 'Value is required.';
          isValid = false;
        }
        if (conditionError.leftAttribute || conditionError.rightSide) {
          conditionErrors[index] = conditionError;
        }
      });
      if (Object.keys(conditionErrors).length > 0) {
        newErrors.conditions = conditionErrors;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !groupName) return;

    const policy: UXPolicy = {
      policyName,
      description,
      resourceType: resourceType!.value!,
      actions: actions.map(a => a.value!),
      conditions: conditions.map(c => ({
        leftAttribute: c.leftAttribute,
        operator: c.operator as 'eq' | 'neq',
        rightType: c.rightType,
        rightAttribute: c.rightType === 'attribute' ? c.rightAttribute : undefined,
        rightValue: c.rightType === 'value' ? c.rightValue : undefined,
      })),
    };

    try {
      await createPolicy(policy, groupName);
      navigate(`/groups/${groupName}`);
    } catch (err) {
      console.error('Failed to create policy:', err);
    }
  };

  const handleCancel = () => {
    navigate(`/groups/${groupName}`);
  };

  const attributeEditorDefinition: AttributeEditorProps.FieldDefinition<ConditionItem>[] = [
    {
      label: 'Attribute',
      control: (item, itemIndex) => (
        <Select
          filteringType="auto"
          options={combinedAttributeOptions}
          placeholder="Choose attribute"
          selectedOption={
            item.leftAttribute
              ? combinedAttributeOptions.find((opt) => opt.value === item.leftAttribute) || null
              : null
          }
          onChange={({ detail }) => {
            const updatedConditions = [...conditions];
            updatedConditions[itemIndex] = {
              ...updatedConditions[itemIndex],
              leftAttribute: detail.selectedOption.value || '',
            };
            setConditions(updatedConditions);
          }}
        />
      ),
      errorText: (_item, itemIndex) => errors.conditions?.[itemIndex]?.leftAttribute,
    },
    {
      label: 'Operator',
      control: (item, itemIndex) => (
        <Select
          options={operatorOptions}
          selectedOption={
            item.operator
              ? operatorOptions.find((opt) => opt.value === item.operator) || operatorOptions[0]
              : operatorOptions[0]
          }
          onChange={({ detail }) => {
            const updatedConditions = [...conditions];
            updatedConditions[itemIndex] = {
              ...updatedConditions[itemIndex],
              operator: detail.selectedOption.value || 'eq',
            };
            setConditions(updatedConditions);
          }}
        />
      ),
    },
    {
      label: 'Value',
      control: (item, itemIndex) => (
        <SpaceBetween size="xs">
          <SpaceBetween size="xs" direction="horizontal">
            <div style={{ width: '100px', paddingTop: '6px' }}>
              <input
                type="radio"
                checked={item.rightType === 'attribute'}
                onChange={() => {
                  const updatedConditions = [...conditions];
                  updatedConditions[itemIndex] = {
                    ...updatedConditions[itemIndex],
                    rightType: 'attribute',
                  };
                  setConditions(updatedConditions);
                }}
              />
              <span style={{ marginLeft: '8px' }}>Attribute</span>
            </div>
            <Select
              filteringType="auto"
              options={combinedAttributeOptions}
              placeholder="Choose attribute"
              disabled={item.rightType !== 'attribute'}
              selectedOption={
                item.rightAttribute
                  ? combinedAttributeOptions.find((opt) => opt.value === item.rightAttribute) || null
                  : null
              }
              onChange={({ detail }) => {
                const updatedConditions = [...conditions];
                updatedConditions[itemIndex] = {
                  ...updatedConditions[itemIndex],
                  rightAttribute: detail.selectedOption.value || '',
                };
                setConditions(updatedConditions);
              }}
            />
          </SpaceBetween>
          <SpaceBetween size="xs" direction="horizontal">
            <div style={{ width: '100px', paddingTop: '6px' }}>
              <input
                type="radio"
                checked={item.rightType === 'value'}
                onChange={() => {
                  const updatedConditions = [...conditions];
                  updatedConditions[itemIndex] = {
                    ...updatedConditions[itemIndex],
                    rightType: 'value',
                  };
                  setConditions(updatedConditions);
                }}
              />
              <span style={{ marginLeft: '8px' }}>Static value</span>
            </div>
            <Input
              placeholder="Enter value"
              disabled={item.rightType !== 'value'}
              value={item.rightValue}
              onChange={({ detail }) => {
                const updatedConditions = [...conditions];
                updatedConditions[itemIndex] = {
                  ...updatedConditions[itemIndex],
                  rightValue: detail.value,
                };
                setConditions(updatedConditions);
              }}
            />
          </SpaceBetween>
        </SpaceBetween>
      ),
      errorText: (_item, itemIndex) => errors.conditions?.[itemIndex]?.rightSide,
    },
  ];

  if (schemaLoading) {
    return (
      <AppLayout
        content={
          <Container>
            <SpaceBetween size="m" alignItems="center">
              <Spinner size="large" />
              <Box>Loading schema...</Box>
            </SpaceBetween>
          </Container>
        }
      />
    );
  }

  return (
    <AppLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { href: '#', text: 'Amazon Cognito' },
            { href: '#', text: 'User pools' },
            { href: '#', text: 'contracts-management-users' },
            { href: '/groups', text: 'Groups' },
            { href: `/groups/${groupName}`, text: groupName || '' },
            { href: '#', text: 'Add authorization policy' },
          ]}
          onFollow={(event) => {
            event.preventDefault();
            if (event.detail.href && event.detail.href !== '#') {
              navigate(event.detail.href);
            }
          }}
        />
      }
      content={
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={handleCancel} disabled={creating}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit} disabled={creating || !!schemaError}>
                {creating ? <Spinner /> : 'Add authorization policy'}
              </Button>
            </SpaceBetween>
          }
          header={
            <Header
              description="Define a new authorization policy to control what actions members of this group can perform on specific resource types."
              variant="h1"
            >
              Add authorization policy
            </Header>
          }
        >
          <SpaceBetween size="l">
            {schemaError && (
              <Alert type="error" header="Error loading schema">
                {schemaError}. Please check your AWS credentials and try again.
              </Alert>
            )}
            {createError && (
              <Alert type="error" header="Error creating policy">
                {createError}
              </Alert>
            )}
            <Container
              header={
                <Header
                  description="Specify the name, resource type, and permitted actions for this authorization policy."
                  variant="h2"
                >
                  Policy details
                </Header>
              }
            >
              <SpaceBetween size="l">
                <FormField
                  constraintText="Valid characters are a-z, A-Z, 0-9, and hyphens (-). The name must be 1-128 characters."
                  description="Enter a unique name to identify this authorization policy."
                  label="Policy name"
                  errorText={errors.policyName}
                >
                  <Input
                    placeholder="my-authorization-policy"
                    value={policyName}
                    onChange={({ detail }) => {
                      setPolicyName(detail.value);
                      if (errors.policyName) {
                        setErrors({ ...errors, policyName: undefined });
                      }
                    }}
                  />
                </FormField>

                <FormField
                  description="Optionally provide a description to help others understand the purpose of this policy."
                  label={<span>Description <i>- optional</i></span>}
                >
                  <Input
                    placeholder="Describe what this policy allows"
                    value={description}
                    onChange={({ detail }) => setDescription(detail.value)}
                  />
                </FormField>

                <FormField
                  description="Select the type of resource this policy applies to."
                  label="Resource type"
                  errorText={errors.resourceType}
                >
                  <Select
                    filteringType="auto"
                    options={resourceTypeOptions}
                    placeholder="Choose a resource type"
                    selectedOption={resourceType}
                    onChange={({ detail }) => handleResourceTypeChange(detail.selectedOption)}
                    disabled={!!schemaError}
                  />
                </FormField>

                <FormField
                  description="Select one or more actions that members of this group are permitted to perform on the selected resource type."
                  label="Actions"
                  errorText={errors.actions}
                >
                  <Multiselect
                    filteringType="auto"
                    options={actionsOptions}
                    placeholder={resourceType ? 'Choose actions' : 'Select a resource type first'}
                    selectedOptions={actions}
                    onChange={({ detail }) => {
                      setActions([...detail.selectedOptions]);
                      if (errors.actions) {
                        setErrors({ ...errors, actions: undefined });
                      }
                    }}
                    disabled={!resourceType || !!schemaError}
                  />
                </FormField>
              </SpaceBetween>
            </Container>

            <Container
              header={
                <Header
                  description="Define conditions that compare user attributes against resource attributes. A user must satisfy all conditions to be granted access."
                  variant="h2"
                >
                  Attribute conditions
                </Header>
              }
            >
              <AttributeEditor
                addButtonText="Add condition"
                definition={attributeEditorDefinition}
                empty="No conditions added. Add a condition to further restrict access based on user and resource attributes."
                items={conditions}
                removeButtonText="Remove"
                isItemRemovable={() => true}
                onAddButtonClick={() => {
                  setConditions([
                    ...conditions,
                    { leftAttribute: '', operator: 'eq', rightType: 'attribute', rightAttribute: '', rightValue: '' },
                  ]);
                }}
                onRemoveButtonClick={({ detail }) => {
                  const updatedConditions = conditions.filter(
                    (_, index) => index !== detail.itemIndex
                  );
                  setConditions(updatedConditions);
                  if (errors.conditions) {
                    const newConditionErrors = { ...errors.conditions };
                    delete newConditionErrors[detail.itemIndex];
                    setErrors({ ...errors, conditions: newConditionErrors });
                  }
                }}
              />
            </Container>
          </SpaceBetween>
        </Form>
      }
      contentType="form"
      navigation={
        <SideNavigation
          activeHref="#/groups"
          header={{ href: '#', text: 'Amazon Cognito' }}
          items={[
            { href: '#/overview', text: 'Overview', type: 'link' },
            {
              defaultExpanded: true,
              items: [{ href: '#/app-clients', text: 'App clients', type: 'link' }],
              text: 'Applications',
              type: 'section',
            },
            {
              defaultExpanded: true,
              items: [
                { href: '#/users', text: 'Users', type: 'link' },
                { href: '#/groups', text: 'Groups', type: 'link' },
              ],
              text: 'User management',
              type: 'section',
            },
            {
              defaultExpanded: true,
              items: [
                { href: '#/auth-methods', text: 'Authentication methods', type: 'link' },
                { href: '#/sign-in', text: 'Sign-in', type: 'link' },
                { href: '#/sign-up', text: 'Sign-up', type: 'link' },
                { href: '#/social-providers', text: 'Social and external providers', type: 'link' },
                { href: '#/extensions', text: 'Extensions', type: 'link' },
              ],
              text: 'Authentication',
              type: 'section',
            },
          ]}
        />
      }
    />
  );
}

export default AddPolicyPage;
