import { Routes, Route, Navigate } from 'react-router-dom';
import ListGroupsPage from './pages/ListGroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import AddPolicyPage from './pages/AddPolicyPage';
import EditPolicyPage from './pages/EditPolicyPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/groups" replace />} />
      <Route path="/groups" element={<ListGroupsPage />} />
      <Route path="/groups/:groupName" element={<GroupDetailPage />} />
      <Route path="/groups/:groupName/policies/add" element={<AddPolicyPage />} />
      <Route path="/groups/:groupName/policies/:policyId/edit" element={<EditPolicyPage />} />
    </Routes>
  );
}

export default App;
