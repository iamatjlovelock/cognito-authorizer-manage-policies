import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Header from '@cloudscape-design/components/header';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import Table from '@cloudscape-design/components/table';
import Box from '@cloudscape-design/components/box';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import TextFilter from '@cloudscape-design/components/text-filter';
import Link from '@cloudscape-design/components/link';
import Pagination from '@cloudscape-design/components/pagination';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import Alert from '@cloudscape-design/components/alert';
import Spinner from '@cloudscape-design/components/spinner';
import { usePoliciesForGroup, usePolicyMutations } from '../hooks/usePolicies';
import type { UXPolicy } from '../types/policy';

interface GroupMember {
  username: string;
  email: string;
  emailVerified: string;
  confirmationStatus: string;
  status: string;
}

interface TablePolicy {
  policyId: string;
  policyName: string;
  description: string;
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
    >
      <KeyValuePairs
        columns={3}
        items={[
          {
            type: 'group',
            items: [
              { label: 'Group name', value: groupName },
              { label: 'IAM role ARN', value: '-' },
            ],
          },
          {
            type: 'group',
            items: [
              { label: 'Description', value: description },
              { label: 'Precedence', value: '-' },
            ],
          },
          {
            type: 'group',
            items: [
              { label: 'Created time', value: createdTime },
              { label: 'Last updated time', value: lastUpdatedTime },
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
          id: 'username',
          header: 'User name',
          cell: (item) => item.username,
          minWidth: 180,
        },
        {
          id: 'email',
          header: 'Email address',
          cell: (item) => item.email,
          minWidth: 200,
        },
        {
          id: 'emailVerified',
          header: 'Email verified',
          cell: (item) => item.emailVerified,
          minWidth: 150,
        },
        {
          id: 'confirmationStatus',
          header: 'Confirmation status',
          cell: (item) => item.confirmationStatus,
          minWidth: 180,
        },
        {
          id: 'status',
          header: 'Status',
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
      onSelectionChange={({ detail }) => onSelectionChange(detail.selectedItems)}
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
    />
  );
}

interface AuthorizationPoliciesTableProps {
  policies: TablePolicy[];
  selectedPolicies: TablePolicy[];
  onSelectionChange: (selectedItems: TablePolicy[]) => void;
  filteringText: string;
  onFilteringChange: (text: string) => void;
  showDeleteAlert: boolean;
  policyToDelete: string | null;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onEditPolicy: (policy: TablePolicy) => void;
  onAddPolicy: () => void;
  onDeleteClick: () => void;
  onRefresh: () => void;
  loading: boolean;
  deleting: boolean;
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
  onEditPolicy,
  onAddPolicy,
  onDeleteClick,
  onRefresh,
  loading,
  deleting,
}: AuthorizationPoliciesTableProps) {
  return (
    <Table
      columnDefinitions={[
        {
          id: 'policyName',
          header: 'Policy name',
          cell: (item) => item.policyName,
          minWidth: 180,
        },
        {
          id: 'description',
          header: 'Description',
          cell: (item) => item.description || '-',
          minWidth: 220,
        },
        {
          id: 'resourceType',
          header: 'Resource type',
          cell: (item) => item.resourceType,
          minWidth: 140,
        },
        {
          id: 'actions',
          header: 'Actions',
          cell: (item) => item.actions,
          minWidth: 200,
        },
      ]}
      items={policies}
      loading={loading}
      loadingText="Loading authorization policies"
      selectionType="single"
      selectedItems={selectedPolicies}
      onSelectionChange={({ detail }) => onSelectionChange(detail.selectedItems)}
      trackBy="policyId"
      empty={
        <Box textAlign="center" color="inherit">
          <SpaceBetween size="m">
            <Box variant="p" color="inherit">
              No authorization policies found. Add a policy to control what this
              group can access.
            </Box>
            <Button variant="normal" iconName="add-plus" onClick={onAddPolicy}>
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
                <Button variant="icon" iconName="refresh" onClick={onRefresh} disabled={loading} />
                <Button
                  variant="normal"
                  disabled={selectedPolicies.length === 0}
                  onClick={() => selectedPolicies[0] && onEditPolicy(selectedPolicies[0])}
                >
                  Edit
                </Button>
                <Button
                  variant="normal"
                  disabled={selectedPolicies.length === 0 || deleting}
                  onClick={onDeleteClick}
                >
                  {deleting ? <Spinner /> : 'Delete'}
                </Button>
                <Button variant="normal" iconName="add-plus" onClick={onAddPolicy}>
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
                  <Button variant="normal" onClick={onCancelDelete} disabled={deleting}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={onConfirmDelete} disabled={deleting}>
                    {deleting ? <Spinner /> : 'Delete'}
                  </Button>
                </SpaceBetween>
              }
            >
              Are you sure you want to delete the policy "{policyToDelete}"? This
              action cannot be undone.
            </Alert>
          )}
        </SpaceBetween>
      }
      pagination={<Pagination currentPageIndex={1} pagesCount={1} />}
      variant="container"
    />
  );
}

// Convert UXPolicy to table display format
function toTablePolicy(policy: UXPolicy): TablePolicy {
  return {
    policyId: policy.policyId || '',
    policyName: policy.policyName,
    description: policy.description,
    resourceType: policy.resourceType,
    actions: policy.actions.join(', '),
  };
}

function GroupDetailPage() {
  const navigate = useNavigate();
  const { groupName } = useParams<{ groupName: string }>();

  // Group information (mock data - would come from Cognito API)
  const groupDescription =
    'Rosie is a UK based project to migrate the Bank of England clearing system onto AWS';
  const createdTime = 'March 19, 2026 at 07:34 PDT';
  const lastUpdatedTime = 'March 19, 2026 at 07:34 PDT';

  // Group members state (mock - would come from Cognito API)
  const [groupMembers] = useState<GroupMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<GroupMember[]>([]);
  const [membersFilteringText, setMembersFilteringText] = useState('');

  // Authorization policies from AVP
  const { policies, loading, error, refetch } = usePoliciesForGroup(groupName || '');
  const { deletePolicy, deleting } = usePolicyMutations();

  const tablePolicies = policies.map(toTablePolicy);
  const [selectedPolicies, setSelectedPolicies] = useState<TablePolicy[]>([]);
  const [policiesFilteringText, setPoliciesFilteringText] = useState('');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleCancelDelete = () => {
    setShowDeleteAlert(false);
    setPolicyToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (policyToDelete) {
      try {
        await deletePolicy(policyToDelete.id);
        setSelectedPolicies([]);
        refetch();
      } catch (err) {
        console.error('Failed to delete policy:', err);
      }
    }
    setShowDeleteAlert(false);
    setPolicyToDelete(null);
  };

  const handleDeleteClick = () => {
    if (selectedPolicies.length > 0) {
      setPolicyToDelete({
        id: selectedPolicies[0].policyId,
        name: selectedPolicies[0].policyName,
      });
      setShowDeleteAlert(true);
    }
  };

  const handleEditPolicy = (policy: TablePolicy) => {
    navigate(`/groups/${groupName}/policies/${policy.policyId}/edit`);
  };

  const handleAddPolicy = () => {
    navigate(`/groups/${groupName}/policies/add`);
  };

  return (
    <AppLayout
      contentType="default"
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { href: '#', text: 'Amazon Cognito' },
            { href: '#', text: 'User pools' },
            { href: '#', text: 'contracts-management-users' },
            { href: '/groups', text: 'Groups' },
            { href: '#', text: groupName || '' },
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
                { type: 'link', text: 'Groups', href: '#/groups' },
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
        <SpaceBetween size="m">
          <Header variant="h1" actions={<Button variant="normal">Delete</Button>}>
            Group: {groupName}
          </Header>
          {error && (
            <Alert type="error" header="Error loading policies">
              {error}
            </Alert>
          )}
          <SpaceBetween size="l">
            <GroupInformationContainer
              groupName={groupName || ''}
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
              policies={tablePolicies}
              selectedPolicies={selectedPolicies}
              onSelectionChange={setSelectedPolicies}
              filteringText={policiesFilteringText}
              onFilteringChange={setPoliciesFilteringText}
              showDeleteAlert={showDeleteAlert}
              policyToDelete={policyToDelete?.name || null}
              onCancelDelete={handleCancelDelete}
              onConfirmDelete={handleConfirmDelete}
              onEditPolicy={handleEditPolicy}
              onAddPolicy={handleAddPolicy}
              onDeleteClick={handleDeleteClick}
              onRefresh={refetch}
              loading={loading}
              deleting={deleting}
            />
          </SpaceBetween>
        </SpaceBetween>
      }
    />
  );
}

export default GroupDetailPage;
