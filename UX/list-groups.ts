import React, { useState } from "react";
import AppLayoutToolbar from "@amzn/awsui-components-console/app-layout-toolbar";
import BreadcrumbGroup from "@amzn/awsui-components-console/breadcrumb-group";
import Table from "@amzn/awsui-components-console/table";
import Link from "@amzn/awsui-components-console/link";
import Box from "@amzn/awsui-components-console/box";
import SpaceBetween from "@amzn/awsui-components-console/space-between";
import Button from "@amzn/awsui-components-console/button";
import TextFilter from "@amzn/awsui-components-console/text-filter";
import Alert from "@amzn/awsui-components-console/alert";
import Header from "@amzn/awsui-components-console/header";
import Pagination from "@amzn/awsui-components-console/pagination";
import SideNavigation from "@amzn/awsui-components-console/side-navigation";
interface GroupItem {
  groupName: string;
  description: string;
  precedence: string;
  createdTime: string;
}
const BREADCRUMBS = [
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
    href: "#cognito-groups",
    text: "Groups",
  },
];
const COLUMN_DEFINITIONS = [
  {
    id: "groupName",
    header: "Group name",
    cell: (item: GroupItem) => (
      <Link href="#user-group-details" variant="primary">
        {item.groupName}
      </Link>
    ),
    minWidth: 200,
  },
  {
    id: "description",
    header: "Description",
    cell: (item: GroupItem) => item.description,
    minWidth: 240,
  },
  {
    id: "precedence",
    header: "Precedence",
    cell: (item: GroupItem) => item.precedence,
    minWidth: 140,
  },
  {
    id: "createdTime",
    header: "Created time",
    cell: (item: GroupItem) => item.createdTime,
    minWidth: 200,
  },
];
const INITIAL_GROUPS: GroupItem[] = [
  {
    groupName: "team-project-rosie",
    description:
      "Rosie is a UK based project to migrate the Bank of England's clearing system onto AWS",
    precedence: "-",
    createdTime: "7 hours ago",
  },
];
const NAVIGATION_ITEMS = [
  {
    type: "link" as const,
    text: "Overview",
    href: "#/overview",
  },
  {
    type: "section" as const,
    text: "Applications",
    defaultExpanded: true,
    items: [
      {
        type: "link" as const,
        text: "App clients",
        href: "#/app-clients",
      },
    ],
  },
  {
    type: "section" as const,
    text: "User management",
    defaultExpanded: true,
    items: [
      {
        type: "link" as const,
        text: "Users",
        href: "#/users",
      },
      {
        type: "link" as const,
        text: "Groups",
        href: "#/groups",
      },
    ],
  },
  {
    type: "section" as const,
    text: "Authentication",
    defaultExpanded: true,
    items: [
      {
        type: "link" as const,
        text: "Authentication methods",
        href: "#/auth-methods",
      },
      {
        type: "link" as const,
        text: "Sign-in",
        href: "#/sign-in",
      },
      {
        type: "link" as const,
        text: "Sign-up",
        href: "#/sign-up",
      },
      {
        type: "link" as const,
        text: "Social and external providers",
        href: "#/social-providers",
      },
      {
        type: "link" as const,
        text: "Extensions",
        href: "#/extensions",
      },
    ],
  },
];
function EmptyState() {
  return (
    <Box color="inherit" textAlign="center">
      <SpaceBetween size="m">
        <Box color="inherit" variant="p">
          No groups found. Create a group to add permissions to the access token
          for multiple users.
        </Box>
        <Button variant="normal">Create group</Button>
      </SpaceBetween>
    </Box>
  );
}
function TableFooter() {
  return (
    <Alert
      type="info"
      header="Set up group-based access control with Amazon Verified Permissions"
      action={
        <Button external variant="normal">
          Go to Amazon Verified Permissions
        </Button>
      }
    >
      With Verified Permissions, you can create policies that authorize access
      to API Gateway with user pool groups.
    </Alert>
  );
}
function CognitoGroupsPage() {
  const [selectedItems, setSelectedItems] = useState<GroupItem[]>([]);
  const [filteringText, setFilteringText] = useState("");
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const handleCreateGroup = () => {
    console.log("Create group clicked");
  };
  const handleDeleteGroup = () => {
    console.log("Delete group clicked", selectedItems);
  };
  const filteredItems = INITIAL_GROUPS.filter((item) => {
    if (!filteringText) return true;
    const searchText = filteringText.toLowerCase();
    return (
      item.groupName.toLowerCase().includes(searchText) ||
      item.description.toLowerCase().includes(searchText)
    );
  });
  return (
    <AppLayoutToolbar
      contentType="table"
      breadcrumbs={<BreadcrumbGroup items={BREADCRUMBS} />}
      navigation={
        <SideNavigation
          activeHref="#/groups"
          header={{
            href: "#",
            text: "Amazon Cognito",
          }}
          items={NAVIGATION_ITEMS}
        />
      }
      content={
        <Table
          trackBy="groupName"
          columnDefinitions={COLUMN_DEFINITIONS}
          items={filteredItems}
          selectionType="single"
          selectedItems={selectedItems}
          onSelectionChange={({ detail }) =>
            setSelectedItems(detail.selectedItems)
          }
          resizableColumns
          stickyHeader
          variant="full-page"
          empty={<EmptyState />}
          filter={
            <TextFilter
              filteringPlaceholder="Filter groups by name and description"
              filteringText={filteringText}
              onChange={({ detail }) => setFilteringText(detail.filteringText)}
            />
          }
          header={
            <Header
              variant="awsui-h1-sticky"
              counter={`(${filteredItems.length})`}
              description="Configure groups and add users. Groups can be used to add permissions to the access token for multiple users."
              info={<Link variant="info">Info</Link>}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    variant="normal"
                    disabled={selectedItems.length === 0}
                    disabledReason="Select a group to delete it"
                    onClick={handleDeleteGroup}
                  >
                    Delete
                  </Button>
                  <Button variant="primary" onClick={handleCreateGroup}>
                    Create group
                  </Button>
                </SpaceBetween>
              }
            >
              Groups
            </Header>
          }
          pagination={
            <Pagination
              currentPageIndex={currentPageIndex}
              pagesCount={1}
              onChange={({ detail }) =>
                setCurrentPageIndex(detail.currentPageIndex)
              }
            />
          }
          footer={<TableFooter />}
          data-venue="true"
        />
      }
    />
  );
}
export default CognitoGroupsPage;
