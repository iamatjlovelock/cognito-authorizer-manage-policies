import { useState, useMemo, useEffect } from 'react';
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
import AttributeEditor from '@cloudscape-design/components/attribute-editor';
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
import { usePolicy, useUserPolicyMutations } from '../hooks/usePolicies';
import { fetchApi } from '../services/api-client';
import type { UXPolicy } from '../types/policy';

interface AttributeCondition {
  leftAttribute: SelectProps.Option | null;
  operator: SelectProps.Option | null;
  rightType: 'attribute' | 'value';
  rightAttribute: SelectProps.Option | null;
  rightValue: string;
}

interface FormErrors {
  policyName?: string;
  resourceType?: string;
  actions?: string;
}

interface UserDetails {
  userId: string;
}

function EditUserPolicyPage() {
  const navigate = useNavigate();
  const { username, policyId } = useParams<{ username: string; policyId: string }>();

  // Fetch user details to get the userId (sub)
  const [userId, setUserId] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setUserLoading(false);
      return;
    }

    const loadUser = async () => {
      setUserLoading(true);
      setUserError(null);
      try {
        const result = await fetchApi<UserDetails>(`/users/${encodeURIComponent(username)}`);
        setUserId(result.userId);
      } catch (err) {
        setUserError(err instanceof Error ? err.message : 'Failed to load user details');
      } finally {
        setUserLoading(false);
      }
    };

    loadUser();
  }, [username]);

  // Fetch schema and policy from AVP
  const { schema, loading: schemaLoading, error: schemaError } = useSchema();
  const { policy, loading: policyLoading, error: policyError } = usePolicy(policyId);
  const { updatePolicy, updating, error: updateError } = useUserPolicyMutations();

  const resourceTypes = useResourceTypes(schema);

  // Form state
  const [policyName, setPolicyName] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState<SelectProps.Option | null>(null);
  const [actions, setActions] = useState<MultiselectProps.Option[]>([]);
  const [conditions, setConditions] = useState<AttributeCondition[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [initialized, setInitialized] = useState(false);

  // Get schema-based options
  const availableActions = useActionsForResource(schema, resourceType?.value || null);
  const userAttributes = useUserAttributes(schema);
  const resourceAttributes = useResourceAttributesForType(schema, resourceType?.value || null);

  // Build dropdown options
  const resourceTypeOptions: SelectProps.Options = useMemo(() =>
    resourceTypes.map(name => ({ label: name, value: name })),
    [resourceTypes]
  );

  const actionsOptions: MultiselectProps.Options = useMemo(() =>
    availableActions.map(name => ({ label: name, value: name })),
    [availableActions]
  );

  // Combined attribute options: User attributes (principal.*) and Resource attributes (resource.*)
  const combinedAttributeOptions: SelectProps.Option[] = useMemo(() => {
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

  const operatorOptions: SelectProps.Option[] = [
    { label: '= (equals)', value: 'eq' },
    { label: '!= (not equals)', value: 'neq' },
  ];

  // Initialize form with policy data
  useEffect(() => {
    if (policy && schema && !initialized) {
      setPolicyName(policy.policyName);
      setDescription(policy.description);
      setResourceType({ label: policy.resourceType, value: policy.resourceType });
      setActions(policy.actions.map(a => ({ label: a, value: a })));
      setConditions(policy.conditions.map(c => ({
        leftAttribute: c.leftAttribute ? { label: c.leftAttribute, value: c.leftAttribute } : null,
        operator: operatorOptions.find(o => o.value === c.operator) || operatorOptions[0],
        rightType: c.rightType,
        rightAttribute: c.rightAttribute ? { label: c.rightAttribute, value: c.rightAttribute } : null,
        rightValue: c.rightValue || '',
      })));
      setInitialized(true);
    }
  }, [policy, schema, initialized]);

  const validatePolicyName = (name: string): string | undefined => {
    if (!name || name.trim() === '') {
      return 'Policy name is required.';
    }
    const validCharacters = /^[a-zA-Z0-9-]+$/;
    if (!validCharacters.test(name)) {
      return 'Policy name can only contain a-z, A-Z, 0-9, and hyphens (-).';
    }
    if (name.length < 1 || name.length > 128) {
      return 'Policy name must be 1-128 characters.';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const policyNameError = validatePolicyName(policyName);
    if (policyNameError) {
      newErrors.policyName = policyNameError;
    }

    if (!resourceType) {
      newErrors.resourceType = 'Resource type is required.';
    }

    if (!actions || actions.length === 0) {
      newErrors.actions = 'At least one action must be selected.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !userId || !policyId) return;

    const updatedPolicy: UXPolicy = {
      policyId,
      policyName,
      description,
      resourceType: resourceType!.value!,
      actions: actions.map(a => a.value!),
      conditions: conditions
        .filter(c => c.leftAttribute && (c.rightType === 'attribute' ? c.rightAttribute : c.rightValue))
        .map(c => ({
          leftAttribute: c.leftAttribute!.value!,
          operator: (c.operator?.value || 'eq') as 'eq' | 'neq',
          rightType: c.rightType,
          rightAttribute: c.rightType === 'attribute' ? c.rightAttribute?.value : undefined,
          rightValue: c.rightType === 'value' ? c.rightValue : undefined,
        })),
    };

    try {
      await updatePolicy(updatedPolicy, userId);
      navigate(`/users/${encodeURIComponent(username || '')}`);
    } catch (err) {
      console.error('Failed to update policy:', err);
    }
  };

  const handleCancel = () => {
    navigate(`/users/${encodeURIComponent(username || '')}`);
  };

  const handleResourceTypeChange = (option: SelectProps.Option) => {
    setResourceType(option);
    setActions([]); // Reset actions since they depend on resource type
    if (errors.resourceType) {
      setErrors({ ...errors, resourceType: undefined });
    }
  };

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        leftAttribute: null,
        operator: operatorOptions[0],
        rightType: 'attribute',
        rightAttribute: null,
        rightValue: '',
      },
    ]);
  };

  const handleRemoveCondition = (itemIndex: number) => {
    setConditions(conditions.filter((_, index) => index !== itemIndex));
  };

  const updateCondition = (
    itemIndex: number,
    field: keyof AttributeCondition,
    value: SelectProps.Option | null | string
  ) => {
    const updatedConditions = [...conditions];
    updatedConditions[itemIndex] = {
      ...updatedConditions[itemIndex],
      [field]: value,
    };
    setConditions(updatedConditions);
  };

  const isLoading = schemaLoading || policyLoading || userLoading;
  const loadError = schemaError || policyError || userError;

  if (isLoading) {
    return (
      <AppLayout
        content={
          <Container>
            <SpaceBetween size="m" alignItems="center">
              <Spinner size="large" />
              <Box>Loading policy...</Box>
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
            { href: '/users', text: 'Users' },
            { href: `/users/${encodeURIComponent(username || '')}`, text: `User: ${userId || username}` },
            { href: '#', text: 'Edit authorization policy' },
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
              <Button variant="link" onClick={handleCancel} disabled={updating}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={updating || !!loadError || !userId}>
                {updating ? <Spinner /> : 'Save changes'}
              </Button>
            </SpaceBetween>
          }
          header={
            <Header
              description={`Update the authorization policy for this user. The policy uses: principal == Namespace::User::"${userId || '...'}"`}
              variant="h1"
            >
              Edit user authorization policy
            </Header>
          }
        >
          <SpaceBetween size="l">
            {loadError && (
              <Alert type="error" header="Error loading data">
                {loadError}. Please check your AWS credentials and try again.
              </Alert>
            )}
            {updateError && (
              <Alert type="error" header="Error updating policy">
                {updateError}
              </Alert>
            )}
            <Container
              header={
                <Header
                  description="Update the name, resource type, and permitted actions for this authorization policy."
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
                    onChange={(event) => {
                      setPolicyName(event.detail.value);
                      if (errors.policyName) {
                        const error = validatePolicyName(event.detail.value);
                        setErrors({ ...errors, policyName: error });
                      }
                    }}
                    onBlur={() => {
                      const error = validatePolicyName(policyName);
                      if (error) {
                        setErrors({ ...errors, policyName: error });
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
                    selectedOption={resourceType}
                    onChange={(event) => handleResourceTypeChange(event.detail.selectedOption)}
                    placeholder="Choose resource type"
                    disabled={!!loadError}
                  />
                </FormField>

                <FormField
                  description="Select one or more actions that this user is permitted to perform on the selected resource type."
                  label="Actions"
                  errorText={errors.actions}
                >
                  <Multiselect
                    filteringType="auto"
                    options={actionsOptions}
                    placeholder={resourceType ? 'Choose actions' : 'Select a resource type first'}
                    selectedOptions={actions}
                    onChange={(event) => {
                      setActions([...event.detail.selectedOptions]);
                      if (errors.actions && event.detail.selectedOptions.length > 0) {
                        setErrors({ ...errors, actions: undefined });
                      }
                    }}
                    disabled={!resourceType || !!loadError}
                  />
                </FormField>
              </SpaceBetween>
            </Container>

            <Container
              header={
                <Header
                  description="Define conditions that compare user attributes against resource attributes. The user must satisfy all conditions to be granted access."
                  variant="h2"
                >
                  Attribute conditions
                </Header>
              }
            >
              <AttributeEditor
                addButtonText="Add condition"
                onAddButtonClick={handleAddCondition}
                onRemoveButtonClick={(event) => handleRemoveCondition(event.detail.itemIndex)}
                items={conditions}
                removeButtonText="Remove"
                isItemRemovable={() => true}
                empty="No conditions added. Add a condition to further restrict access based on user and resource attributes."
                definition={[
                  {
                    label: 'Attribute',
                    control: (item, itemIndex) => (
                      <Select
                        filteringType="auto"
                        options={combinedAttributeOptions}
                        placeholder="Choose attribute"
                        selectedOption={item.leftAttribute}
                        onChange={(event) => {
                          updateCondition(itemIndex, 'leftAttribute', event.detail.selectedOption);
                        }}
                      />
                    ),
                  },
                  {
                    label: 'Operator',
                    control: (item, itemIndex) => (
                      <Select
                        options={operatorOptions}
                        selectedOption={item.operator}
                        onChange={(event) => {
                          updateCondition(itemIndex, 'operator', event.detail.selectedOption);
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
                                updateCondition(itemIndex, 'rightType', 'attribute');
                              }}
                            />
                            <span style={{ marginLeft: '8px' }}>Attribute</span>
                          </div>
                          <Select
                            filteringType="auto"
                            options={combinedAttributeOptions}
                            placeholder="Choose attribute"
                            disabled={item.rightType !== 'attribute'}
                            selectedOption={item.rightAttribute}
                            onChange={(event) => {
                              updateCondition(itemIndex, 'rightAttribute', event.detail.selectedOption);
                            }}
                          />
                        </SpaceBetween>
                        <SpaceBetween size="xs" direction="horizontal">
                          <div style={{ width: '100px', paddingTop: '6px' }}>
                            <input
                              type="radio"
                              checked={item.rightType === 'value'}
                              onChange={() => {
                                updateCondition(itemIndex, 'rightType', 'value');
                              }}
                            />
                            <span style={{ marginLeft: '8px' }}>Static value</span>
                          </div>
                          <Input
                            placeholder="Enter value"
                            disabled={item.rightType !== 'value'}
                            value={item.rightValue}
                            onChange={(event) => {
                              updateCondition(itemIndex, 'rightValue', event.detail.value);
                            }}
                          />
                        </SpaceBetween>
                      </SpaceBetween>
                    ),
                  },
                ]}
              />
            </Container>
          </SpaceBetween>
        </Form>
      }
      contentType="form"
      navigation={
        <SideNavigation
          activeHref="/users"
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
                { href: '/users', text: 'Users', type: 'link' },
                { href: '/groups', text: 'Groups', type: 'link' },
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
          onFollow={(event) => {
            if (!event.detail.external && event.detail.href.startsWith('/')) {
              event.preventDefault();
              navigate(event.detail.href);
            }
          }}
        />
      }
    />
  );
}

export default EditUserPolicyPage;
