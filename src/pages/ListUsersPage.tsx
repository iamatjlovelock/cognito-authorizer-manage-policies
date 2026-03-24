import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Table from '@cloudscape-design/components/table';
import Link from '@cloudscape-design/components/link';
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Button from '@cloudscape-design/components/button';
import Badge from '@cloudscape-design/components/badge';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Select from '@cloudscape-design/components/select';
import Input from '@cloudscape-design/components/input';
import Header from '@cloudscape-design/components/header';
import Pagination from '@cloudscape-design/components/pagination';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import Alert from '@cloudscape-design/components/alert';
import { fetchApi } from '../services/api-client';

interface UserItem {
  username: string;
  email: string;
  emailVerified: string;
  confirmationStatus: string;
  status: string;
  createdTime: string;
  lastModifiedTime: string;
}

function EmptyState() {
  return (
    <Box color="inherit" textAlign="center">
      <SpaceBetween size="m">
        <Box color="inherit" variant="p">
          No users found. Create a user to get started.
        </Box>
        <Button variant="normal">Create user</Button>
      </SpaceBetween>
    </Box>
  );
}

function ListUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<UserItem[]>([]);
  const [searchProperty, setSearchProperty] = useState({
    label: 'User name',
    value: 'username',
  });
  const [searchValue, setSearchValue] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApi<{ users: UserItem[] }>('/users');
        setUsers(response.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleUserClick = (username: string) => {
    navigate(`/users/${encodeURIComponent(username)}`);
  };

  const filteredItems = users.filter((item) => {
    if (!searchValue) return true;
    const searchText = searchValue.toLowerCase();
    switch (searchProperty.value) {
      case 'username':
        return item.username.toLowerCase().includes(searchText);
      case 'email':
        return item.email.toLowerCase().includes(searchText);
      case 'status':
        return item.status.toLowerCase().includes(searchText);
      case 'confirmationStatus':
        return item.confirmationStatus.toLowerCase().includes(searchText);
      default:
        return true;
    }
  });

  const paginatedItems = filteredItems.slice(
    (currentPageIndex - 1) * pageSize,
    currentPageIndex * pageSize
  );

  const columnDefinitions = [
    {
      id: 'username',
      header: 'User name',
      cell: (item: UserItem) => (
        <Link variant="primary" onFollow={() => handleUserClick(item.username)}>
          {item.username}
        </Link>
      ),
      minWidth: 240,
    },
    {
      id: 'email',
      header: 'Email address',
      cell: (item: UserItem) => item.email || '-',
      minWidth: 200,
    },
    {
      id: 'emailVerified',
      header: 'Email verified',
      cell: (item: UserItem) => item.emailVerified,
      minWidth: 140,
    },
    {
      id: 'confirmationStatus',
      header: 'Confirmation status',
      cell: (item: UserItem) => (
        <Badge color={item.confirmationStatus === 'Confirmed' ? 'green' : 'grey'}>
          {item.confirmationStatus}
        </Badge>
      ),
      minWidth: 180,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (item: UserItem) => (
        <StatusIndicator type={item.status === 'Enabled' ? 'success' : 'stopped'}>
          {item.status}
        </StatusIndicator>
      ),
      minWidth: 140,
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
            { href: '/users', text: 'Users' },
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
          activeHref="/users"
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
                { type: 'link', text: 'Users', href: '/users' },
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
          onFollow={(event) => {
            if (!event.detail.external && event.detail.href.startsWith('/')) {
              event.preventDefault();
              navigate(event.detail.href);
            }
          }}
        />
      }
      content={
        <>
          {error && (
            <Alert type="error" header="Error loading users">
              {error}
            </Alert>
          )}
          <Table
            trackBy="username"
            columnDefinitions={columnDefinitions}
            items={paginatedItems}
            loading={loading}
            loadingText="Loading users"
            selectionType="single"
            selectedItems={selectedItems}
            onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
            resizableColumns
            stickyHeader
            variant="full-page"
            empty={<EmptyState />}
            filter={
              <SpaceBetween alignItems="center" direction="horizontal" size="xs">
                <Select
                  options={[
                    { label: 'User name', value: 'username' },
                    { label: 'Email address', value: 'email' },
                    { label: 'Account status', value: 'status' },
                    { label: 'Confirmation status', value: 'confirmationStatus' },
                  ]}
                  selectedOption={searchProperty}
                  onChange={({ detail }) =>
                    setSearchProperty(detail.selectedOption as { label: string; value: string })
                  }
                />
                <Input
                  placeholder="Search users by attribute"
                  type="search"
                  value={searchValue}
                  onChange={({ detail }) => {
                    setSearchValue(detail.value);
                    setCurrentPageIndex(1);
                  }}
                />
              </SpaceBetween>
            }
            header={
              <Header
                variant="awsui-h1-sticky"
                counter={loading ? '' : `(${filteredItems.length})`}
                description="View, edit, and create users in your user pool. Users that are enabled and confirmed can sign in to your user pool."
                info={<Link variant="info">Info</Link>}
                actions={
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      variant="icon"
                      iconName="refresh"
                      onClick={() => window.location.reload()}
                      disabled={loading}
                    />
                    <Button variant="normal" disabled={selectedItems.length === 0}>
                      Delete user
                    </Button>
                    <Button variant="primary">Create user</Button>
                  </SpaceBetween>
                }
              >
                Users
              </Header>
            }
            pagination={
              <Pagination
                currentPageIndex={currentPageIndex}
                pagesCount={Math.max(1, Math.ceil(filteredItems.length / pageSize))}
                onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
              />
            }
          />
        </>
      }
    />
  );
}

export default ListUsersPage;
