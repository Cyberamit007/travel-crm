import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AdminLayout from './components/layout/AdminLayout';
import EmployeeLayout from './components/layout/EmployeeLayout';
import OperationsLayout from './components/layout/OperationsLayout';
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
import AdminDashboard from './components/dashboard/AdminDashboard';
import EmployeeDashboard from './components/dashboard/EmployeeDashboard';
import AdminLeadsPage from './pages/admin/LeadsPage';
import AdminCampaignsPage from './pages/admin/CampaignsPage';
import OrganizationPage from './pages/admin/OrganizationPage';
import AdminSettingsPage from './pages/admin/SettingsPage';
import AdminFeedbackPage from './pages/admin/FeedbackPage';
import AdminActivityFeedPage from './pages/admin/ActivityFeedPage';
import AdminReportsPage from './pages/admin/ReportsPage';
import MastersPage from './pages/admin/MastersPage';
import PackagesPage from './pages/admin/PackagesPage';
import BookingsPage from './pages/admin/BookingsPage';
import CustomersPage from './pages/admin/CustomersPage';
import FinancePage from './pages/admin/FinancePage';
import EmployeeLeadsPage from './pages/employee/LeadsPage';
import EmployeeFollowUpsPage from './pages/employee/FollowUpsPage';
import EmployeeSettingsPage from './pages/employee/SettingsPage';
import PackageCatalogPage from './pages/employee/PackageCatalogPage';
import MyCustomersPage from './pages/employee/MyCustomersPage';
import TasksPage from './pages/employee/TasksPage';
import OperationsDashboardPage from './pages/operations/DashboardPage';
import DeparturesPage from './pages/operations/DeparturesPage';
import DepartureDetailPage from './pages/operations/DepartureDetailPage';
import VendorsPage from './pages/operations/VendorsPage';

function RoleRedirect() {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'OPERATIONS') return <Navigate to="/operations/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
}

function RequireAuth({ children, role }: { children: React.ReactNode; role?: 'ADMIN' | 'EMPLOYEE' | 'OPERATIONS' }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/Website" element={<WelcomePage />} />
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
        <Route path="employees" element={<Navigate to="/admin/organization" replace />} />
        <Route path="organization" element={<OrganizationPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="feedback" element={<AdminFeedbackPage />} />
        <Route path="activity" element={<AdminActivityFeedPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="masters" element={<MastersPage />} />
        <Route path="packages" element={<PackagesPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="operations" element={<Navigate to="/admin/operations/dashboard" replace />} />
        <Route path="operations/dashboard" element={<OperationsDashboardPage />} />
        <Route path="operations/departures" element={<DeparturesPage />} />
        <Route path="operations/departures/:id" element={<DepartureDetailPage />} />
        <Route path="operations/vendors" element={<VendorsPage />} />
      </Route>

      <Route
        path="/operations"
        element={
          <RequireAuth role="OPERATIONS">
            <OperationsLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/operations/dashboard" replace />} />
        <Route path="dashboard" element={<OperationsDashboardPage />} />
        <Route path="departures" element={<DeparturesPage />} />
        <Route path="departures/:id" element={<DepartureDetailPage />} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="settings" element={<EmployeeSettingsPage />} />
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
        <Route path="packages" element={<PackageCatalogPage />} />
        <Route path="customers" element={<MyCustomersPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="settings" element={<EmployeeSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
