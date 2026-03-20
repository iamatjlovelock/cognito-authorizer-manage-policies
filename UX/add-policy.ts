import React, { useState } from "react";
import AppLayoutToolbar from "@amzn/awsui-components-console/app-layout-toolbar";
import BreadcrumbGroup from "@amzn/awsui-components-console/breadcrumb-group";
import Form from "@amzn/awsui-components-console/form";
import SpaceBetween from "@amzn/awsui-components-console/space-between";
import Button from "@amzn/awsui-components-console/button";
import Header from "@amzn/awsui-components-console/header";
import Container from "@amzn/awsui-components-console/container";
import FormField from "@amzn/awsui-components-console/form-field";
import Input from "@amzn/awsui-components-console/input";
import Select, { SelectProps } from "@amzn/awsui-components-console/select";
import Multiselect, {
  MultiselectProps,
} from "@amzn/awsui-components-console/multiselect";
import AttributeEditor, {
  AttributeEditorProps,
} from "@amzn/awsui-components-console/attribute-editor";
import SideNavigation from "@amzn/awsui-components-console/side-navigation";
interface ConditionItem {
  userAttribute: string;
  operator: string;
  resourceAttribute: string;
}
interface FormErrors {
  policyName?: string;
  resourceType?: string;
  actions?: string;
  conditions?: {
    [key: number]: {
      userAttribute?: string;
      resourceAttribute?: string;
    };
  };
}
function AddAuthorizationPolicy() {
  const [policyName, setPolicyName] = useState("");
  const [resourceType, setResourceType] = useState<SelectProps.Option | null>(
    null,
  );
  const [actions, setActions] = useState<MultiselectProps.Options>([]);
  const [conditions, setConditions] = useState<ConditionItem[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const resourceTypeOptions: SelectProps.Options = [
    {
      label: "Contract",
      value: "contract",
    },
    {
      label: "User",
      value: "user",
    },
    {
      label: "Document",
      value: "document",
    },
    {
      label: "Report",
      value: "report",
    },
    {
      label: "Workflow",
      value: "workflow",
    },
  ];
  const actionsOptions: MultiselectProps.Options = [
    {
      label: "Review",
      value: "review",
    },
    {
      label: "Approve",
      value: "approve",
    },
    {
      label: "Edit",
      value: "edit",
    },
    {
      label: "Archive",
      value: "archive",
    },
    {
      label: "Create",
      value: "create",
    },
    {
      label: "Delete",
      value: "delete",
    },
    {
      label: "Share",
      value: "share",
    },
  ];
  const userAttributeOptions: SelectProps.Options = [
    {
      label: "Department",
      value: "department",
    },
    {
      label: "Role",
      value: "role",
    },
    {
      label: "Team",
      value: "team",
    },
    {
      label: "Clearance level",
      value: "clearance_level",
    },
    {
      label: "Office location",
      value: "office_location",
    },
    {
      label: "Employment type",
      value: "employment_type",
    },
  ];
  const operatorOptions: SelectProps.Options = [
    {
      label: "= (equals)",
      value: "eq",
    },
    {
      label: "!= (not equals)",
      value: "neq",
    },
  ];
  const resourceAttributeOptions: SelectProps.Options = [
    {
      label: "Owner department",
      value: "owner_department",
    },
    {
      label: "Assigned role",
      value: "assigned_role",
    },
    {
      label: "Owning team",
      value: "owning_team",
    },
    {
      label: "Required clearance",
      value: "required_clearance",
    },
    {
      label: "Office location",
      value: "office_location",
    },
    {
      label: "Access tier",
      value: "access_tier",
    },
  ];
  const validatePolicyName = (name: string): string | undefined => {
    if (!name || name.trim() === "") {
      return "Policy name is required.";
    }
    if (name.length < 1 || name.length > 128) {
      return "Policy name must be 1-128 characters.";
    }
    const validPattern = /^[a-zA-Z0-9-]+$/;
    if (!validPattern.test(name)) {
      return "Policy name can only contain a-z, A-Z, 0-9, and hyphens (-).";
    }
    return undefined;
  };
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Validate policy name
    const policyNameError = validatePolicyName(policyName);
    if (policyNameError) {
      newErrors.policyName = policyNameError;
      isValid = false;
    }

    // Validate resource type
    if (!resourceType) {
      newErrors.resourceType = "Resource type is required.";
      isValid = false;
    }

    // Validate actions
    if (actions.length === 0) {
      newErrors.actions = "At least one action must be selected.";
      isValid = false;
    }

    // Validate conditions
    if (conditions.length > 0) {
      const conditionErrors: {
        [key: number]: {
          userAttribute?: string;
          resourceAttribute?: string;
        };
      } = {};
      conditions.forEach((condition, index) => {
        const conditionError: {
          userAttribute?: string;
          resourceAttribute?: string;
        } = {};
        if (!condition.userAttribute || condition.userAttribute === "") {
          conditionError.userAttribute = "User attribute is required.";
          isValid = false;
        }
        if (
          !condition.resourceAttribute ||
          condition.resourceAttribute === ""
        ) {
          conditionError.resourceAttribute = "Resource attribute is required.";
          isValid = false;
        }
        if (conditionError.userAttribute || conditionError.resourceAttribute) {
          conditionErrors[index] = conditionError;
        }
      });
      if (Object.keys(conditionErrors).length > 0) {
        newErrors.conditions = conditionErrors;
      }
    }
    setErrors(newErrors);
    if (!isValid) {
      console.log("Validation errors:", newErrors);
    }
    return isValid;
  };
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (validateForm()) {
      console.log("Form submitted successfully:", {
        policyName,
        resourceType,
        actions,
        conditions,
      });
      // Handle successful form submission
    }
  };
  const attributeEditorDefinition: AttributeEditorProps.FieldDefinition<ConditionItem>[] =
    [
      {
        label: "User attribute",
        control: (item, itemIndex) => (
          <Select
            filteringType="auto"
            options={userAttributeOptions}
            placeholder="Choose user attribute"
            selectedOption={
              item.userAttribute
                ? userAttributeOptions.find(
                    (opt) => opt.value === item.userAttribute,
                  ) || null
                : null
            }
            onChange={({ detail }) => {
              const updatedConditions = [...conditions];
              updatedConditions[itemIndex] = {
                ...updatedConditions[itemIndex],
                userAttribute: detail.selectedOption.value || "",
              };
              setConditions(updatedConditions);
            }}
          />
        ),
        errorText: (item, itemIndex) => {
          return errors.conditions?.[itemIndex]?.userAttribute;
        },
      },
      {
        label: "Operator",
        control: (item, itemIndex) => (
          <Select
            options={operatorOptions}
            selectedOption={
              item.operator
                ? operatorOptions.find((opt) => opt.value === item.operator) ||
                  operatorOptions[0]
                : operatorOptions[0]
            }
            onChange={({ detail }) => {
              const updatedConditions = [...conditions];
              updatedConditions[itemIndex] = {
                ...updatedConditions[itemIndex],
                operator: detail.selectedOption.value || "eq",
              };
              setConditions(updatedConditions);
            }}
          />
        ),
      },
      {
        label: "Resource attribute",
        control: (item, itemIndex) => (
          <Select
            filteringType="auto"
            options={resourceAttributeOptions}
            placeholder="Choose resource attribute"
            selectedOption={
              item.resourceAttribute
                ? resourceAttributeOptions.find(
                    (opt) => opt.value === item.resourceAttribute,
                  ) || null
                : null
            }
            onChange={({ detail }) => {
              const updatedConditions = [...conditions];
              updatedConditions[itemIndex] = {
                ...updatedConditions[itemIndex],
                resourceAttribute: detail.selectedOption.value || "",
              };
              setConditions(updatedConditions);
            }}
          />
        ),
        errorText: (item, itemIndex) => {
          return errors.conditions?.[itemIndex]?.resourceAttribute;
        },
      },
    ];
  return (
    <AppLayoutToolbar
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            {
              href: "#",
              text: "Amazon Cognito",
            },
            {
              href: "#",
              text: "User pools",
            },
            {
              href: "#",
              text: "contracts-management-users",
            },
            {
              href: "#",
              text: "Groups",
            },
            {
              href: "#user-group-details",
              text: "team-project-rosie",
            },
            {
              href: "#add-auth-policy",
              text: "Add authorization policy",
            },
          ]}
        />
      }
      content={
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link">Cancel</Button>
              <Button variant="primary" onClick={handleSubmit}>
                Add authorization policy
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
            <Container
              header={
                <Header
                  description="Specify the name, resource type, and permitted actions for this authorization policy."
                  variant="h2"
                >
                  Policy details
                </Header>
              }
              data-venue="true"
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
                        setErrors({
                          ...errors,
                          policyName: undefined,
                        });
                      }
                    }}
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
                    onChange={({ detail }) => {
                      setResourceType(detail.selectedOption);
                      if (errors.resourceType) {
                        setErrors({
                          ...errors,
                          resourceType: undefined,
                        });
                      }
                    }}
                  />
                </FormField>

                <FormField
                  description="Select one or more actions that members of this group are permitted to perform on the selected resource type."
                  label="Actions"
                  errorText={errors.actions}
                >
                  <Multiselect
                    enableSelectAll
                    filteringType="auto"
                    options={actionsOptions}
                    placeholder="Choose actions"
                    selectedOptions={actions}
                    onChange={({ detail }) => {
                      setActions(detail.selectedOptions);
                      if (errors.actions) {
                        setErrors({
                          ...errors,
                          actions: undefined,
                        });
                      }
                    }}
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
              data-venue="true"
            >
              <AttributeEditor
                addButtonText="Add condition"
                definition={attributeEditorDefinition}
                empty="No conditions added. Add a condition to further restrict access based on user and resource attributes."
                items={conditions}
                removeButtonText="Remove"
                onAddButtonClick={() => {
                  setConditions([
                    ...conditions,
                    {
                      userAttribute: "",
                      operator: "eq",
                      resourceAttribute: "",
                    },
                  ]);
                }}
                onRemoveButtonClick={({ detail }) => {
                  const updatedConditions = conditions.filter(
                    (_, index) => index !== detail.itemIndex,
                  );
                  setConditions(updatedConditions);
                  // Clear errors for removed item
                  if (errors.conditions) {
                    const newConditionErrors = {
                      ...errors.conditions,
                    };
                    delete newConditionErrors[detail.itemIndex];
                    setErrors({
                      ...errors,
                      conditions: newConditionErrors,
                    });
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
          header={{
            href: "#",
            text: "Amazon Cognito",
          }}
          items={[
            {
              href: "#/overview",
              text: "Overview",
              type: "link",
            },
            {
              defaultExpanded: true,
              items: [
                {
                  href: "#/app-clients",
                  text: "App clients",
                  type: "link",
                },
              ],
              text: "Applications",
              type: "section",
            },
            {
              defaultExpanded: true,
              items: [
                {
                  href: "#/users",
                  text: "Users",
                  type: "link",
                },
                {
                  href: "#/groups",
                  text: "Groups",
                  type: "link",
                },
              ],
              text: "User management",
              type: "section",
            },
            {
              defaultExpanded: true,
              items: [
                {
                  href: "#/auth-methods",
                  text: "Authentication methods",
                  type: "link",
                },
                {
                  href: "#/sign-in",
                  text: "Sign-in",
                  type: "link",
                },
                {
                  href: "#/sign-up",
                  text: "Sign-up",
                  type: "link",
                },
                {
                  href: "#/social-providers",
                  text: "Social and external providers",
                  type: "link",
                },
                {
                  href: "#/extensions",
                  text: "Extensions",
                  type: "link",
                },
              ],
              text: "Authentication",
              type: "section",
            },
          ]}
        />
      }
    />
  );
}
export default AddAuthorizationPolicy;
