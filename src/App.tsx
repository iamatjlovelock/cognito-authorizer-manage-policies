import { Routes, Route, Navigate } from 'react-router-dom';
import ListGroupsPage from './pages/ListGroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import AddPolicyPage from './pages/AddPolicyPage';
import EditPolicyPage from './pages/EditPolicyPage';
import ListUsersPage from './pages/ListUsersPage';
import UserDetailPage from './pages/UserDetailPage';
import AddUserPolicyPage from './pages/AddUserPolicyPage';
import EditUserPolicyPage from './pages/EditUserPolicyPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/groups" replace />} />
      <Route path="/groups" element={<ListGroupsPage />} />
      <Route path="/groups/:groupName" element={<GroupDetailPage />} />
      <Route path="/groups/:groupName/policies/add" element={<AddPolicyPage />} />
      <Route path="/groups/:groupName/policies/:policyId/edit" element={<EditPolicyPage />} />
      <Route path="/users" element={<ListUsersPage />} />
      <Route path="/users/:username" element={<UserDetailPage />} />
      <Route path="/users/:username/policies/add" element={<AddUserPolicyPage />} />
      <Route path="/users/:username/policies/:policyId/edit" element={<EditUserPolicyPage />} />
    </Routes>
  );
}

export default App;
