import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Header from '@cloudscape-design/components/header';
import ButtonDropdown from '@cloudscape-design/components/button-dropdown';
import Link from '@cloudscape-design/components/link';
import Container from '@cloudscape-design/components/container';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Badge from '@cloudscape-design/components/badge';
import Table from '@cloudscape-design/components/table';
import TextFilter from '@cloudscape-design/components/text-filter';
import Button from '@cloudscape-design/components/button';
import Box from '@cloudscape-design/components/box';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Pagination from '@cloudscape-design/components/pagination';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import Alert from '@cloudscape-design/components/alert';
import Spinner from '@cloudscape-design/components/spinner';
import { fetchApi } from '../services/api-client';
import { usePoliciesForUser, useDirectPoliciesForUser, useUserPolicyMutations, UserPolicyWithGroup } from '../hooks/usePolicies';
import type { UXPolicy } from '../types/policy';

interface UserAttribute {
  attributeName: string;
  type: string;
  value: string;
  verified: boolean;
}

interface GroupMembership {
  groupName: string;
  description: string;
  groupCreatedTime: string;
}

interface UserDetails {
  username: string;
  userId: string;
  email: string;
  emailVerified: boolean;
  status: string;
  confirmationStatus: string;
  mfaEnabled: boolean;
  createdTime: string;
  lastModifiedTime: string;
  userAttributes: UserAttribute[];
  groups: GroupMembership[];
}

function formatDateTime(isoDate: string): string {
  if (!isoDate) return '-';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
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

function UserDetailPage() {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();

  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [attributesFilterText, setAttributesFilterText] = useState('');
  const [attributesCurrentPage, setAttributesCurrentPage] = useState(1);
  const attributesPageSize = 10;

  const [groupsFilterText, setGroupsFilterText] = useState('');
  const [groupsCurrentPage, setGroupsCurrentPage] = useState(1);
  const [selectedGroups, setSelectedGroups] = useState<GroupMembership[]>([]);

  const [policiesFilterText, setPoliciesFilterText] = useState('');
  const [policiesCurrentPage, setPoliciesCurrentPage] = useState(1);

  // User-specific policies state
  const [userPoliciesFilterText, setUserPoliciesFilterText] = useState('');
  const [userPoliciesCurrentPage, setUserPoliciesCurrentPage] = useState(1);
  const [selectedUserPolicies, setSelectedUserPolicies] = useState<UXPolicy[]>([]);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }

    const loadUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchApi<UserDetails>(`/users/${encodeURIComponent(username)}`);
        setUser(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [username]);

  const filteredAttributes = (user?.userAttributes || []).filter((attr) => {
    if (!attributesFilterText) return true;
    const filterTextLower = attributesFilterText.toLowerCase();
    return (
      attr.attributeName.toLowerCase().includes(filterTextLower) ||
      attr.value.toLowerCase().includes(filterTextLower) ||
      attr.type.toLowerCase().includes(filterTextLower)
    );
  });

  const paginatedAttributes = filteredAttributes.slice(
    (attributesCurrentPage - 1) * attributesPageSize,
    attributesCurrentPage * attributesPageSize
  );

  const filteredGroups = (user?.groups || []).filter((group) => {
    if (!groupsFilterText) return true;
    const filterTextLower = groupsFilterText.toLowerCase();
    return (
      group.groupName.toLowerCase().includes(filterTextLower) ||
      group.description.toLowerCase().includes(filterTextLower)
    );
  });

  // Fetch authorization policies for all groups the user belongs to
  const userGroupNames = (user?.groups || []).map(g => g.groupName);
  const { policies, loading: policiesLoading, error: policiesError, refetch: refetchPolicies } = usePoliciesForUser(userGroupNames);

  const filteredPolicies = policies.filter((policy) => {
    if (!policiesFilterText) return true;
    const filterTextLower = policiesFilterText.toLowerCase();
    return (
      policy.policyName.toLowerCase().includes(filterTextLower) ||
      policy.description.toLowerCase().includes(filterTextLower) ||
      policy.resourceType.toLowerCase().includes(filterTextLower) ||
      policy.groupName.toLowerCase().includes(filterTextLower)
    );
  });

  // Fetch user-specific policies (directly assigned to this user)
  const {
    policies: userPolicies,
    loading: userPoliciesLoading,
    error: userPoliciesError,
    refetch: refetchUserPolicies,
  } = useDirectPoliciesForUser(user?.userId);

  const { deletePolicy, deleting } = useUserPolicyMutations();

  const filteredUserPolicies = userPolicies.filter((policy) => {
    if (!userPoliciesFilterText) return true;
    const filterTextLower = userPoliciesFilterText.toLowerCase();
    return (
      policy.policyName.toLowerCase().includes(filterTextLower) ||
      policy.description.toLowerCase().includes(filterTextLower) ||
      policy.resourceType.toLowerCase().includes(filterTextLower)
    );
  });

  const handleGroupClick = (groupName: string) => {
    navigate(`/groups/${encodeURIComponent(groupName)}`);
  };

  const handleAddUserPolicy = () => {
    navigate(`/users/${encodeURIComponent(username || '')}/policies/add`);
  };

  const handleEditUserPolicy = (policy: UXPolicy) => {
    navigate(`/users/${encodeURIComponent(username || '')}/policies/${policy.policyId}/edit`);
  };

  const handleDeleteClick = () => {
    if (selectedUserPolicies.length > 0) {
      setPolicyToDelete({
        id: selectedUserPolicies[0].policyId || '',
        name: selectedUserPolicies[0].policyName,
      });
      setShowDeleteAlert(true);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteAlert(false);
    setPolicyToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (policyToDelete) {
      try {
        await deletePolicy(policyToDelete.id);
        setSelectedUserPolicies([]);
        refetchUserPolicies();
      } catch (err) {
        console.error('Failed to delete policy:', err);
      }
    }
    setShowDeleteAlert(false);
    setPolicyToDelete(null);
  };

  if (loading) {
    return (
      <AppLayout
        contentType="default"
        content={
          <Box textAlign="center" padding="xl">
            <Spinner size="large" /> Loading user details...
          </Box>
        }
      />
    );
  }

  return (
    <AppLayout
      contentType="default"
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { href: '#', text: 'Amazon Cognito' },
            { href: '#', text: 'User pools' },
            { href: '#', text: 'contracts-management-users' },
            { href: '/users', text: 'Users' },
            { href: '#', text: `User: ${user?.userId || username}` },
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
        <SpaceBetween size="l">
          {error && (
            <Alert type="error" header="Error loading user">
              {error}
            </Alert>
          )}

          <Header
            actions={
              <ButtonDropdown
                items={[
                  { id: 'confirm-user', text: 'Confirm user' },
                  { id: 'reset-password', text: 'Reset password' },
                  { id: 'enable-user', text: 'Enable user' },
                  { id: 'disable-user', text: 'Disable user' },
                  { id: 'delete-user', text: 'Delete user' },
                ]}
                variant="normal"
              >
                Actions
              </ButtonDropdown>
            }
            info={<Link variant="info">Info</Link>}
            variant="h1"
          >
            User: {user?.userId || username}
          </Header>

          <Container header={<Header variant="h2">User information</Header>}>
            <KeyValuePairs
              columns={3}
              items={[
                {
                  type: 'group',
                  items: [
                    {
                      label: 'User ID (Sub)',
                      value: user?.userId ? (
                        <CopyToClipboard
                          copyErrorText="User ID failed to copy"
                          copySuccessText="User ID copied"
                          textToCopy={user.userId}
                          variant="inline"
                        />
                      ) : (
                        '-'
                      ),
                    },
                    {
                      label: 'Alias attributes used to sign in',
                      value: 'Email',
                    },
                    {
                      label: 'MFA setting',
                      value: user?.mfaEnabled ? 'MFA active' : 'MFA inactive',
                    },
                    {
                      label: 'MFA methods',
                      value: '-',
                    },
                  ],
                },
                {
                  type: 'group',
                  items: [
                    {
                      label: 'Account status',
                      value: (
                        <StatusIndicator type={user?.status === 'Enabled' ? 'success' : 'stopped'}>
                          {user?.status || '-'}
                        </StatusIndicator>
                      ),
                    },
                    {
                      label: 'Confirmation status',
                      value: (
                        <Badge color={user?.confirmationStatus === 'Confirmed' ? 'green' : 'grey'}>
                          {user?.confirmationStatus || '-'}
                        </Badge>
                      ),
                    },
                  ],
                },
                {
                  type: 'group',
                  items: [
                    {
                      label: 'Created time',
                      value: formatDateTime(user?.createdTime || ''),
                    },
                    {
                      label: 'Last updated time',
                      value: formatDateTime(user?.lastModifiedTime || ''),
                    },
                  ],
                },
              ]}
            />
          </Container>

          <Table
            columnDefinitions={[
              {
                id: 'attributeName',
                header: 'Attribute name',
                cell: (item: UserAttribute) => item.attributeName,
                minWidth: 220,
              },
              {
                id: 'value',
                header: 'Value',
                cell: (item: UserAttribute) => (
                  <SpaceBetween alignItems="center" direction="horizontal" size="xs">
                    <Box variant="span">{item.value}</Box>
                    {item.verified && <Badge color="green">Verified</Badge>}
                  </SpaceBetween>
                ),
                minWidth: 280,
              },
              {
                id: 'type',
                header: 'Type',
                cell: (item: UserAttribute) => item.type,
                minWidth: 140,
              },
            ]}
            items={paginatedAttributes}
            trackBy="attributeName"
            resizableColumns
            variant="container"
            empty={
              <Box color="inherit" textAlign="center">
                <Box variant="strong">No attributes</Box>
                <Box variant="p" padding={{ bottom: 's' }}>
                  No attributes found for this user.
                </Box>
              </Box>
            }
            filter={
              <TextFilter
                filteringPlaceholder="Filter by property or value"
                filteringText={attributesFilterText}
                onChange={({ detail }) => {
                  setAttributesFilterText(detail.filteringText);
                  setAttributesCurrentPage(1);
                }}
                countText={`${filteredAttributes.length} ${filteredAttributes.length === 1 ? 'match' : 'matches'}`}
              />
            }
            header={
              <Header
                actions={<Button variant="normal">Edit</Button>}
                counter={`(${user?.userAttributes?.length || 0})`}
                description="View and edit this user's attributes."
                info={<Link variant="info">Info</Link>}
                variant="h2"
              >
                User attributes
              </Header>
            }
            pagination={
              <Pagination
                currentPageIndex={attributesCurrentPage}
                pagesCount={Math.max(1, Math.ceil(filteredAttributes.length / attributesPageSize))}
                onChange={({ detail }) => setAttributesCurrentPage(detail.currentPageIndex)}
              />
            }
          />

          <Table
            columnDefinitions={[
              {
                id: 'groupName',
                header: 'Group name',
                cell: (item: GroupMembership) => (
                  <Link variant="primary" onFollow={() => handleGroupClick(item.groupName)}>
                    {item.groupName}
                  </Link>
                ),
                minWidth: 240,
              },
              {
                id: 'description',
                header: 'Description',
                cell: (item: GroupMembership) => item.description,
                minWidth: 200,
              },
              {
                id: 'groupCreatedTime',
                header: 'Group created time',
                cell: (item: GroupMembership) => formatRelativeTime(item.groupCreatedTime),
                minWidth: 200,
              },
            ]}
            items={filteredGroups}
            trackBy="groupName"
            selectionType="single"
            selectedItems={selectedGroups}
            onSelectionChange={({ detail }) => setSelectedGroups(detail.selectedItems)}
            resizableColumns
            variant="container"
            empty={
              <Box color="inherit" textAlign="center">
                <Box variant="strong">No group memberships</Box>
                <Box variant="p" padding={{ bottom: 's' }}>
                  This user doesn't belong to any groups. Add the user to a group to get started.
                </Box>
                <Button variant="normal">Add user to group</Button>
              </Box>
            }
            filter={
              <TextFilter
                filteringPlaceholder="Filter groups by property or value"
                filteringText={groupsFilterText}
                onChange={({ detail }) => {
                  setGroupsFilterText(detail.filteringText);
                  setGroupsCurrentPage(1);
                }}
                countText={`${filteredGroups.length} ${filteredGroups.length === 1 ? 'match' : 'matches'}`}
              />
            }
            header={
              <Header
                actions={
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button variant="normal" disabled={selectedGroups.length === 0}>
                      Remove user from group
                    </Button>
                    <Button variant="primary">Add user to group</Button>
                  </SpaceBetween>
                }
                counter={`(${user?.groups?.length || 0})`}
                description="View and edit this user's group memberships."
                info={<Link variant="info">Info</Link>}
                variant="h2"
              >
                Group memberships
              </Header>
            }
            pagination={
              <Pagination
                currentPageIndex={groupsCurrentPage}
                pagesCount={Math.max(1, Math.ceil(filteredGroups.length / 10))}
                onChange={({ detail }) => setGroupsCurrentPage(detail.currentPageIndex)}
              />
            }
          />

          {policiesError && (
            <Alert type="error" header="Error loading policies">
              {policiesError}
            </Alert>
          )}

          <Table
            columnDefinitions={[
              {
                id: 'policyName',
                header: 'Policy name',
                cell: (item: UserPolicyWithGroup) => item.policyName,
                minWidth: 180,
              },
              {
                id: 'description',
                header: 'Description',
                cell: (item: UserPolicyWithGroup) => item.description || '-',
                minWidth: 200,
              },
              {
                id: 'resourceType',
                header: 'Resource type',
                cell: (item: UserPolicyWithGroup) => item.resourceType,
                minWidth: 140,
              },
              {
                id: 'actions',
                header: 'Actions',
                cell: (item: UserPolicyWithGroup) => item.actions.join(', '),
                minWidth: 180,
              },
              {
                id: 'groupName',
                header: 'From group',
                cell: (item: UserPolicyWithGroup) => (
                  <Link variant="primary" onFollow={() => handleGroupClick(item.groupName)}>
                    {item.groupName}
                  </Link>
                ),
                minWidth: 180,
              },
            ]}
            items={filteredPolicies}
            loading={policiesLoading}
            loadingText="Loading authorization policies"
            trackBy="policyId"
            resizableColumns
            variant="container"
            empty={
              <Box color="inherit" textAlign="center">
                <Box variant="strong">No authorization policies</Box>
                <Box variant="p" padding={{ bottom: 's' }}>
                  This user has no authorization policies. Policies are assigned through group memberships.
                </Box>
              </Box>
            }
            filter={
              <TextFilter
                filteringPlaceholder="Find authorization policies"
                filteringText={policiesFilterText}
                onChange={({ detail }) => {
                  setPoliciesFilterText(detail.filteringText);
                  setPoliciesCurrentPage(1);
                }}
                countText={`${filteredPolicies.length} ${filteredPolicies.length === 1 ? 'match' : 'matches'}`}
              />
            }
            header={
              <Header
                actions={
                  <Button variant="icon" iconName="refresh" onClick={refetchPolicies} disabled={policiesLoading} />
                }
                counter={`(${policies.length})`}
                description="Authorization policies inherited from group memberships. These policies cannot be edited directly - manage them from the group details page."
                info={<Link variant="info">Info</Link>}
                variant="h2"
              >
                Authorization policies (from groups)
              </Header>
            }
            pagination={
              <Pagination
                currentPageIndex={policiesCurrentPage}
                pagesCount={Math.max(1, Math.ceil(filteredPolicies.length / 10))}
                onChange={({ detail }) => setPoliciesCurrentPage(detail.currentPageIndex)}
              />
            }
          />

          {userPoliciesError && (
            <Alert type="error" header="Error loading user policies">
              {userPoliciesError}
            </Alert>
          )}

          <Table
            columnDefinitions={[
              {
                id: 'policyName',
                header: 'Policy name',
                cell: (item: UXPolicy) => item.policyName,
                minWidth: 180,
              },
              {
                id: 'description',
                header: 'Description',
                cell: (item: UXPolicy) => item.description || '-',
                minWidth: 220,
              },
              {
                id: 'resourceType',
                header: 'Resource type',
                cell: (item: UXPolicy) => item.resourceType,
                minWidth: 140,
              },
              {
                id: 'actions',
                header: 'Actions',
                cell: (item: UXPolicy) => item.actions.join(', '),
                minWidth: 200,
              },
            ]}
            items={filteredUserPolicies}
            loading={userPoliciesLoading}
            loadingText="Loading user-specific policies"
            selectionType="single"
            selectedItems={selectedUserPolicies}
            onSelectionChange={({ detail }) => setSelectedUserPolicies(detail.selectedItems)}
            trackBy="policyId"
            resizableColumns
            variant="container"
            empty={
              <Box color="inherit" textAlign="center">
                <SpaceBetween size="m">
                  <Box variant="p" color="inherit">
                    No user-specific authorization policies found. Add a policy to control what this
                    user can access independently of their group memberships.
                  </Box>
                  <Button variant="normal" iconName="add-plus" onClick={handleAddUserPolicy}>
                    Add authorization policy
                  </Button>
                </SpaceBetween>
              </Box>
            }
            filter={
              <TextFilter
                filteringPlaceholder="Find authorization policies"
                filteringText={userPoliciesFilterText}
                onChange={({ detail }) => {
                  setUserPoliciesFilterText(detail.filteringText);
                  setUserPoliciesCurrentPage(1);
                }}
                countText={`${filteredUserPolicies.length} ${filteredUserPolicies.length === 1 ? 'match' : 'matches'}`}
              />
            }
            header={
              <SpaceBetween size="s">
                <Header
                  counter={`(${userPolicies.length})`}
                  description="Authorization policies assigned directly to this user. These policies use the principal syntax: principal == Namespace::User::&quot;user-sub&quot;."
                  actions={
                    <SpaceBetween direction="horizontal" size="xs">
                      <Button variant="icon" iconName="refresh" onClick={refetchUserPolicies} disabled={userPoliciesLoading} />
                      <Button
                        variant="normal"
                        disabled={selectedUserPolicies.length === 0}
                        onClick={() => selectedUserPolicies[0] && handleEditUserPolicy(selectedUserPolicies[0])}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="normal"
                        disabled={selectedUserPolicies.length === 0 || deleting}
                        onClick={handleDeleteClick}
                      >
                        {deleting ? <Spinner /> : 'Delete'}
                      </Button>
                      <Button variant="normal" iconName="add-plus" onClick={handleAddUserPolicy}>
                        Add authorization policy
                      </Button>
                    </SpaceBetween>
                  }
                  variant="h2"
                >
                  User-specific authorization policies
                </Header>
                {showDeleteAlert && (
                  <Alert
                    type="warning"
                    header="Delete authorization policy?"
                    action={
                      <SpaceBetween direction="horizontal" size="xs">
                        <Button variant="normal" onClick={handleCancelDelete} disabled={deleting}>
                          Cancel
                        </Button>
                        <Button variant="primary" onClick={handleConfirmDelete} disabled={deleting}>
                          {deleting ? <Spinner /> : 'Delete'}
                        </Button>
                      </SpaceBetween>
                    }
                  >
                    Are you sure you want to delete the policy "{policyToDelete?.name}"? This
                    action cannot be undone.
                  </Alert>
                )}
              </SpaceBetween>
            }
            pagination={
              <Pagination
                currentPageIndex={userPoliciesCurrentPage}
                pagesCount={Math.max(1, Math.ceil(filteredUserPolicies.length / 10))}
                onChange={({ detail }) => setUserPoliciesCurrentPage(detail.currentPageIndex)}
              />
            }
          />
        </SpaceBetween>
      }
    />
  );
}

export default UserDetailPage;
