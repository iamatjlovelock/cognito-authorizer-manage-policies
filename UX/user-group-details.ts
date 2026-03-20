import React, { useState } from "react";
import AppLayoutToolbar from "@amzn/awsui-components-console/app-layout-toolbar";
import BreadcrumbGroup from "@amzn/awsui-components-console/breadcrumb-group";
import SpaceBetween from "@amzn/awsui-components-console/space-between";
import Header from "@amzn/awsui-components-console/header";
import Button from "@amzn/awsui-components-console/button";
import Container from "@amzn/awsui-components-console/container";
import KeyValuePairs from "@amzn/awsui-components-console/key-value-pairs";
import Table from "@amzn/awsui-components-console/table";
import Box from "@amzn/awsui-components-console/box";
import StatusIndicator from "@amzn/awsui-components-console/status-indicator";
import TextFilter from "@amzn/awsui-components-console/text-filter";
import Link from "@amzn/awsui-components-console/link";
import Pagination from "@amzn/awsui-components-console/pagination";
import SideNavigation from "@amzn/awsui-components-console/side-navigation";
import Alert from "@amzn/awsui-components-console/alert";
interface GroupMember {
  username: string;
  email: string;
  emailVerified: string;
  confirmationStatus: string;
  status: string;
}
interface AuthorizationPolicy {
  policyName: string;
  resourceType: string;
  actions: string;
}
interface GroupInformationProps {
  groupName: string;
  description: string;
  createdTime: string;
  lastUpdatedTime: string;
}
function GroupInformationContainer({
  groupName,
  description,
  createdTime,
  lastUpdatedTime,
}: GroupInformationProps) {
  return (
    <Container
      header={
        <Header actions={<Button variant="normal">Edit</Button>} variant="h2">
          Group information
        </Header>
      }
      data-venue="true"
    >
      <KeyValuePairs
        columns={3}
        items={[
          {
            type: "group",
            items: [
              {
                label: "Group name",
                value: groupName,
              },
              {
                label: "IAM role ARN",
                value: "-",
              },
            ],
          },
          {
            type: "group",
            items: [
              {
                label: "Description",
                value: description,
              },
              {
                label: "Precedence",
                value: "-",
              },
            ],
          },
          {
            type: "group",
            items: [
              {
                label: "Created time",
                value: createdTime,
              },
              {
                label: "Last updated time",
                value: lastUpdatedTime,
              },
            ],
          },
        ]}
      />
    </Container>
  );
}
interface GroupMembersTableProps {
  members: GroupMember[];
  selectedMembers: GroupMember[];
  onSelectionChange: (selectedItems: GroupMember[]) => void;
  filteringText: string;
  onFilteringChange: (text: string) => void;
}
function GroupMembersTable({
  members,
  selectedMembers,
  onSelectionChange,
  filteringText,
  onFilteringChange,
}: GroupMembersTableProps) {
  return (
    <Table
      columnDefinitions={[
        {
          id: "username",
          header: "User name",
          cell: (item) => item.username,
          minWidth: 180,
        },
        {
          id: "email",
          header: "Email address",
          cell: (item) => item.email,
          minWidth: 200,
        },
        {
          id: "emailVerified",
          header: "Email verified",
          cell: (item) => item.emailVerified,
          minWidth: 150,
        },
        {
          id: "confirmationStatus",
          header: "Confirmation status",
          cell: (item) => item.confirmationStatus,
          minWidth: 180,
        },
        {
          id: "status",
          header: "Status",
          cell: (item) => (
            <StatusIndicator type="success">{item.status}</StatusIndicator>
          ),
          minWidth: 130,
        },
      ]}
      items={members}
      loadingText="Loading users"
      selectionType="single"
      selectedItems={selectedMembers}
      onSelectionChange={({ detail }) =>
        onSelectionChange(detail.selectedItems)
      }
      trackBy="username"
      empty={
        <Box textAlign="center" color="inherit">
          <SpaceBetween size="m">
            <Box variant="p" color="inherit">
              No users found
            </Box>
            <Button variant="normal">Add user to group</Button>
          </SpaceBetween>
        </Box>
      }
      filter={
        <TextFilter
          filteringPlaceholder="Find users"
          filteringText={filteringText}
          onChange={({ detail }) => onFilteringChange(detail.filteringText)}
        />
      }
      header={
        <Header
          counter={`(${members.length})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="icon" iconName="refresh" />
              <Button
                variant="normal"
                disabled={selectedMembers.length === 0}
                disabledReason="Select a user to remove them from the group"
              >
                Remove user from group
              </Button>
              <Button variant="primary">Add user to group</Button>
            </SpaceBetween>
          }
          info={<Link variant="info">Info</Link>}
          variant="h2"
        >
          Group members
        </Header>
      }
      pagination={<Pagination currentPageIndex={1} pagesCount={1} />}
      variant="container"
      data-venue="true"
    />
  );
}
interface AuthorizationPoliciesTableProps {
  policies: AuthorizationPolicy[];
  selectedPolicies: AuthorizationPolicy[];
  onSelectionChange: (selectedItems: AuthorizationPolicy[]) => void;
  filteringText: string;
  onFilteringChange: (text: string) => void;
  showDeleteAlert: boolean;
  policyToDelete: string | null;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}
function AuthorizationPoliciesTable({
  policies,
  selectedPolicies,
  onSelectionChange,
  filteringText,
  onFilteringChange,
  showDeleteAlert,
  policyToDelete,
  onCancelDelete,
  onConfirmDelete,
}: AuthorizationPoliciesTableProps) {
  return (
    <Table
      columnDefinitions={[
        {
          id: "policyName",
          header: "Policy name",
          cell: (item) => item.policyName,
          minWidth: 200,
        },
        {
          id: "resourceType",
          header: "Resource type",
          cell: (item) => item.resourceType,
          minWidth: 160,
        },
        {
          id: "actions",
          header: "Actions",
          cell: (item) => item.actions,
          minWidth: 260,
        },
      ]}
      items={policies}
      loadingText="Loading authorization policies"
      selectionType="single"
      selectedItems={selectedPolicies}
      onSelectionChange={({ detail }) =>
        onSelectionChange(detail.selectedItems)
      }
      trackBy="policyName"
      empty={
        <Box textAlign="center" color="inherit">
          <SpaceBetween size="m">
            <Box variant="p" color="inherit">
              No authorization policies found. Add a policy to control what this
              group can access.
            </Box>
            <Button variant="normal" iconName="add-plus">
              Add authorization policy
            </Button>
          </SpaceBetween>
        </Box>
      }
      filter={
        <TextFilter
          filteringPlaceholder="Find authorization policies"
          filteringText={filteringText}
          onChange={({ detail }) => onFilteringChange(detail.filteringText)}
        />
      }
      header={
        <SpaceBetween size="s">
          <Header
            counter={`(${policies.length})`}
            description="Authorization policies control what actions members of this group can perform on specific resource types."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  variant="normal"
                  disabled={selectedPolicies.length === 0}
                  disabledReason="Select a policy to edit it"
                >
                  Edit
                </Button>
                <Button
                  variant="normal"
                  disabled={selectedPolicies.length === 0}
                  disabledReason="Select a policy to delete it"
                >
                  Delete
                </Button>
                <Button variant="normal" iconName="add-plus">
                  Add authorization policy
                </Button>
              </SpaceBetween>
            }
            variant="h2"
          >
            Authorization policies
          </Header>
          {showDeleteAlert && (
            <Alert
              type="warning"
              header="Delete authorization policy?"
              action={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="normal" onClick={onCancelDelete}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={onConfirmDelete}>
                    Delete
                  </Button>
                </SpaceBetween>
              }
            >
              Are you sure you want to delete the policy {policyToDelete}? This
              action can't be undone.
            </Alert>
          )}
        </SpaceBetween>
      }
      pagination={<Pagination currentPageIndex={1} pagesCount={1} />}
      variant="container"
      data-venue="true"
    />
  );
}
function GroupDetailPage() {
  // Group information state
  const groupName = "team-project-rosie";
  const groupDescription =
    "Rosie is a UK based project to migrate the Bank of England's clearing system onto AWS";
  const createdTime = "March 19, 2026 at 07:34 PDT";
  const lastUpdatedTime = "March 19, 2026 at 07:34 PDT";

  // Group members state
  const [groupMembers] = useState<GroupMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<GroupMember[]>([]);
  const [membersFilteringText, setMembersFilteringText] = useState("");

  // Authorization policies state
  const [authPolicies] = useState<AuthorizationPolicy[]>([
    {
      policyName: "read-contracts",
      resourceType: "Contract",
      actions: "Review, Approve",
    },
    {
      policyName: "write-contracts",
      resourceType: "Contract",
      actions: "Review, Approve, Edit, Archive",
    },
    {
      policyName: "read-users",
      resourceType: "User",
      actions: "Review",
    },
  ]);
  const [selectedPolicies, setSelectedPolicies] = useState<
    AuthorizationPolicy[]
  >([]);
  const [policiesFilteringText, setPoliciesFilteringText] = useState("");
  const [showDeleteAlert, setShowDeleteAlert] = useState(true);
  const [policyToDelete] = useState("read-contracts");
  const handleCancelDelete = () => {
    setShowDeleteAlert(false);
  };
  const handleConfirmDelete = () => {
    console.log(`Deleting policy: ${policyToDelete}`);
    setShowDeleteAlert(false);
  };
  return (
    <AppLayoutToolbar
      contentType="default"
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
              href: "#",
              text: groupName,
            },
          ]}
        />
      }
      navigation={
        <SideNavigation
          activeHref="#/groups"
          header={{
            href: "#",
            text: "Amazon Cognito",
          }}
          items={[
            {
              type: "link",
              text: "Overview",
              href: "#/overview",
            },
            {
              type: "section",
              text: "Applications",
              defaultExpanded: true,
              items: [
                {
                  type: "link",
                  text: "App clients",
                  href: "#/app-clients",
                },
              ],
            },
            {
              type: "section",
              text: "User management",
              defaultExpanded: true,
              items: [
                {
                  type: "link",
                  text: "Users",
                  href: "#/users",
                },
                {
                  type: "link",
                  text: "Groups",
                  href: "#/groups",
                },
              ],
            },
            {
              type: "section",
              text: "Authentication",
              defaultExpanded: true,
              items: [
                {
                  type: "link",
                  text: "Authentication methods",
                  href: "#/auth-methods",
                },
                {
                  type: "link",
                  text: "Sign-in",
                  href: "#/sign-in",
                },
                {
                  type: "link",
                  text: "Sign-up",
                  href: "#/sign-up",
                },
                {
                  type: "link",
                  text: "Social and external providers",
                  href: "#/social-providers",
                },
                {
                  type: "link",
                  text: "Extensions",
                  href: "#/extensions",
                },
              ],
            },
          ]}
        />
      }
      content={
        <SpaceBetween size="m">
          <Header
            variant="h1"
            actions={<Button variant="normal">Delete</Button>}
          >
            Group: {groupName}
          </Header>
          <SpaceBetween size="l">
            <GroupInformationContainer
              groupName={groupName}
              description={groupDescription}
              createdTime={createdTime}
              lastUpdatedTime={lastUpdatedTime}
            />
            <GroupMembersTable
              members={groupMembers}
              selectedMembers={selectedMembers}
              onSelectionChange={setSelectedMembers}
              filteringText={membersFilteringText}
              onFilteringChange={setMembersFilteringText}
            />
            <AuthorizationPoliciesTable
              policies={authPolicies}
              selectedPolicies={selectedPolicies}
              onSelectionChange={setSelectedPolicies}
              filteringText={policiesFilteringText}
              onFilteringChange={setPoliciesFilteringText}
              showDeleteAlert={showDeleteAlert}
              policyToDelete={policyToDelete}
              onCancelDelete={handleCancelDelete}
              onConfirmDelete={handleConfirmDelete}
            />
          </SpaceBetween>
        </SpaceBetween>
      }
    />
  );
}
export default GroupDetailPage;
