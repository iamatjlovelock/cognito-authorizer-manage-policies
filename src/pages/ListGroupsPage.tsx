import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Table from '@cloudscape-design/components/table';
import Link from '@cloudscape-design/components/link';
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
import TextFilter from '@cloudscape-design/components/text-filter';
import Alert from '@cloudscape-design/components/alert';
import Header from '@cloudscape-design/components/header';
import Pagination from '@cloudscape-design/components/pagination';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import { fetchApi } from '../services/api-client';
import { clearSchemaCache } from '../services/schema-service';

interface GroupItem {
  groupName: string;
  description: string;
  precedence: string;
  createdTime: string;
  lastModifiedTime: string;
}

function formatRelativeTime(isoDate: string): string {
  if (!isoDate) return '-';

  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Less than an hour ago';
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

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
        <Button iconName="external" iconAlign="right" variant="normal">
          Go to Amazon Verified Permissions
        </Button>
      }
    >
      With Verified Permissions, you can create policies that authorize access
      to API Gateway with user pool groups.
    </Alert>
  );
}

function ListGroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<GroupItem[]>([]);
  const [filteringText, setFilteringText] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(1);

  useEffect(() => {
    // Clear schema cache so it's refreshed when navigating to group details
    clearSchemaCache();

    const loadGroups = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApi<{ groups: GroupItem[] }>('/groups');
        setGroups(response.groups);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load groups');
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  const handleGroupClick = (groupName: string) => {
    navigate(`/groups/${encodeURIComponent(groupName)}`);
  };

  const filteredItems = groups.filter((item) => {
    if (!filteringText) return true;
    const searchText = filteringText.toLowerCase();
    return (
      item.groupName.toLowerCase().includes(searchText) ||
      item.description.toLowerCase().includes(searchText)
    );
  });

  const columnDefinitions = [
    {
      id: 'groupName',
      header: 'Group name',
      cell: (item: GroupItem) => (
        <Link variant="primary" onFollow={() => handleGroupClick(item.groupName)}>
          {item.groupName}
        </Link>
      ),
      minWidth: 200,
    },
    {
      id: 'description',
      header: 'Description',
      cell: (item: GroupItem) => item.description || '-',
      minWidth: 240,
    },
    {
      id: 'precedence',
      header: 'Precedence',
      cell: (item: GroupItem) => item.precedence,
      minWidth: 140,
    },
    {
      id: 'createdTime',
      header: 'Created time',
      cell: (item: GroupItem) => formatRelativeTime(item.createdTime),
      minWidth: 200,
    },
  ];

  return (
    <AppLayout
      contentType="table"
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { href: '#', text: 'Amazon Cognito' },
            { href: '#', text: 'User pools' },
            { href: '#', text: 'contracts-management-users' },
            { href: '/groups', text: 'Groups' },
          ]}
          onFollow={(event) => {
            event.preventDefault();
            if (event.detail.href && event.detail.href !== '#') {
              navigate(event.detail.href);
            }
          }}
        />
      }
      navigation={
        <SideNavigation
          activeHref="#/groups"
          header={{ href: '#', text: 'Amazon Cognito' }}
          items={[
            { type: 'link', text: 'Overview', href: '#/overview' },
            {
              type: 'section',
              text: 'Applications',
              defaultExpanded: true,
              items: [{ type: 'link', text: 'App clients', href: '#/app-clients' }],
            },
            {
              type: 'section',
              text: 'User management',
              defaultExpanded: true,
              items: [
                { type: 'link', text: 'Users', href: '#/users' },
                { type: 'link', text: 'Groups', href: '/groups' },
              ],
            },
            {
              type: 'section',
              text: 'Authentication',
              defaultExpanded: true,
              items: [
                { type: 'link', text: 'Authentication methods', href: '#/auth-methods' },
                { type: 'link', text: 'Sign-in', href: '#/sign-in' },
                { type: 'link', text: 'Sign-up', href: '#/sign-up' },
                { type: 'link', text: 'Social and external providers', href: '#/social-providers' },
                { type: 'link', text: 'Extensions', href: '#/extensions' },
              ],
            },
          ]}
        />
      }
      content={
        <>
          {error && (
            <Alert type="error" header="Error loading groups">
              {error}
            </Alert>
          )}
          <Table
            trackBy="groupName"
            columnDefinitions={columnDefinitions}
            items={filteredItems}
            loading={loading}
            loadingText="Loading groups"
            selectionType="single"
            selectedItems={selectedItems}
            onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
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
                counter={loading ? '' : `(${filteredItems.length})`}
                description="Configure groups and add users. Groups can be used to add permissions to the access token for multiple users."
                info={<Link variant="info">Info</Link>}
                actions={
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      variant="icon"
                      iconName="refresh"
                      onClick={() => window.location.reload()}
                      disabled={loading}
                    />
                    <Button
                      variant="normal"
                      disabled={selectedItems.length === 0}
                    >
                      Delete
                    </Button>
                    <Button variant="primary">
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
                pagesCount={Math.max(1, Math.ceil(filteredItems.length / 10))}
                onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
              />
            }
            footer={<TableFooter />}
          />
        </>
      }
    />
  );
}

export default ListGroupsPage;
