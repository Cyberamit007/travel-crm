import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AdminLayout from './components/layout/AdminLayout';
import EmployeeLayout from './components/layout/EmployeeLayout';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './components/dashboard/AdminDashboard';
import EmployeeDashboard from './components/dashboard/EmployeeDashboard';
import AdminLeadsPage from './pages/admin/LeadsPage';
import AdminCampaignsPage from './pages/admin/CampaignsPage';
import AdminEmployeesPage from './pages/admin/EmployeesPage';
import AdminSettingsPage from './pages/admin/SettingsPage';
import AdminFeedbackPage from './pages/admin/FeedbackPage';
import AdminLeavePage from './pages/admin/LeavePage';
import AdminActivityFeedPage from './pages/admin/ActivityFeedPage';
import AdminReportsPage from './pages/admin/ReportsPage';
import EmployeeLeadsPage from './pages/employee/LeadsPage';
import EmployeeFollowUpsPage from './pages/employee/FollowUpsPage';
import EmployeeSettingsPage from './pages/employee/SettingsPage';
import EmployeeLeavePage from './pages/employee/LeavePage';

function RoleRedirect() {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
}

function RequireAuth({ children, role }: { children: React.ReactNode; role?: 'ADMIN' | 'EMPLOYEE' }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RoleRedirect />} />

      <Route
        path="/admin"
        element={
          <RequireAuth role="ADMIN">
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="leads" element={<AdminLeadsPage />} />
        <Route path="campaigns" element={<AdminCampaignsPage />} />
        <Route path="employees" element={<AdminEmployeesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="feedback" element={<AdminFeedbackPage />} />
        <Route path="leaves" element={<AdminLeavePage />} />
        <Route path="activity" element={<AdminActivityFeedPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
      </Route>

      <Route
        path="/employee"
        element={
          <RequireAuth role="EMPLOYEE">
            <EmployeeLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/employee/dashboard" replace />} />
        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="leads" element={<EmployeeLeadsPage />} />
        <Route path="follow-ups" element={<EmployeeFollowUpsPage />} />
        <Route path="settings" element={<EmployeeSettingsPage />} />
        <Route path="leaves" element={<EmployeeLeavePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
