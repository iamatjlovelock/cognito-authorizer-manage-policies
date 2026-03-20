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
import AttributeEditor from "@amzn/awsui-components-console/attribute-editor";
import SideNavigation from "@amzn/awsui-components-console/side-navigation";
interface AttributeCondition {
  userAttribute: SelectProps.Option | null;
  operator: SelectProps.Option | null;
  resourceAttribute: SelectProps.Option | null;
}
interface FormErrors {
  policyName?: string;
  resourceType?: string;
  actions?: string;
}
function EditAuthorizationPolicyPage() {
  const [policyName, setPolicyName] = useState("read-contracts");
  const [resourceType, setResourceType] = useState<SelectProps.Option>({
    label: "Contract",
    value: "contract",
  });
  const [actions, setActions] = useState<MultiselectProps.Option[]>([
    {
      label: "Review",
      value: "review",
    },
    {
      label: "Approve",
      value: "approve",
    },
  ]);
  const [conditions, setConditions] = useState<AttributeCondition[]>([
    {
      userAttribute: {
        label: "Department",
        value: "department",
      },
      operator: {
        label: "= (equals)",
        value: "eq",
      },
      resourceAttribute: {
        label: "Owner department",
        value: "owner_department",
      },
    },
    {
      userAttribute: {
        label: "Clearance level",
        value: "clearance_level",
      },
      operator: {
        label: "= (equals)",
        value: "eq",
      },
      resourceAttribute: {
        label: "Required clearance",
        value: "required_clearance",
      },
    },
  ]);
  const [errors, setErrors] = useState<FormErrors>({});
  const userAttributeOptions: SelectProps.Option[] = [
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
  const operatorOptions: SelectProps.Option[] = [
    {
      label: "= (equals)",
      value: "eq",
    },
    {
      label: "!= (not equals)",
      value: "neq",
    },
  ];
  const resourceAttributeOptions: SelectProps.Option[] = [
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
  const resourceTypeOptions: SelectProps.Option[] = [
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
  const actionOptions: MultiselectProps.Option[] = [
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
  const validatePolicyName = (name: string): string | undefined => {
    if (!name || name.trim() === "") {
      return "Policy name is required.";
    }
    const validCharacters = /^[a-zA-Z0-9-]+$/;
    if (!validCharacters.test(name)) {
      return "Policy name can only contain a-z, A-Z, 0-9, and hyphens (-).";
    }
    if (name.length < 1 || name.length > 128) {
      return "Policy name must be 1-128 characters.";
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
      newErrors.resourceType = "Resource type is required.";
    }
    if (!actions || actions.length === 0) {
      newErrors.actions = "At least one action must be selected.";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      console.log("Form validation errors:", newErrors);
      return false;
    }
    return true;
  };
  const handleSave = () => {
    if (validateForm()) {
      console.log("Form is valid. Saving changes...");
      console.log("Policy name:", policyName);
      console.log("Resource type:", resourceType);
      console.log("Actions:", actions);
      console.log("Conditions:", conditions);
      // Add save logic here
    }
  };
  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        userAttribute: null,
        operator: {
          label: "= (equals)",
          value: "eq",
        },
        resourceAttribute: null,
      },
    ]);
  };
  const handleRemoveCondition = (itemIndex: number) => {
    setConditions(conditions.filter((_, index) => index !== itemIndex));
  };
  const updateCondition = (
    itemIndex: number,
    field: keyof AttributeCondition,
    value: SelectProps.Option | null,
  ) => {
    const updatedConditions = [...conditions];
    updatedConditions[itemIndex] = {
      ...updatedConditions[itemIndex],
      [field]: value,
    };
    setConditions(updatedConditions);
  };
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
              href: "#edit-auth-policy",
              text: "Edit authorization policy",
            },
          ]}
        />
      }
      content={
        <Form
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" href="#user-group-details">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave}>
                Save changes
              </Button>
            </SpaceBetween>
          }
          header={
            <Header
              description="Update the authorization policy to control what actions members of this group can perform on specific resource types."
              variant="h1"
            >
              Edit authorization policy
            </Header>
          }
        >
          <SpaceBetween size="l">
            <Container
              header={
                <Header
                  description="Update the name, resource type, and permitted actions for this authorization policy."
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
                    onChange={(event) => {
                      setPolicyName(event.detail.value);
                      if (errors.policyName) {
                        const error = validatePolicyName(event.detail.value);
                        setErrors({
                          ...errors,
                          policyName: error,
                        });
                      }
                    }}
                    onBlur={() => {
                      const error = validatePolicyName(policyName);
                      if (error) {
                        setErrors({
                          ...errors,
                          policyName: error,
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
                    selectedOption={resourceType}
                    onChange={(event) => {
                      setResourceType(event.detail.selectedOption);
                      if (errors.resourceType) {
                        setErrors({
                          ...errors,
                          resourceType: undefined,
                        });
                      }
                    }}
                    placeholder="Choose resource type"
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
                    options={actionOptions}
                    placeholder="Choose actions"
                    selectedOptions={actions}
                    onChange={(event) => {
                      setActions(event.detail.selectedOptions);
                      if (
                        errors.actions &&
                        event.detail.selectedOptions.length > 0
                      ) {
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
                onAddButtonClick={handleAddCondition}
                onRemoveButtonClick={(event) =>
                  handleRemoveCondition(event.detail.itemIndex)
                }
                items={conditions}
                removeButtonText="Remove"
                empty="No conditions added. Add a condition to further restrict access based on user and resource attributes."
                definition={[
                  {
                    label: "User attribute",
                    control: (item, itemIndex) => (
                      <Select
                        filteringType="auto"
                        options={userAttributeOptions}
                        placeholder="Choose user attribute"
                        selectedOption={item.userAttribute}
                        onChange={(event) => {
                          updateCondition(
                            itemIndex,
                            "userAttribute",
                            event.detail.selectedOption,
                          );
                        }}
                      />
                    ),
                  },
                  {
                    label: "Operator",
                    control: (item, itemIndex) => (
                      <Select
                        options={operatorOptions}
                        selectedOption={item.operator}
                        onChange={(event) => {
                          updateCondition(
                            itemIndex,
                            "operator",
                            event.detail.selectedOption,
                          );
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
                        selectedOption={item.resourceAttribute}
                        onChange={(event) => {
                          updateCondition(
                            itemIndex,
                            "resourceAttribute",
                            event.detail.selectedOption,
                          );
                        }}
                      />
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
export default EditAuthorizationPolicyPage;
